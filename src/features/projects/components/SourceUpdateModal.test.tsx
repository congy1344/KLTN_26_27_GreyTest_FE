// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render as rtlRender, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SourceUpdateModal } from './SourceUpdateModal';

function CurrentPath() {
  const { pathname, search, state } = useLocation();
  return <>
    <output aria-label="Current path">{pathname}{search}</output>
    {state?.workflowNotice && <p>{state.workflowNotice}</p>}
  </>;
}

const render = (ui: React.ReactElement, initialPath = '/projects/7/business-rules') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{children}<CurrentPath /></MemoryRouter>
    </QueryClientProvider>
  );
  return rtlRender(ui, { wrapper: Wrapper });
};

const mocks = vi.hoisted(() => ({
  createZip: vi.fn(),
  createGithub: vi.fn(),
  fetchProject: vi.fn(),
  fetch: vi.fn(),
  analyze: vi.fn(),
  applySource: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('../api/source-update-api', () => ({
  SOURCE_UPDATE_TIMEOUT_MS: 120_000,
  createZipSourceUpdate: mocks.createZip,
  createGithubSourceUpdate: mocks.createGithub,
  fetchProjectSourceUpdates: mocks.fetchProject,
  fetchSourceUpdate: mocks.fetch,
  analyzeSourceUpdate: mocks.analyze,
  applySourceChanges: mocks.applySource,
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

const impact = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  totalChangedMethods: 3,
  addedMethodsCount: 1,
  modifiedMethodsCount: 1,
  deletedMethodsCount: 1,
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
  affectedBusinessRuleIds: [1, 2],
  affectedTestPlanIds: [3],
  affectedTestCaseIds: [4, 5],
  affectedUnitTestIds: [6],
  ...overrides,
});

const analyzedDraft = (overrides: Record<string, unknown> = {}) => ({
  id: 11, projectId: 7, status: 'ANALYZED', items: [], impactSummary: impact(), ...overrides,
});

function chooseZip() {
  const file = new File(['source'], 'project.zip', { type: 'application/zip' });
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
}

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

  it('shows applied update history above upload controls with added, modified and deleted items', async () => {
    const applied = (id: number) => ({
      id, projectId: 7, status: 'APPLIED', totalChangedMethods: 1, createdAt: '2026-10-23T09:00:00Z',
      updatedAt: '2026-10-23T10:00:00Z', impactSummary: JSON.stringify({ changedMethods: [{
        diffType: 'DELETED', methodKey: 'demo.PatientService#countActivePatients()', servicePath: 'backend/patient-service',
      }] }),
      items: [
        { id: 1, targetType: 'TEST_CASE', targetId: 2655, action: 'REMOVE', reviewStatus: 'ACCEPTED', reason: 'Test Case đã xóa', beforeData: '{"caseCode":"TC-001"}' },
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
    expect(within(history).queryByText(/Bản cập nhật #217/)).not.toBeInTheDocument();
    fireEvent.click(within(history).getByRole('button', { name: /Bản cập nhật #216/ }));
    expect(within(history).getByRole('heading', { name: 'Đã thêm (1)' })).toBeVisible();
    expect(within(history).getByText('Test Case đã xóa')).toBeVisible();
    expect(within(history).queryByText('Đề xuất bị từ chối')).not.toBeInTheDocument();
    expect(mocks.applySource).not.toHaveBeenCalled();
  });

  it('keeps upload available if loading history fails', async () => {
    mocks.fetchProject.mockRejectedValue(new Error('Không tải được lịch sử'));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    const history = screen.getByRole('region', { name: 'Lịch sử cập nhật' });
    expect(within(history).getByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Upload file ZIP mới' })).toBeEnabled();
  });

  it('shows upload progress percentage while the source update is running', async () => {
    mocks.createZip.mockImplementation((_projectId: number, _file: File, options: { onUploadProgress?: (percent: number) => void }) => {
      options.onUploadProgress?.(50);
      return new Promise(() => undefined);
    });
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    chooseZip();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lên & xem thay đổi' }));
    await act(async () => undefined);

    expect(screen.getByRole('progressbar', { name: 'Tiến trình xử lý source code' })).toHaveAttribute('aria-valuenow', '23');
    expect(screen.getByText(/Đang tải source code/i)).toBeVisible();
  });

  it('shows a timeout error and releases the loading state when upload hangs', async () => {
    mocks.createZip.mockReturnValue(new Promise(() => undefined));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    chooseZip();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lên & xem thay đổi' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });

    expect(screen.getByText('Tải source code mới quá thời gian chờ 120 giây.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tải lên & xem thay đổi' })).toBeEnabled();
  });

  it('recovers an update that the server stored after the client timeout', async () => {
    mocks.createZip.mockReturnValue(new Promise(() => undefined));
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    mocks.fetchProject.mockResolvedValue([{ id: 11, items: [], impactSummary: null, status: 'DRAFT' }]);
    chooseZip();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lên & xem thay đổi' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });

    expect(screen.getByRole('button', { name: 'Phân tích lại' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Áp dụng source mới' })).toBeDisabled();
  });

  it('ignores a late upload result after the modal is closed and reopened', async () => {
    let resolveCreate!: (value: unknown) => void;
    mocks.createZip.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    mocks.analyze.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    const view = render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    chooseZip();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lên & xem thay đổi' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await act(async () => { view.rerender(<SourceUpdateModal project={project} isOpen={false} onClose={onClose} onApplied={vi.fn()} />); });
    await act(async () => { resolveCreate({ id: 11, items: [], impactSummary: null }); await Promise.resolve(); });
    await act(async () => { view.rerender(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />); });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByText('Nhấp để chọn file ZIP dự án mới')).toBeVisible();
  });

  it('explains what applying will remove and keep after analysis', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null, status: 'DRAFT' });
    mocks.analyze.mockResolvedValue(analyzedDraft());
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    chooseZip();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lên & xem thay đổi' }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const summary = screen.getByRole('region', { name: 'Điều gì xảy ra khi áp dụng' });
    expect(within(summary).getByText(/2 Business Rule, 1 Test Plan, 2 Test Case, 1 Unit Test/)).toBeVisible();
    expect(within(summary).getByText(/1 method mới sẽ cần sinh Business Rule/)).toBeVisible();
    expect(within(summary).getByText(/Mọi phần khác giữ nguyên/)).toBeVisible();
    expect(screen.getByText('create(AppointmentRequest)')).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Xem thay đổi');
    expect(screen.getByRole('button', { name: 'Áp dụng source mới' })).toBeEnabled();
  });

  it('shows modified methods side by side and added methods in one full-width code block', async () => {
    const methodDiff = (diffType: string, name: string, beforeSource?: string, afterSource?: string) => ({
      className: 'MailService', qualifiedClassName: 'demo.MailService', methodName: name, signature: `${name}()`,
      methodKey: `demo.MailService#${name}()`, diffType, reason: '', isServiceMethod: true, beforeSource, afterSource,
    });
    mocks.fetchProject.mockResolvedValue([analyzedDraft({ impactSummary: impact({ changedMethods: [
      methodDiff('MODIFIED', 'send', 'int send() {\n  return 1;\n}', 'int send() {\n  return 3;\n}'),
      methodDiff('ADDED', 'ping', undefined, 'int ping() {\n  return 0;\n}'),
    ] }) })]);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    fireEvent.click(screen.getByText('send()'));
    const before = screen.getByRole('region', { name: 'Source trước của send()' });
    const after = screen.getByRole('region', { name: 'Source sau của send()' });
    expect(before.querySelector('[aria-current="true"]')).toHaveTextContent('return 1;');
    expect(after.querySelector('[aria-current="true"]')).toHaveTextContent('return 3;');

    fireEvent.click(screen.getByText('ping()'));
    expect(screen.getByRole('region', { name: 'Source của ping()' })).toBeVisible();
    expect(screen.getByText('Method mới thêm')).toBeVisible();
  });

  it('applies the source and lists only the steps the project had reached', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft()]);
    mocks.applySource.mockResolvedValue(analyzedDraft({ status: 'APPLIED' }));
    const onApplied = vi.fn();
    render(<SourceUpdateModal project={{ ...project, status: 'PLAN_APPROVED' }} isOpen onClose={vi.fn()} onApplied={onApplied} />);
    await act(async () => undefined);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Áp dụng source mới' })); await Promise.resolve(); });

    expect(mocks.applySource).toHaveBeenCalledWith(7, 11, expect.anything());
    expect(onApplied).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/projects/7/business-rules');
    expect(screen.getByText(/Đã áp dụng source mới/)).toBeVisible();
    const steps = screen.getByRole('heading', { name: 'Việc cần làm tiếp, theo thứ tự:' }).nextElementSibling!;
    expect(within(steps as HTMLElement).getByText(/^Business Rule:/)).toBeVisible();
    expect(within(steps as HTMLElement).getByText(/^Test Plan:/)).toBeVisible();
    expect(within(steps as HTMLElement).queryByText(/^Test Case:/)).not.toBeInTheDocument();
    expect(within(steps as HTMLElement).queryByText(/^Unit Test:/)).not.toBeInTheDocument();
  });

  it('navigates to the selected service after confirming a timed-out apply succeeded', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft()]);
    mocks.applySource.mockReturnValue(new Promise(() => undefined));
    mocks.fetch.mockResolvedValue(analyzedDraft({ status: 'APPLIED' }));
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} servicePath="backend/patient-service" isOpen onClose={onClose} onApplied={vi.fn()} />,
      '/projects/7/unit-tests');
    await act(async () => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng source mới' }));
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/projects/7/unit-tests');
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/projects/7/business-rules?servicePath=backend%2Fpatient-service');
    expect(screen.getByText('Đã áp dụng source mới.')).toBeVisible();
  });

  it('returns to Business Rules after applying from another workflow step', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft()]);
    mocks.applySource.mockResolvedValue(analyzedDraft({ status: 'APPLIED' }));
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />, '/projects/7/unit-tests');
    await act(async () => undefined);

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Áp dụng source mới' })); });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/projects/7/business-rules');
  });

  it('lists no regeneration steps when the update only deletes methods', async () => {
    const deleteOnly = impact({ addedMethodsCount: 0, modifiedMethodsCount: 0, deletedMethodsCount: 1 });
    mocks.fetchProject.mockResolvedValue([analyzedDraft({ impactSummary: deleteOnly })]);
    mocks.applySource.mockResolvedValue(analyzedDraft({ status: 'APPLIED', impactSummary: deleteOnly }));
    render(<SourceUpdateModal project={{ ...project, status: 'TEST_GENERATED' }} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.queryByText(/sẽ được sinh lại theo source mới/)).not.toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Áp dụng source mới' })); await Promise.resolve(); });

    expect(screen.getByText('Không có phần nào cần sinh lại.')).toBeVisible();
    expect(screen.queryByText('Việc cần làm tiếp, theo thứ tự:')).not.toBeInTheDocument();
  });

  it('says nothing needs regeneration when no artifact is affected', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft({ impactSummary: impact({ addedMethodsCount: 0, affectedBusinessRuleIds: [] }) })]);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);
    expect(screen.getByText(/Không có Business Rule, Test Plan, Test Case hay Unit Test nào bị ảnh hưởng/)).toBeVisible();
  });

  it('blocks applying an update created by the old incremental flow and offers to cancel it', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft({ status: 'READY_TO_APPLY' })]);
    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    await act(async () => undefined);

    expect(screen.getByText(/được tạo theo cách cũ/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Áp dụng source mới' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hủy cập nhật' })).toBeEnabled();
  });

  it('closes without cancelling the update', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft()]);
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it('cancels the update only when the user clicks Hủy cập nhật', async () => {
    mocks.fetchProject.mockResolvedValue([analyzedDraft()]);
    mocks.cancel.mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    await act(async () => undefined);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Hủy cập nhật' })); await Promise.resolve(); });

    expect(mocks.cancel).toHaveBeenCalledWith(7, 11, expect.anything());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
