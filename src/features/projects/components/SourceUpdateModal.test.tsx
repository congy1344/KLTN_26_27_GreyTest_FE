// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SourceUpdateModal } from './SourceUpdateModal';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const render = (ui: React.ReactElement, options?: Parameters<typeof rtlRender>[1]) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper, ...options });
};

const mocks = vi.hoisted(() => ({
  createZip: vi.fn(),
  createGithub: vi.fn(),
  fetchProject: vi.fn(),
  fetch: vi.fn(),
  analyze: vi.fn(),
  generate: vi.fn(),
  generateAll: vi.fn(),
  patch: vi.fn(),
  apply: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('../api/source-update-api', () => ({
  SOURCE_UPDATE_TIMEOUT_MS: 120_000,
  createZipSourceUpdate: mocks.createZip,
  createGithubSourceUpdate: mocks.createGithub,
  fetchProjectSourceUpdates: mocks.fetchProject,
  fetchSourceUpdate: mocks.fetch,
  analyzeSourceUpdate: mocks.analyze,
  generateIncrementalSourceUpdate: mocks.generate,
  generateAllSourceUpdate: mocks.generateAll,
  patchSourceUpdateItem: mocks.patch,
  applySourceUpdate: mocks.apply,
  cancelSourceUpdate: mocks.cancel,
}));

const project = {
  id: 7,
  name: 'hospital-management-demo',
  sourceType: 'ZIP' as const,
  sourceUrl: null,
  status: 'ANALYZED' as const,
  createdAt: '',
  ownerUserId: 1,
  sourceAvailable: true,
};

describe('SourceUpdateModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.fetchProject.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('restores completed stages from server checkpoints when reopened', async () => {
    mocks.fetchProject.mockResolvedValue([{ id: 11, items: [], status: 'ANALYZED', impactSummary: null,
      generationSummary: { stages: { BUSINESS_RULE: { state: 'SUCCEEDED', completed: true } }, conflicts: [], readyForApply: false } }]);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.getByRole('button', { name: '✓ Đã sinh BR' })).toBeEnabled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('does not promise Apply readiness after accepting items if UT is still incomplete', async () => {
    const draft = { id: 11, status: 'READY_TO_APPLY', impactSummary: null,
      items: [{ id: 1, targetType: 'UNIT_TEST', action: 'CREATE', reviewStatus: 'PENDING', afterData: '{}' }],
      generationSummary: { stages: { UNIT_TEST: { state: 'SUCCEEDED', completed: false } }, conflicts: [], readyForApply: false } };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.patch.mockResolvedValue({});
    mocks.fetch.mockResolvedValue({ ...draft, items: [{ ...draft.items[0], reviewStatus: 'ACCEPTED' }] });
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận tất cả đề xuất' }));
    await act(async () => undefined);
    expect(screen.queryByText(/Toàn bộ đã sẵn sàng để áp dụng/)).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa áp dụng vào project/)).toBeVisible();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('reopens a failed partial draft so its completed output and conflicts can be resumed', async () => {
    mocks.fetchProject.mockResolvedValue([{ id: 11, items: [], status: 'FAILED', impactSummary: '{}',
      generationSummary: { stages: { BUSINESS_RULE: { state: 'SUCCEEDED', completed: true } }, conflicts: [], readyForApply: false } }]);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.getByRole('button', { name: '✓ Đã sinh BR' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Sinh Tất Cả' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Áp Dụng Cập Nhật/ })).toBeDisabled();
  });

  it('keeps Apply disabled while proposals still need review', async () => {
    mocks.fetchProject.mockResolvedValue([{ id: 11, status: 'READY_TO_APPLY', impactSummary: null,
      items: [{ id: 1, targetType: 'TEST_CASE', action: 'UPDATE', reviewStatus: 'PENDING', afterData: '{}' }],
      generationSummary: { stages: {}, conflicts: [], readyForApply: false } }]);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.getByRole('button', { name: /Áp Dụng Cập Nhật/ })).toBeDisabled();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('applies only reviewed server-ready drafts without generating or accepting items', async () => {
    mocks.fetchProject.mockResolvedValue([{ id: 11, status: 'READY_TO_APPLY', impactSummary: null,
      items: [{ id: 1, targetType: 'TEST_CASE', action: 'UPDATE', reviewStatus: 'ACCEPTED', afterData: '{}' }],
      generationSummary: { stages: {}, conflicts: [], readyForApply: true } }]);
    mocks.apply.mockResolvedValue({ id: 11, status: 'APPLIED' });
    const applied = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={applied} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: /Áp Dụng Cập Nhật/ }));
    await act(async () => undefined);
    expect(applied).toHaveBeenCalledOnce();
    expect(mocks.apply).toHaveBeenCalledOnce();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.generateAll).not.toHaveBeenCalled();
  });

  it('sends the reviewed version with an explicit conflict choice', async () => {
    const draft = { id: 11, status: 'ANALYZED', impactSummary: null,
      items: [{ id: 1, targetType: 'BUSINESS_RULE', action: 'UPDATE', reviewStatus: 'MODIFIED', afterData: 'my content', version: 3, userRevision: 2 }],
      generationSummary: { stages: {}, readyForApply: false, conflicts: [
        { stage: 'BUSINESS_RULE', targetKey: '10', itemId: 1, proposedAfterData: 'AI proposal', proposedAction: 'UPDATE' },
      ] } };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.patch.mockResolvedValue(draft.items[0]);
    mocks.fetch.mockResolvedValue({ ...draft, generationSummary: { ...draft.generationSummary, conflicts: [] } });
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.getByText('AI proposal')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Giữ bản của tôi' }));
    await act(async () => undefined);
    expect(mocks.patch).toHaveBeenCalledWith(7, 11, 1, {
      expectedVersion: 3, expectedUserRevision: 2, conflictStage: 'BUSINESS_RULE', conflictTargetKey: '10', resolution: 'KEEP_USER',
    }, expect.anything());
    expect(screen.queryByRole('region', { name: 'Xung đột cần giải quyết' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Áp Dụng Cập Nhật/ })).toBeDisabled();
  });

  it('polls an existing server run and never starts a duplicate generation', async () => {
    const draft = { id: 11, status: 'ANALYZED', impactSummary: null, items: [],
      generationSummary: { stages: {}, conflicts: [], readyForApply: false, running: true } };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.fetch.mockResolvedValue({ ...draft, generationSummary: { ...draft.generationSummary, running: false,
      stages: { BUSINESS_RULE: { state: 'SUCCEEDED', completed: true } } } });
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.getByRole('button', { name: 'Sinh Tất Cả' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Hủy bản nháp' })).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.getByRole('button', { name: '✓ Đã sinh BR' })).toBeEnabled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.generateAll).not.toHaveBeenCalled();
  });

  it('shows applied update history above upload controls with added, modified and deleted items', async () => {
    const applied = (id: number) => ({
      id, projectId: 7, status: 'APPLIED', totalChangedMethods: 1, createdAt: '2026-10-23T09:00:00Z',
      updatedAt: '2026-10-23T10:00:00Z', impactSummary: JSON.stringify({ changedMethods: [{
        diffType: 'DELETED', methodKey: 'demo.PatientService#countActivePatients()', servicePath: 'backend/patient-service',
      }] }),
      items: [
        { id: 1, targetType: 'METHOD', targetKey: 'demo.PatientService#countActivePatients()', action: 'REMOVE', reviewStatus: 'ACCEPTED', reason: 'Method đã xóa', beforeData: 'public long countActivePatients() { return 1; }' },
        { id: 2, targetType: 'BUSINESS_RULE', targetId: 4047, action: 'CREATE', reviewStatus: 'ACCEPTED', reason: 'Thêm kiểm tra nhóm máu', afterData: '{"description":"Nhóm máu không được rỗng"}' },
        { id: 3, targetType: 'TEST_PLAN', targetId: 1908, action: 'UPDATE', reviewStatus: 'MODIFIED', reason: 'Cập nhật Test Plan', afterData: '{"title":"Kiểm tra nhóm máu"}' },
        { id: 4, targetType: 'TEST_CASE', targetId: 2654, action: 'REMOVE', reviewStatus: 'REJECTED', reason: 'Đề xuất bị từ chối' },
      ],
    });
    mocks.fetchProject.mockResolvedValue([applied(215), { ...applied(217), status: 'CANCELLED' }, applied(216)]);
    render(<SourceUpdateModal project={project} servicePath="backend/patient-service" isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    const history = screen.getByRole('region', { name: 'Lịch sử cập nhật' });
    const upload = screen.getByRole('button', { name: 'Upload file ZIP mới' });
    expect(history.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(history).getByRole('button', { name: /Lịch sử cập nhật/ }));
    const newest = within(history).getByRole('button', { name: /Bản cập nhật #216/ });
    expect(newest.compareDocumentPosition(within(history).getByRole('button', { name: /Bản cập nhật #215/ }))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(history).queryByText(/Bản cập nhật #217/)).not.toBeInTheDocument();
    fireEvent.click(newest);
    expect(within(history).getByRole('heading', { name: 'Đã thêm (1)' })).toBeVisible();
    expect(within(history).getByRole('heading', { name: 'Đã sửa (1)' })).toBeVisible();
    expect(within(history).getByRole('heading', { name: 'Đã xóa (1)' })).toBeVisible();
    expect(within(history).getByText('demo.PatientService#countActivePatients()')).toBeVisible();
    expect(within(history).getByText('Thêm kiểm tra nhóm máu')).toBeVisible();
    expect(within(history).getByText('Cập nhật Test Plan')).toBeVisible();
    expect(within(history).queryByText('Đề xuất bị từ chối')).not.toBeInTheDocument();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it('keeps upload available if loading history fails', async () => {
    mocks.fetchProject.mockRejectedValue(new Error('Không tải được lịch sử'));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    const history = screen.getByRole('region', { name: 'Lịch sử cập nhật' });
    expect(within(history).getByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Upload file ZIP mới' })).toBeEnabled();
  });

  it('does not show stale history when an older project request finishes late', async () => {
    let resolvePrevious!: (value: unknown[]) => void;
    mocks.fetchProject.mockReturnValueOnce(new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce([{ id: 300, projectId: 8, status: 'APPLIED', items: [], impactSummary: null, createdAt: '', updatedAt: '' }]);
    const view = render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    view.rerender(<SourceUpdateModal project={{ ...project, id: 8 }} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    await act(async () => { resolvePrevious([{ id: 200, projectId: 7, status: 'APPLIED', items: [], impactSummary: null, createdAt: '', updatedAt: '' }]); });
    fireEvent.click(screen.getByRole('button', { name: /Lịch sử cập nhật/ }));
    expect(screen.getByRole('button', { name: /Bản cập nhật #300/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Bản cập nhật #200/ })).not.toBeInTheDocument();
  });

  it.each(['all', 'stage'])('waits beyond five minutes for %s generation without submitting again', async (kind) => {
    const draft = { id: 11, items: [], impactSummary: null, status: 'ANALYZED' };
    mocks.fetchProject.mockResolvedValue([draft]);
    let finish!: (value: unknown) => void;
    const request = new Promise((resolve) => { finish = resolve; });
    (kind === 'all' ? mocks.generateAll : mocks.generate).mockReturnValue(request);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: kind === 'all' ? 'Sinh Tất Cả' : '1. Sinh BR' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(301_000); });
    const signal = (kind === 'all' ? mocks.generateAll.mock.calls[0][2] : mocks.generate.mock.calls[0][3]).signal;
    expect(signal.aborted).toBe(false);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.generateAll.mock.calls.length + mocks.generate.mock.calls.length).toBe(1);
    await act(async () => { finish(draft); });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
  it('reports a generate-all timeout even when the draft can be fetched again', async () => {
    const draft = { id: 11, items: [], impactSummary: null, status: 'ANALYZED' };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.fetch.mockResolvedValue(draft);
    mocks.generateAll.mockRejectedValue(Object.assign(new Error('quá thời gian chờ'), { name: 'SourceUpdateTimeoutError' }));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Sinh Tất Cả' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });

    expect(screen.getByRole('alert')).toHaveTextContent('toàn bộ pipeline');
    expect(screen.getByRole('alert')).toHaveTextContent('quá thời gian chờ');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
    expect(screen.getByRole('button', { name: 'Sinh Tất Cả' })).toBeEnabled();
    expect(mocks.generateAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Đã đồng bộ lại trạng thái source update từ server.')).not.toBeInTheDocument();
  });

  it('keeps the failing stage and backend reason visible when generate-all stops', async () => {
    const draft = { id: 11, items: [], impactSummary: null, status: 'ANALYZED',
      generationSummary: { stages: { BUSINESS_RULE: { state: 'SUCCEEDED', completed: true } }, conflicts: [], readyForApply: false } };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.fetch.mockResolvedValue(draft);
    mocks.generateAll.mockRejectedValueOnce(new Error('Test Plan: Hết quota LLM'));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Sinh Tất Cả' }));
    await act(async () => undefined);

    expect(screen.getByRole('alert')).toHaveTextContent('Test Plan');
    expect(screen.getByRole('alert')).toHaveTextContent('Hết quota LLM');
    expect(screen.getByRole('region', { name: 'Nội dung cập nhật source' }))
      .not.toContainElement(screen.getByRole('alert'));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
    expect(screen.getByRole('button', { name: '✓ Đã sinh BR' })).toBeEnabled();
    expect(mocks.generateAll).toHaveBeenCalledTimes(1);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('shows the timeout immediately while checking the draft is also stalled', async () => {
    mocks.fetchProject.mockResolvedValue([{ id: 11, items: [], impactSummary: null, status: 'ANALYZED' }]);
    mocks.fetch.mockReturnValue(new Promise(() => undefined));
    mocks.generateAll.mockRejectedValue(Object.assign(new Error('quá thời gian chờ'), { name: 'SourceUpdateTimeoutError' }));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Sinh Tất Cả' }));

    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });

    expect(screen.getByRole('alert')).toHaveTextContent('toàn bộ pipeline');
    expect(screen.getByRole('button', { name: 'Sinh Tất Cả' })).toBeEnabled();
  });

  it('does not mark a timed-out single stage as completed from an older ready draft', async () => {
    const draft = { id: 11, items: [], impactSummary: null, status: 'READY_TO_APPLY' };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.fetch.mockResolvedValue(draft);
    mocks.generate.mockRejectedValue(Object.assign(new Error('quá thời gian chờ'), { name: 'SourceUpdateTimeoutError' }));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: '1. Sinh BR' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });

    expect(screen.getByRole('alert')).toHaveTextContent('Business Rule');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
    expect(screen.getByRole('button', { name: '1. Sinh BR' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '✓ Đã sinh BR' })).not.toBeInTheDocument();
  });

  it('shows generate-all success outside the scrolling draft content', async () => {
    const draft = { id: 11, items: [], impactSummary: null, status: 'ANALYZED' };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.generateAll.mockResolvedValue(draft);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Sinh Tất Cả' }));
    await act(async () => undefined);

    expect(screen.getByRole('status')).toHaveTextContent('Đã sinh thành công toàn bộ');
    expect(screen.getByRole('region', { name: 'Nội dung cập nhật source' }))
      .not.toContainElement(screen.getByRole('status'));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(mocks.generateAll).toHaveBeenCalledOnce();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('shows upload progress percentage while the source update is running', async () => {
    mocks.createZip.mockImplementation((_projectId: number, _file: File, options: { onUploadProgress?: (percent: number) => void }) => {
      options.onUploadProgress?.(50);
      return new Promise(() => undefined);
    });

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Tải lên & Phân tích/i }));

    await act(async () => undefined);

    expect(screen.getByRole('progressbar', { name: 'Tiến trình xử lý source code' })).toHaveAttribute('aria-valuenow', '23');
    expect(screen.getByText(/Đang tải source code/i)).toBeVisible();
  });

  it('shows a timeout error and releases the loading state when upload hangs', async () => {
    mocks.createZip.mockReturnValue(new Promise(() => undefined));

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Tải lên & Phân tích/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(screen.getByText('Tải source code mới quá thời gian chờ 120 giây.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tải lên & Phân tích/i })).toBeEnabled();
  });

  it('recovers a draft that the server completed after the client timeout', async () => {
    mocks.createZip.mockReturnValue(new Promise(() => undefined));
    mocks.fetchProject.mockResolvedValue([{ id: 11, items: [], impactSummary: null, status: 'DRAFT' }]);

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(screen.getByRole('button', { name: /Ph/i })).toBeVisible();
    expect(mocks.fetchProject).toHaveBeenCalledWith(7, expect.anything());
  });

  it('ignores a late upload result after the modal is closed and reopened', async () => {
    let resolveCreate!: (value: unknown) => void;
    mocks.createZip.mockReturnValue(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    mocks.analyze.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    const view = render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Tải lên & Phân tích/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await act(async () => {
      view.rerender(<SourceUpdateModal project={project} isOpen={false} onClose={onClose} onApplied={vi.fn()} />);
    });

    await act(async () => {
      resolveCreate({ id: 11, items: [], impactSummary: null });
      await Promise.resolve();
    });
    await act(async () => {
      view.rerender(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByText('Nhấp để chọn file ZIP project mới')).toBeVisible();
  });
  it('renders the backend impact summary field names after AST analysis', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.analyze.mockResolvedValue({
      id: 11,
      items: [],
      impactSummary: JSON.stringify({
        totalChangedMethods: 3,
        addedMethodsCount: 2,
        modifiedMethodsCount: 1,
        deletedMethodsCount: 0,
        changedMethods: [{
          className: 'AppointmentService',
          qualifiedClassName: 'com.example.AppointmentService',
          methodName: 'create',
          signature: 'create(AppointmentRequest)',
          methodKey: 'com.example.AppointmentService#create(AppointmentRequest)',
          diffType: 'MODIFIED',
          reason: 'Method changed',
          isServiceMethod: true,
        }],
        affectedServiceMethods: [],
        affectedBusinessRuleIds: [],
        affectedTestPlanIds: [],
        affectedTestCaseIds: [],
        affectedUnitTestIds: [],
      }),
    });

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/^\+2/)).toBeVisible();
    expect(screen.getByText('create(AppointmentRequest)')).toBeVisible();
  });

  it('disables analyze and apply while a single generation stage is running', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.analyze.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.generate.mockReturnValue(new Promise(() => undefined));

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /Ph/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /1\. Sinh BR/i }));

    expect(screen.getByRole('button', { name: /Ph/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Project/i })).toBeDisabled();
  });

  it('clears the generation state when the modal is closed and reopened', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.analyze.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.generate.mockReturnValue(new Promise(() => undefined));
    const view = render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /1\. Sinh BR/i }));

    await act(async () => {
      view.rerender(<SourceUpdateModal project={project} isOpen={false} onClose={vi.fn()} onApplied={vi.fn()} />);
      await Promise.resolve();
    });
    view.rerender(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /1\. Sinh BR/i })).toBeEnabled();
  });

  it('allows closing modal during generation without cancelling the draft', async () => {
    const draft = {
      id: 11,
      projectId: 7,
      status: 'GENERATING' as const,
      items: [],
      impactSummary: null,
      generationSummary: { stages: {}, conflicts: [], readyForApply: false, running: true },
    };
    mocks.fetchProject.mockResolvedValue([draft]);
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    await act(async () => undefined);

    // Click footer Đóng button
    const closeBtn = screen.getByRole('button', { name: 'Đóng' });
    expect(closeBtn).toBeEnabled();
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it('allows closing modal via header X icon without cancelling the draft', async () => {
    const draft = {
      id: 11,
      projectId: 7,
      status: 'ANALYZED' as const,
      items: [],
      impactSummary: null,
    };
    mocks.fetchProject.mockResolvedValue([draft]);
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    await act(async () => undefined);

    const headerCloseBtn = screen.getByRole('button', { name: 'Đóng modal' });
    fireEvent.click(headerCloseBtn);

    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it('cancels draft only when user explicitly clicks Hủy bản nháp', async () => {
    const draft = {
      id: 11,
      projectId: 7,
      status: 'ANALYZED' as const,
      items: [],
      impactSummary: null,
    };
    mocks.fetchProject.mockResolvedValue([draft]);
    mocks.cancel.mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    await act(async () => undefined);

    const cancelDraftBtn = screen.getByRole('button', { name: 'Hủy bản nháp' });
    expect(cancelDraftBtn).toBeVisible();

    await act(async () => {
      fireEvent.click(cancelDraftBtn);
      await Promise.resolve();
    });

    expect(mocks.cancel).toHaveBeenCalledWith(7, 11, expect.anything());
    expect(onClose).toHaveBeenCalledOnce();
  });
});

