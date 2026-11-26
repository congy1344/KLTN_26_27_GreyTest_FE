// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

  it('shows the pass rate of the latest server run', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });
    sandboxState = { status: 'TESTS_FAILED', message: 'x', tests: 8, failed: 2, logTail: '' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.getByText('Test đạt')).toBeInTheDocument();
    expect(screen.getByText('6/8 test đạt, 2 không đạt')).toBeInTheDocument();
  });

  it('shows up to 20 failures from the latest run with optional Test Case codes', () => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });
    sandboxState = {
      status: 'TESTS_FAILED', tests: 54, failed: 22,
      failures: Array.from({ length: 22 }, (_, index) => ({
        className: 'demo.OrderTest', methodName: `checks${index}`,
        testCaseCode: index === 0 ? 'TC-001' : null,
        message: 'expected: <100> but was: <90>',
      })),
    };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(20);
    expect(within(rows[0]).getByText('demo.OrderTest#checks0')).toBeVisible();
    expect(within(rows[0]).getByText('TC-001')).toBeVisible();
    expect(within(rows[1]).getByText('expected: <100> but was: <90>')).toBeVisible();
    expect(within(rows[1]).queryByText('TC-001')).not.toBeInTheDocument();
    expect(screen.getByText('Hiển thị 20/22 test không đạt')).toBeVisible();
  });

  it('falls back to the test counts saved with the report after a backend restart', () => {
    mockUseCoverageReport.mockReturnValue({ data: { ...report, testsRun: 62, testsFailed: 0 }, isLoading: false, isError: false });
    sandboxState = { status: 'IDLE', message: '', tests: 0, failed: 0, logTail: '' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.getByText('62/62 test đạt, 0 không đạt')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Test không đạt ở lượt chạy gần nhất' })).not.toBeInTheDocument();
    sandboxState = undefined;
  });

  it('hides the previous-round delta on the first measured round', () => {
    mockUseCoverageReport.mockReturnValue({ data: { ...report, round: 1 }, isLoading: false, isError: false });
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.queryByText(/so với vòng trước/)).not.toBeInTheDocument();
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

  it('renders gaps as a table without a server run section', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });
    sandboxState = { status: 'SUCCEEDED', message: 'ok', tests: 1, failed: 0, logTail: '' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.queryByRole('region', { name: 'Kết quả chạy test trên server' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'JaCoCo XML' })).toBeVisible();
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

  it('blocks another refinement while the server is running the tests', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });
    sandboxState = { status: 'RUNNING', message: 'x', tests: 0, failed: 0, logTail: '' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Đang chạy test trên server...' })).toBeDisabled();
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

  it('does not show the server run log on the coverage page', () => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });
    sandboxState = { status: 'FAILED', message: 'Source của project không biên dịch được', tests: 0, failed: 0, logTail: '[INFO] Building' };
    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);
    expect(screen.queryByText('[INFO] Building')).not.toBeInTheDocument();
    expect(screen.queryByText('Thất bại')).not.toBeInTheDocument();
    sandboxState = undefined;
  });

});
