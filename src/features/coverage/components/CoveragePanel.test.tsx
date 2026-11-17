// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoveragePanel } from './CoveragePanel';
import type { CoverageReport } from '../types';
import { LanguageProvider } from '../../../shared/i18n/language';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';

const mockUseCoverageReport = vi.fn();
const mockMutate = vi.fn();
const mockRefine = vi.fn();
const mockSandboxStart = vi.fn();
let sandboxState: unknown;

vi.mock('../hooks/useCoverage', () => ({
  useCoverageReport: (projectId: number) => mockUseCoverageReport(projectId),
  useUploadCoverage: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null, reset: vi.fn() }),
  useStartCoverageRefinement: () => ({ mutate: mockRefine, isPending: false, isError: false, error: null }),
  useSandboxRun: () => ({ state: sandboxState, start: { mutate: mockSandboxStart, isPending: false, isError: false, error: null } }),
}));

afterEach(() => {
  cleanup();
  sandboxState = undefined;
  localStorage.removeItem('greytest.language');
  vi.clearAllMocks();
});

const report: CoverageReport = {
  id: 1,
  projectId: 7,
  round: 2,
  lineCoverage: 80,
  branchCoverage: 75,
  requirementCoverage: 92,
  previousLineCoverage: 70,
  previousBranchCoverage: 75,
  previousRequirementCoverage: 90,
  totalLines: 100,
  coveredLines: 80,
  totalBranches: 20,
  coveredBranches: 15,
  uploadedAt: '2026-07-26T10:00:00',
  serviceCoverage: null,
  gaps: [
    {
      methodId: 5,
      className: 'OrderService',
      methodName: 'createOrder',
      lineCoverage: 40,
      branchCoverage: 50,
      missedLines: [12, 15],
      missedBranches: [12],
      risk: 'HIGH',
      suggestion: 'Bổ sung test case cho các nhánh điều kiện chưa cover (dòng 12)',
      refinable: true,
    },
  ],
};

describe('CoveragePanel', () => {
  it('updates risk and refinement tags with the system language', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });
    render(<LanguageProvider><LanguageToggle /><MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter></LanguageProvider>);
    expect(screen.getByText('Cao')).toBeVisible();
    expect(screen.getByText('Service, Có thể bổ sung')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText('High')).toBeVisible();
    expect(screen.getByText('Service, Refinable')).toBeVisible();
    expect(screen.queryByText('Cao')).not.toBeInTheDocument();
  });

  it('shows an empty state when no report exists yet', () => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.queryByText('JaCoCo Branch Coverage')).not.toBeInTheDocument();
    expect(screen.getByText(/Upload jacoco.xml để phân tích coverage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
  });

  it('renders metrics and gaps from the backend report', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.getByText('JaCoCo Branch Coverage')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('OrderService.createOrder')).toBeInTheDocument();
    expect(screen.getByText(/Bổ sung test case/)).toBeInTheDocument();
    expect(screen.getByText('Cao')).toBeInTheDocument();
    // Hiển thị vòng upload và tiến bộ so với vòng trước
    expect(screen.getByText('Vòng 2')).toBeInTheDocument();
    expect(screen.getByText('+10% so với vòng trước')).toBeInTheDocument();
  });

  it('shows Service coverage beside the module-wide numbers', () => {
    mockUseCoverageReport.mockReturnValue({
      data: {
        ...report,
        serviceCoverage: { totalLines: 15, coveredLines: 12, totalBranches: 6, coveredBranches: 4, lineCoverage: 88.5, branchCoverage: 66.67 },
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.getByText('88.5%')).toBeInTheDocument();
    expect(screen.getByText('12/15 dòng')).toBeInTheDocument();
    expect(screen.getByText('66.67%')).toBeInTheDocument();
    expect(screen.getByText('4/6 nhánh')).toBeInTheDocument();
    // Số toàn module vẫn giữ nguyên
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('omits the branch metric when the Service has no branch percentage', () => {
    mockUseCoverageReport.mockReturnValue({
      data: {
        ...report,
        serviceCoverage: { totalLines: 12, coveredLines: 12, totalBranches: 0, coveredBranches: 0, lineCoverage: 100, branchCoverage: null },
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.queryByText('Service Branch Coverage')).not.toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
  });

  it('leaves Service metrics empty when the report has no Service coverage', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.queryByText('Service Line Coverage')).not.toBeInTheDocument();
    expect(screen.queryByText('Service Branch Coverage')).not.toBeInTheDocument();
  });

  it('places compact manual upload after the server section and renders gaps as a table', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    const server = screen.getByRole('region', { name: 'Chạy test trên server' });
    const upload = screen.getByRole('heading', { name: 'JaCoCo XML' });
    expect(server.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Nhánh thiếu' })).toBeVisible();
    expect(screen.getByText('OrderService.createOrder').closest('tr')).toHaveTextContent('12, 15');
  });

  it('continues to Traceability after coverage has been analyzed', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });

    render(
      <MemoryRouter initialEntries={['/projects/7/coverage']}>
        <Routes>
          <Route path="/projects/:projectId/coverage" element={<CoveragePanel projectId={7} />} />
          <Route path="/projects/:projectId/traceability" element={<div>Traceability destination</div>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục đến Traceability/ }));

    expect(screen.getByText('Traceability destination')).toBeInTheDocument();
  });

  it('uploads the selected file through the mutation', () => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    const file = new File(['<report/>'], 'jacoco.xml', { type: 'text/xml' });
    const input = screen.getByLabelText(/Chọn JaCoCo XML/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(input.value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: /Upload/ }));

    expect(mockMutate).toHaveBeenCalledWith(file, expect.anything());

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Upload/ }));
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it('starts automatic refinement instead of opening the manual case form', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Sinh Test Case bổ sung/i }));

    expect(mockRefine).toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /Sinh Test Case bổ sung/i })).not.toBeInTheDocument();
  });

  it('requires a fresh JaCoCo upload before another refinement', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} projectStatus="TEST_GENERATED" /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /Upload JaCoCo vòng mới trước/i })).toBeDisabled();
  });

  it('keeps out-of-scope gaps visible but does not start a refinement round', () => {
    mockUseCoverageReport.mockReturnValue({
      data: {
        ...report,
        gaps: [{
          ...report.gaps[0],
          className: 'UserController',
          methodName: 'getById',
          suggestion: 'Ngoài phạm vi sinh Service Unit Test của GreyTest',
          refinable: false,
        }],
      },
      isLoading: false,
      isError: false,
    });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.queryByText('UserController.getById')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ngoài phạm vi sinh Service Unit Test/)).not.toBeInTheDocument();
    expect(screen.queryByText('Không thể bổ sung')).not.toBeInTheDocument();
    expect(screen.getByText('Không có coverage gap cần bổ sung')).toBeVisible();
    expect(mockRefine).not.toHaveBeenCalled();
  });

  it('starts a server sandbox run and shows its result and log', () => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });
    sandboxState = { status: 'TESTS_FAILED', message: 'Đã chạy 3 test: 2 đạt, 1 không đạt.', tests: 3, failed: 1, logTail: 'Tests run: 3, Failures: 1' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Chạy test' }));

    expect(mockSandboxStart).toHaveBeenLastCalledWith(false);
    // Nút thứ hai bật bước AI sửa test không đạt.
    fireEvent.click(screen.getByRole('button', { name: 'Chạy và để AI sửa test lỗi' }));
    expect(mockSandboxStart).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Đã chạy 3 test: 2 đạt, 1 không đạt.')).toBeVisible();
    expect(screen.getByText('Tests run: 3, Failures: 1')).toBeVisible();
    sandboxState = undefined;
  });
  it.each([
    ['RUNNING', 'Đang chạy'], ['SUCCEEDED', 'Thành công'], ['TESTS_FAILED', 'Có test lỗi'], ['FAILED', 'Thất bại'],
  ])('renders the %s server status from the run hook', (status, label) => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });
    sandboxState = { status, message: 'Server status', tests: 4, failed: 0, logTail: '' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.getByText(label)).toBeVisible();
    if (status === 'RUNNING') expect(screen.getByRole('button', { name: 'Chạy và để AI sửa test lỗi' })).toBeDisabled();
  });

});
