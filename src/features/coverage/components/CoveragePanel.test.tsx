// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoveragePanel } from './CoveragePanel';
import type { CoverageReport } from '../types';

const mockUseCoverageReport = vi.fn();
const mockMutate = vi.fn();
const mockRefine = vi.fn();

vi.mock('../hooks/useCoverage', () => ({
  useCoverageReport: (projectId: number) => mockUseCoverageReport(projectId),
  useUploadCoverage: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null, reset: vi.fn() }),
  useStartCoverageRefinement: () => ({ mutate: mockRefine, isPending: false, isError: false, error: null }),
}));

afterEach(() => {
  cleanup();
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
  it('shows an empty state when no report exists yet', () => {
    mockUseCoverageReport.mockReturnValue({ data: null, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.getByText(/Upload jacoco.xml để phân tích coverage/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload/ })).toBeDisabled();
  });

  it('renders metrics and gaps from the backend report', () => {
    mockUseCoverageReport.mockReturnValue({ data: report, isLoading: false, isError: false });

    render(<MemoryRouter><CoveragePanel projectId={7} /></MemoryRouter>);

    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('OrderService.createOrder')).toBeInTheDocument();
    expect(screen.getByText(/Bổ sung test case/)).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    // Hiển thị vòng upload và tiến bộ so với vòng trước
    expect(screen.getByText('Vòng 2')).toBeInTheDocument();
    expect(screen.getByText('+10% so với vòng trước')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu vòng 3/i }));

    expect(mockRefine).toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /Bắt đầu vòng 3/i })).not.toBeInTheDocument();
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

    expect(screen.getByText('UserController.getById')).toBeInTheDocument();
    expect(screen.getByText(/Ngoài phạm vi sinh Service Unit Test/)).toBeInTheDocument();
    expect(screen.getByText('Không thể bổ sung')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Không có Service gap/i })).toBeDisabled();
    expect(mockRefine).not.toHaveBeenCalled();
  });
});
