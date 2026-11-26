// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fetchGenerationProgress } from '../../../shared/api/generation-progress-api';
import type { GenerationProgress, GenerationProgressStage } from '../../../shared/types/generation-progress';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectWorkspace } from './ProjectWorkspace';
import type { Project } from '../types';

const data = vi.hoisted(() => ({
  analysis: vi.fn(), rules: vi.fn(), plans: vi.fn(), cases: vi.fn(), units: vi.fn(), coverage: vi.fn(), run: vi.fn(), traceability: vi.fn(),
}));
vi.mock('../hooks/useProjects', () => ({ useAnalysis: data.analysis }));
vi.mock('../../business-rules/hooks/useBusinessRules', () => ({ useBusinessRules: data.rules }));
vi.mock('../../test-plans/hooks/useTestPlans', () => ({ useTestPlans: data.plans }));
vi.mock('../../test-cases/hooks/useTestCases', () => ({ useTestCases: data.cases }));
vi.mock('../../unit-tests/hooks/useUnitTests', () => ({ useUnitTests: data.units }));
vi.mock('../../coverage/hooks/useCoverage', () => ({ useCoverageReport: data.coverage, useSandboxRun: data.run }));

vi.mock('../../traceability/hooks/useTraceability', () => ({ useTraceability: data.traceability }));
vi.mock('../../../shared/api/generation-progress-api', () => ({ fetchGenerationProgress: vi.fn() }));
const aiStages: GenerationProgressStage[] = ['BUSINESS_RULE', 'TEST_PLAN', 'TEST_CASE', 'UNIT_TEST'];
let client: QueryClient;
function progress(stage: GenerationProgressStage, status: GenerationProgress['status'] = 'IDLE', busy = false): GenerationProgress {
  return { stage, status, busy, percent: 0, completedSteps: 0, totalSteps: 0, steps: [], logs: [] };
}
const project: Project = { id: 7, name: 'registration', status: 'BR_APPROVED', sourceType: 'ZIP', sourceUrl: null, sourceAvailable: true, createdAt: '', ownerUserId: 1 };
function show(status: Project['status'] = 'BR_APPROVED', reachedStatus?: Project['status']) {
  render(<QueryClientProvider client={client}><MemoryRouter><ProjectWorkspace project={{ ...project, status }} active="test-plans" status={status} reachedStatus={reachedStatus}
    servicePath="billing" titlePrefix="Test Plan" subtitle="Plan description" backTo="/projects/7" backLabel="Analysis" showSourceUpdate={false}>
    <p>Panel content</p>
  </ProjectWorkspace></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  aiStages.forEach((stage) => client.setQueryData(['generation-progress', 7, stage], progress(stage)));
  vi.mocked(fetchGenerationProgress).mockImplementation(async (_id, stage) => progress(stage));
  Object.values(data).forEach((hook) => hook.mockReturnValue({ data: undefined }));
  data.run.mockReturnValue({ state: undefined });
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('ProjectWorkspace', () => {
  it('marks the active step and preserves scoped routes, breadcrumb and content', () => {
    show();
    const nav = screen.getByRole('navigation', { name: 'Các bước của dự án' });
    expect(within(nav).getByRole('link', { name: /02 Test Plan/ })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: /01 Phân tích/ })).toHaveAttribute('href', '/projects/7/business-rules?servicePath=billing');
    expect(screen.getByRole('heading', { level: 1, name: 'Test Plan' })).toBeVisible();
    expect(screen.getByText('registration')).toHaveClass('font-mono');
    expect(screen.getByText('Panel content')).toBeVisible();
    const progress = within(screen.getByRole('region', { name: 'Tiến độ quy trình' }));
    expect(progress.getByRole('link', { name: /Test Plan/ })).toHaveAttribute('href', '/projects/7/test-plans?servicePath=billing');
    expect(progress.getByRole('link', { name: /Test Plan/ })).toHaveAttribute('aria-current', 'page');
    expect(progress.getByRole('link', { name: /Test Plan/ })).toHaveClass('bg-neutral-primary-soft', 'border-b-brand-strong');
  });

  it('renders locked steps as text with the existing explanation', () => {
    show('ANALYZED');
    const nav = screen.getByRole('navigation', { name: 'Các bước của dự án' });
    expect(within(nav).queryByRole('link', { name: /Test Plan/ })).not.toBeInTheDocument();
    expect(within(nav).getByText('Test Plan').closest('[aria-disabled]')).toHaveAttribute('title', 'Duyệt Business Rule trước khi sang Test Plan');
    const progress = within(screen.getByRole('region', { name: 'Tiến độ quy trình' }));
    expect(progress.getAllByRole('link')).toHaveLength(1);
    for (const label of ['Test Plan', 'Test Case', 'Unit Test', 'Coverage']) {
      expect(progress.queryByRole('link', { name: new RegExp(label) })).not.toBeInTheDocument();
      expect(progress.getByText(label).closest('[aria-disabled]')).toHaveAttribute('title');
    }
  });

  it('keeps previously reached steps open during review', () => {
    show('BR_PENDING_REVIEW', 'TEST_GENERATED');
    expect(screen.getByRole('link', { name: /04 Unit Test/ })).toHaveAttribute('href', '/projects/7/unit-tests?servicePath=billing');
    expect(within(screen.getByRole('region', { name: 'Tiến độ quy trình' })).getByRole('link', { name: /Unit Test/ }))
      .toHaveAttribute('href', '/projects/7/unit-tests?servicePath=billing');
  });

  it('links the whole progress cell to each scoped workflow route', () => {
    show('COMPLETED');
    const progress = within(screen.getByRole('region', { name: 'Tiến độ quy trình' }));
    const routes = [
      ['Phân tích & BR', '/projects/7/business-rules'],
      ['Test Plan', '/projects/7/test-plans'], ['Test Case', '/projects/7/test-cases'],
      ['Unit Test', '/projects/7/unit-tests'], ['Coverage', '/projects/7/coverage'],
      ['Truy vết', '/projects/7/traceability'], ['Báo cáo', '/projects/7/report'],
    ];
    expect(progress.getAllByRole('link')).toHaveLength(7);
    for (const [label, route] of routes) {
      const link = progress.getByRole('link', { name: new RegExp(label) });
      expect(link).toHaveAttribute('href', `${route}?servicePath=billing`);
      expect(link).toHaveClass('p-2.5', 'hover:bg-neutral-secondary-soft');
      expect(link.querySelector('.group-hover\\:text-fg-brand-strong')).toBeInTheDocument();
    }
  });

  it('omits missing figures and keeps a real empty list count', () => {
    data.plans.mockReturnValue({ data: [] });
    show();
    const progress = screen.getByRole('region', { name: 'Tiến độ quy trình' });
    expect(within(progress).getAllByText(/^\d+(%|\/\d+)?$/)).toHaveLength(1);
    expect(within(progress).getByText('0')).toBeVisible();
    expect(within(progress).queryByText(/—|-/)).not.toBeInTheDocument();
  });

  it('keeps the project pass count without a compile warning for assertion failures', () => {
    data.analysis.mockReturnValue({ data: { totalClasses: 17, totalMethods: 42 } });
    data.rules.mockReturnValue({ data: [{ status: 'APPROVED' }, { status: 'PENDING_REVIEW' }] });
    data.units.mockReturnValue({ data: [{ id: 1 }] });
    data.coverage.mockReturnValue({ data: { lineCoverage: 65.4, branchCoverage: 69.6 } });
    data.run.mockReturnValue({ state: { status: 'TESTS_FAILED', tests: 9, failed: 2 } });
    show('TEST_GENERATED');
    const progress = screen.getByRole('region', { name: 'Tiến độ quy trình' });
    expect(within(progress).getByText('2')).toBeVisible();
    expect(within(progress).getByText('17 lớp, 42 method, 1 đã duyệt')).toBeVisible();
    expect(within(progress).getByText('65.4%')).toBeVisible();
    expect(within(progress).getByText(/7\/9 đạt khi chạy thật/)).toBeVisible();
    expect(within(progress).queryByText('Test lỗi')).not.toBeInTheDocument();
    expect(data.rules).toHaveBeenCalledWith(7, 'billing');
  });

  it.each([true, false])('shows the warning for a FAILED run only when compilationError is %s', (compilationError) => {
    data.run.mockReturnValue({ state: { status: 'FAILED', tests: 0, failed: 0, compilationError } });
    show('TEST_GENERATED');
    const warning = within(screen.getByRole('region', { name: 'Tiến độ quy trình' })).queryByText('Test lỗi');
    if (compilationError) expect(warning).toHaveAttribute('title', 'Lỗi biên dịch');
    else expect(warning).not.toBeInTheDocument();
  });
  it('shows only a completion icon at the right of completed sidebar steps, without metric counts', () => {
    data.rules.mockReturnValue({ data: Array(13).fill({ status: 'APPROVED' }) });
    data.plans.mockReturnValue({ data: Array(21).fill({}) });
    data.coverage.mockReturnValue({ data: { lineCoverage: 65 } });
    show('COMPLETED');
    const nav = screen.getByRole('navigation', { name: 'Các bước của dự án' });
    for (const [index, link] of within(nav).getAllByRole('link').entries()) {
      expect(link.children).toHaveLength(3);
      expect(link.children[0]).toHaveTextContent(String(index + 1).padStart(2, '0'));
      expect(link.lastElementChild).toHaveClass('lucide-check', 'text-fg-success-strong');
      expect(link.querySelectorAll('svg')).toHaveLength(1);
    }
    expect(within(nav).queryByText(/^(13|21|65%)$/)).not.toBeInTheDocument();
  });

  it.each(['QUEUED', 'RUNNING', 'PAUSED'] as const)('shows a single accessible spinner for %s generation, ahead of the completion icon', (status) => {
    aiStages.forEach((stage) => client.setQueryData(['generation-progress', 7, stage], progress(stage, status, true)));
    data.run.mockReturnValue({ state: { status: 'RUNNING' } });
    show('COMPLETED');
    const nav = screen.getByRole('navigation', { name: 'Các bước của dự án' });
    expect(within(nav).getAllByRole('img', { name: 'Đang sinh' })).toHaveLength(5);
    for (const link of within(nav).getAllByRole('link').slice(0, 5)) {
      expect(link.querySelectorAll('svg')).toHaveLength(1);
      expect(link.lastElementChild).toHaveClass('animate-spin', 'text-fg-brand');
    }
  });

  it('leaves unfinished idle or paused non-busy steps without a right-side icon', () => {
    aiStages.forEach((stage) => client.setQueryData(['generation-progress', 7, stage], progress(stage, 'PAUSED', false)));
    show('UPLOADED');
    const nav = screen.getByRole('navigation', { name: 'Các bước của dự án' });
    expect(nav.querySelector('svg')).not.toBeInTheDocument();
  });

  it.each(['QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'IDLE', 'FAILED', 'PARTIAL'] as const)('polls at 3000ms only for active queued/running queries (%s)', async (status) => {
    vi.useFakeTimers();
    aiStages.forEach((stage) => client.setQueryData(['generation-progress', 7, stage], progress(stage, status, true)));
    vi.mocked(fetchGenerationProgress).mockImplementation(async (_id, stage) => progress(stage, status, true));
    show();
    await act(async () => { await vi.advanceTimersByTimeAsync(2999); });
    expect(fetchGenerationProgress).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    if (status === 'QUEUED' || status === 'RUNNING') {
      expect(fetchGenerationProgress).toHaveBeenCalledTimes(4);
      for (const stage of aiStages) expect(fetchGenerationProgress).toHaveBeenCalledWith(7, stage);
    } else expect(fetchGenerationProgress).not.toHaveBeenCalled();
  });

  it('deduplicates rules covered to Unit Test and hides a zero uncovered hint', () => {
    data.rules.mockReturnValue({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    data.traceability.mockReturnValue({ data: { rows: [
      { ruleId: 1, unitTestId: 10 }, { ruleId: 1, unitTestId: 11 },
      { ruleId: 2, unitTestId: 12 }, { ruleId: 3, unitTestId: null },
    ], uncoveredRules: [{ ruleId: 3 }] } });
    show('TEST_GENERATED');
    const region = screen.getByRole('region', { name: 'Tiến độ quy trình' });
    expect(within(region).getByText('2/3')).toBeVisible();
    expect(within(region).getByText('1 rule chưa phủ')).toBeVisible();
    expect(data.traceability).toHaveBeenCalledWith(7, 'billing');
    cleanup();
    data.traceability.mockReturnValue({ data: { rows: [], uncoveredRules: [] } });
    show('COMPLETED');
    expect(screen.queryByText(/rule chưa phủ/)).not.toBeInTheDocument();
    expect(screen.getByText('Sẵn sàng')).toBeVisible();
  });

  it('does not request traceability or show report readiness while locked', () => {
    show('ANALYZED');
    expect(data.traceability).toHaveBeenCalledWith(0, 'billing');
    const region = screen.getByRole('region', { name: 'Tiến độ quy trình' });
    expect(region.firstElementChild?.children).toHaveLength(7);
    expect(region.firstElementChild).toHaveClass('xl:grid-cols-[repeat(7,minmax(0,1fr))]', 'min-w-0');
    expect(within(region).queryByText('Sẵn sàng')).not.toBeInTheDocument();
    for (const label of ['Truy vết', 'Báo cáo']) {
      expect(within(region).getByText(label).closest('[aria-disabled]')).toBeInTheDocument();
    }
  });

  it('keeps step status on one line with the complete accessible description', () => {
    show('BR_APPROVED');
    const region = screen.getByRole('region', { name: 'Tiến độ quy trình' });
    for (const [shortLabel, fullLabel] of [['Hoàn tất', 'Hoàn thành'], ['Đang chạy', 'Đang thực hiện'], ['Chưa chạy', 'Chưa thực hiện']]) {
      const statuses = within(region).getAllByText(shortLabel);
      for (const status of statuses) {
        expect(status).toHaveClass('whitespace-nowrap');
        expect(status).toHaveAttribute('aria-label', fullLabel);
        expect(status).toHaveAttribute('title', fullLabel);
      }
    }
  });
});
