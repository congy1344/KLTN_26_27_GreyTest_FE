// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReportPanel } from './ReportPanel';

const mockUseReportExport = vi.fn();

vi.mock('../hooks/useReport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useReport')>()),
  useReportExport: (projectId: number, format: string) => mockUseReportExport(projectId, format),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const jsonBody = JSON.stringify({
  projectName: 'Demo',
  requirementCoverage: 92,
  lineCoverage: 80,
  branchCoverage: 75,
  totalUnitTests: 12,
  traceability: [{}, {}, {}],
  coverageGaps: [],
  uncoveredRuleCodes: [],
});

function stubExports(markdown = '# GreyTest Report — Demo') {
  mockUseReportExport.mockImplementation((_projectId: number, format: string) => ({
    data: format === 'json' ? jsonBody : markdown,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }));
}

describe('ReportPanel', () => {
  it('previews backend markdown by default and switches to JSON', () => {
    stubExports();

    render(<ReportPanel projectId={7} />);

    expect(screen.getByLabelText(/Report preview/i)).toHaveDisplayValue(/# GreyTest Report/);
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    const formatGroup = screen.getByRole('group', { name: /Report format/i });
    fireEvent.click(within(formatGroup).getByRole('button', { name: /JSON/i }));

    expect(within(formatGroup).getByRole('button', { name: /JSON/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/Report preview/i)).toHaveDisplayValue(/"requirementCoverage":92/);
  });

  it('downloads the active report format with the project-scoped filename', () => {
    stubExports();
    const createObjectURL = vi.fn(() => 'blob:report');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    const anchor = document.createElement('a');
    anchor.click = click;
    const originalCreateElement = document.createElement.bind(document);
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => (
      tagName === 'a' ? anchor : originalCreateElement(tagName, options)
    )) as typeof document.createElement);

    render(<ReportPanel projectId={7} />);

    const formatGroup = screen.getByRole('group', { name: /Report format/i });
    fireEvent.click(within(formatGroup).getByRole('button', { name: /JSON/i }));
    fireEvent.click(screen.getByRole('button', { name: /Download JSON/i }));

    expect(anchor.download).toBe('greytest-report-7.json');
    expect(anchor.href).toContain('blob:report');
    expect(click).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
