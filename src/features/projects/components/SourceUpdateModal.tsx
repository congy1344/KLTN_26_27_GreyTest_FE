import { IconButton } from '../../../shared/components/IconButton';
import { Tag } from '../../../shared/components/Tag';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Upload,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  PencilLine,
  Trash2,
} from 'lucide-react';
import {
  createZipSourceUpdate,
  createGithubSourceUpdate,
  fetchProjectSourceUpdates,
  fetchSourceUpdate,
  analyzeSourceUpdate,
  applySourceChanges,
  SOURCE_UPDATE_TIMEOUT_MS,
  cancelSourceUpdate,
} from '../api/source-update-api';
import type { SourceUpdateRequestOptions } from '../api/source-update-api';
import type { ImpactSummaryDto, MethodDiffItem, Project, ProjectStatus, SourceUpdateDto } from '../types';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useLanguage } from '../../../shared/i18n/language';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';
import { SourceUpdateHistory } from './SourceUpdateHistory';
import { CodeBlock } from '../../../shared/components/CodeBlock';
import { projectWorkflowPath } from '../utils/project-service';

interface SourceUpdateModalProps {
  project: Project;
  servicePath?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

interface SourceUpdateProgress {
  percent: number;
  label: string;
}

const TIMEOUT_ERROR_NAME = 'SourceUpdateTimeoutError';
const TERMINAL_UPDATE_STATUSES = new Set<SourceUpdateDto['status']>(['APPLIED', 'CANCELLED']);

/** Thứ tự pipeline để biết project đã đi tới bước nào trước khi cập nhật source. */
const PIPELINE_ORDER: ProjectStatus[] = [
  'UPLOADED', 'ANALYZED', 'BR_PENDING_REVIEW', 'BR_APPROVED', 'PLAN_PENDING_REVIEW', 'PLAN_APPROVED',
  'CASE_PENDING_REVIEW', 'CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED', 'COMPLETED',
];

/** Các tab người dùng cần bấm "Tiếp tục sinh", chỉ tính những bước project đã đi tới. */
const NEXT_STEPS: { from: ProjectStatus; vi: string; en: string }[] = [
  { from: 'BR_PENDING_REVIEW', vi: 'Business Rule: bấm "Tiếp tục sinh" rồi duyệt BR mới', en: 'Business Rules: click "Resume generation", then approve' },
  { from: 'PLAN_PENDING_REVIEW', vi: 'Test Plan: bấm "Tiếp tục sinh" rồi duyệt', en: 'Test Plans: click "Resume generation", then approve' },
  { from: 'CASE_PENDING_REVIEW', vi: 'Test Case: bấm "Tiếp tục sinh" rồi duyệt', en: 'Test Cases: click "Resume generation", then approve' },
  { from: 'TEST_GENERATED', vi: 'Unit Test: bấm "Tiếp tục sinh" cho các Test Case mới', en: 'Unit Tests: click "Resume generation" for new Test Cases' },
];

function reachedAtLeast(status: ProjectStatus | undefined, target: ProjectStatus) {
  return status != null && PIPELINE_ORDER.indexOf(status) >= PIPELINE_ORDER.indexOf(target);
}

function withSourceUpdateTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMessage: string,
  controller = new AbortController(),
  timeoutMs = SOURCE_UPDATE_TIMEOUT_MS,
): Promise<T> {
  if (timeoutMs === 0) return operation(controller.signal);
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      controller.abort();
      const error = new Error(timeoutMessage);
      error.name = TIMEOUT_ERROR_NAME;
      reject(error);
    }, timeoutMs);

    try {
      operation(controller.signal)
        .then(resolve, reject)
        .finally(() => window.clearTimeout(timeoutId));
    } catch (error) {
      window.clearTimeout(timeoutId);
      reject(error);
    }
  });
}

function getSourceUpdateErrorMessage(error: unknown): string {
  return error instanceof Error && error.name === TIMEOUT_ERROR_NAME
    ? error.message
    : getErrorMessage(error, true);
}

function isSourceUpdateTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === TIMEOUT_ERROR_NAME;
}

const progressPercent = (percent: number) => Math.min(100, Math.max(0, Math.round(percent)));

/** Số dòng (đánh từ 1) có nội dung không xuất hiện ở bản còn lại; đủ để chỉ ra chỗ đổi mà không cần thư viện diff. */
function changedLines(source: string, other: string): Set<number> {
  const otherLines = new Set(other.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()));
  const changed = new Set<number>();
  source.replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    if (line.trim() && !otherLines.has(line.trim())) changed.add(index + 1);
  });
  return changed;
}

/** Method sửa: hai cột trước / sau, tô các dòng khác nhau. Method thêm hoặc xóa: một khung full chiều ngang. */
function MethodSourceDiff({ method }: { method: MethodDiffItem }) {
  const { t } = useLanguage();
  const body = 'max-h-[360px]';
  if (method.diffType === 'MODIFIED' && method.beforeSource && method.afterSource) {
    const removed = changedLines(method.beforeSource, method.afterSource);
    const added = changedLines(method.afterSource, method.beforeSource);
    return (
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <CodeBlock code={method.beforeSource} title={t('Trước', 'Before')} meta={method.signature} bodyClassName={body}
          highlight={(line) => removed.has(line)} ariaLabel={t(`Source trước của ${method.signature}`, `Source before ${method.signature}`)} className="min-w-0" />
        <CodeBlock code={method.afterSource} title={t('Sau', 'After')} meta={method.signature} bodyClassName={body}
          highlight={(line) => added.has(line)} ariaLabel={t(`Source sau của ${method.signature}`, `Source after ${method.signature}`)} className="min-w-0" />
      </div>
    );
  }
  const code = method.afterSource ?? method.beforeSource;
  if (!code) return null;
  const title = method.diffType === 'ADDED' ? t('Method mới thêm', 'Added method') : method.diffType === 'DELETED'
    ? t('Method đã xóa', 'Deleted method') : t('Source', 'Source');
  return (
    <CodeBlock code={code} title={title} meta={method.signature} bodyClassName={body} className="mt-3"
      ariaLabel={t(`Source của ${method.signature}`, `Source of ${method.signature}`)} />
  );
}

function parseImpact(update: SourceUpdateDto | null): ImpactSummaryDto | null {
  if (!update?.impactSummary) return null;
  try {
    return JSON.parse(update.impactSummary) as ImpactSummaryDto;
  } catch {
    return null;
  }
}

/**
 * Cập nhật source theo 3 bước: tải source → xem thay đổi → áp dụng.
 * Áp dụng xong, BR/Plan/Case/Unit Test của method bị sửa hoặc xóa được xóa; người dùng sinh lại
 * phần còn thiếu bằng "Tiếp tục sinh" ở từng tab như luồng thường, phần không đổi giữ nguyên.
 */
export function SourceUpdateModal({ project, servicePath, isOpen, onClose, onApplied }: SourceUpdateModalProps) {
  const { t, language } = useLanguage();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ZIP' | 'GITHUB'>(project.sourceType === 'GITHUB' ? 'GITHUB' : 'ZIP');
  const [file, setFile] = useState<File | null>(null);
  const [branch, setBranch] = useState('main');
  const [updateDraft, setUpdateDraft] = useState<SourceUpdateDto | null>(null);
  const [applied, setApplied] = useState<{ update: SourceUpdateDto; statusBefore: ProjectStatus } | null>(null);
  const [history, setHistory] = useState<SourceUpdateDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<SourceUpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDiffMethodKey, setExpandedDiffMethodKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAbortRef = useRef<AbortController | null>(null);
  const operationVersionRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setProgress(null);
    } else {
      cancelActiveOperation();
      setUpdateDraft(null);
      setApplied(null);
      setHistory([]);
      setHistoryError(null);
      setHistoryLoading(false);
      setExpandedDiffMethodKey(null);
      setFile(null);
      setProgress(null);
      setLoading(false);
    }
  }, [isOpen, project.id]);

  useEffect(() => {
    if (!isOpen || !project.id) return;
    const operationId = beginOperation();
    const controller = new AbortController();
    setHistory([]);
    setHistoryLoading(true);
    setHistoryError(null);
    void fetchProjectSourceUpdates(project.id, { signal: controller.signal })
      .then((updates) => {
        if (controller.signal.aborted) return;
        setHistory(updates);
        if (!isCurrentOperation(operationId)) return;
        const activeDraft = updates.find((update) => !TERMINAL_UPDATE_STATUSES.has(update.status));
        if (activeDraft) setUpdateDraft(activeDraft);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setHistoryError(getSourceUpdateErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [isOpen, project.id]);

  if (!isOpen) return null;

  function beginOperation() {
    activeAbortRef.current?.abort();
    operationVersionRef.current += 1;
    return operationVersionRef.current;
  }

  function cancelActiveOperation() {
    operationVersionRef.current += 1;
    activeAbortRef.current?.abort();
    activeAbortRef.current = null;
  }

  function isCurrentOperation(operationId: number) {
    return operationVersionRef.current === operationId;
  }

  function runRequest<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMessage: string) {
    const controller = new AbortController();
    activeAbortRef.current = controller;
    return withSourceUpdateTimeout(operation, timeoutMessage, controller).finally(() => {
      if (activeAbortRef.current === controller) activeAbortRef.current = null;
    });
  }

  function updateProgress(percent: number, label: string) {
    setProgress({ percent: progressPercent(percent), label });
  }

  async function recoverDraftAfterTimeout(operationId: number) {
    try {
      const updates = await runRequest(
        (signal) => fetchProjectSourceUpdates(project.id, { signal }),
        'Kiểm tra bản cập nhật source code quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return false;
      const activeDraft = updates.find((update) => !TERMINAL_UPDATE_STATUSES.has(update.status));
      if (!activeDraft) return false;
      // Server có thể đã lưu bản cập nhật sau khi request upload bị ngắt; giữ ID để người dùng làm tiếp.
      setUpdateDraft(activeDraft);
      setError(null);
      updateProgress(100, 'Đã nhận lại bản cập nhật source code từ server.');
      return true;
    } catch {
      return false;
    }
  }

  async function reconcileAfterTimeout(operationId: number, updateId: number) {
    try {
      const current = await runRequest(
        (signal) => fetchSourceUpdate(project.id, updateId, { signal }),
        'Kiểm tra trạng thái cập nhật source quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return null;
      setUpdateDraft(current);
      return current;
    } catch {
      return null;
    }
  }

  async function analyzeDraft(updateId: number, startPercent: number, operationId: number) {
    updateProgress(startPercent, 'Đang so sánh source mới với source hiện tại...');
    const analyzed = await runRequest(
      (signal) => analyzeSourceUpdate(project.id, updateId, servicePath, { signal }),
      'Phân tích thay đổi quá thời gian chờ 120 giây.',
    );
    if (!isCurrentOperation(operationId)) return;
    setUpdateDraft(analyzed);
    updateProgress(100, 'Đã phân tích xong thay đổi của source code.');
  }

  async function handleCreateDraft() {
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    setProgress(null);
    try {
      let draft: SourceUpdateDto;
      if (activeTab === 'ZIP') {
        if (!file) {
          setError('Vui lòng chọn file ZIP mã nguồn mới');
          setLoading(false);
          return;
        }
        updateProgress(5, 'Đang chuẩn bị tải source code...');
        draft = await runRequest(
          (signal) => {
            const options: SourceUpdateRequestOptions = {
              signal,
              onUploadProgress: (percent) => {
                if (!signal.aborted && isCurrentOperation(operationId)) {
                  updateProgress(5 + percent * 0.35, `Đang tải source code... ${percent}%`);
                }
              },
            };
            return createZipSourceUpdate(project.id, file, options);
          },
          'Tải source code mới quá thời gian chờ 120 giây.',
        );
      } else {
        if (!branch.trim()) {
          setError('Vui lòng nhập tên nhánh GitHub');
          setLoading(false);
          return;
        }
        updateProgress(10, 'Đang lấy source code từ nhánh GitHub...');
        draft = await runRequest(
          (signal) => createGithubSourceUpdate(project.id, branch.trim(), { signal }),
          'Lấy source code từ GitHub quá thời gian chờ 120 giây.',
        );
      }
      if (!isCurrentOperation(operationId)) return;
      setUpdateDraft(draft);
      await analyzeDraft(draft.id, 45, operationId);
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const recovered = isSourceUpdateTimeout(err) && await recoverDraftAfterTimeout(operationId);
        if (!recovered && isCurrentOperation(operationId)) setError(getSourceUpdateErrorMessage(err));
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  async function handleAnalyze(updateId: number) {
    if (loading) return;
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    setProgress(null);
    try {
      await analyzeDraft(updateId, 10, operationId);
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) && await reconcileAfterTimeout(operationId, updateId);
        if (!reconciled && isCurrentOperation(operationId)) setError(getSourceUpdateErrorMessage(err));
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  function finishApply(update: SourceUpdateDto, statusBefore: ProjectStatus) {
    setUpdateDraft(null);
    setProgress(null);
    onApplied();
    const target = projectWorkflowPath(project.id, undefined, servicePath ?? undefined);
    if (target === pathname + search) {
      setApplied({ update, statusBefore });
      return;
    }
    onClose();
    navigate(target, { state: { workflowNotice: t('Đã áp dụng source mới.', 'New source applied.') } });
  }

  async function handleApplySource() {
    if (!updateDraft || loading) return;
    const operationId = beginOperation();
    const statusBefore = project.status;
    setLoading(true);
    setError(null);
    updateProgress(40, 'Đang áp dụng source mới vào dự án...');
    try {
      const result = await runRequest(
        (signal) => applySourceChanges(project.id, updateDraft.id, { signal }),
        'Áp dụng source mới quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      finishApply(result, statusBefore);
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) ? await reconcileAfterTimeout(operationId, updateDraft.id) : null;
        if (reconciled?.status === 'APPLIED') {
          finishApply(reconciled, statusBefore);
        } else if (isCurrentOperation(operationId)) {
          setError(getSourceUpdateErrorMessage(err));
        }
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  async function handleCancelDraft() {
    if (!updateDraft) {
      cancelActiveOperation();
      onClose();
      return;
    }
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    try {
      await runRequest(
        (signal) => cancelSourceUpdate(project.id, updateDraft.id, { signal }),
        'Hủy cập nhật quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setUpdateDraft(null);
      setProgress(null);
      onClose();
    } catch (err) {
      if (isCurrentOperation(operationId)) setError(getSourceUpdateErrorMessage(err));
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  const impact = parseImpact(applied?.update ?? updateDraft);
  const serviceMethods = (impact?.changedMethods ?? []).filter((m: MethodDiffItem) => {
    if (!m.isServiceMethod) return false;
    if (!servicePath || !m.servicePath) return true;
    return m.servicePath === servicePath;
  });
  const affected = {
    rules: impact?.affectedBusinessRuleIds?.length ?? 0,
    plans: impact?.affectedTestPlanIds?.length ?? 0,
    cases: impact?.affectedTestCaseIds?.length ?? 0,
    unitTests: impact?.affectedUnitTestIds?.length ?? 0,
  };
  const nothingAffected = (impact?.addedMethodsCount ?? 0) === 0 && affected.rules === 0;
  // ponytail: chỉ xóa method thì không còn gì để sinh; ca hiếm Test Plan phủ thêm BR không đổi do backend lùi trạng thái.
  const nothingToRegenerate = (impact?.addedMethodsCount ?? 0) === 0
    && ((impact?.modifiedMethodsCount ?? 0) === 0 || affected.rules === 0);
  const isAnalyzed = updateDraft?.status === 'ANALYZED';
  // Bản cập nhật tạo theo luồng sinh tăng dần cũ không áp dụng trực tiếp được; người dùng hủy rồi tải lại.
  const isLegacyDraft = updateDraft != null && ['GENERATING', 'READY_TO_APPLY'].includes(updateDraft.status);
  const step = applied ? 3 : updateDraft ? 2 : 1;
  const steps = [
    t('Tải source mới', 'Upload new source'),
    t('Xem thay đổi', 'Review changes'),
    t('Sinh lại phần thay đổi', 'Regenerate changed parts'),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-dark/60 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="source-update-title" className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-base border border-border-default bg-neutral-primary-soft shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 id="source-update-title" className="font-semibold text-heading text-lg font-display">{t('Cập nhật source code', 'Update source code')}</h2>
              <p className="text-xs text-body-subtle">
                {project.name}{servicePath ? ` · Service: ${servicePath}` : ''}
              </p>
            </div>
          </div>
          <IconButton icon={X} label={t('Đóng modal', 'Close modal')} onClick={onClose} />
        </div>

        <ol aria-label={t('Các bước cập nhật source', 'Source update steps')} className="flex flex-wrap gap-2 border-b border-border-default px-6 py-3 text-xs">
          {steps.map((label, index) => {
            const number = index + 1;
            const state = number < step ? 'done' : number === step ? 'current' : 'todo';
            return (
              <li key={label} aria-current={state === 'current' ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1 font-semibold ${
                  state === 'current' ? 'bg-brand-softer text-fg-brand-strong'
                    : state === 'done' ? 'bg-success-soft text-fg-success-strong' : 'bg-neutral-secondary-medium text-body-subtle'}`}>
                {state === 'done' ? <CheckCircle2 size={13} aria-hidden="true" /> : <span>{number}.</span>}
                {label}
              </li>
            );
          })}
        </ol>

        {error && (
          <div role="alert" className="mx-6 mt-4 flex max-h-32 shrink-0 items-center gap-2 overflow-y-auto rounded-base bg-danger-soft p-3 text-sm text-fg-danger-strong border border-border-danger-subtle">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div role="region" aria-label="Nội dung cập nhật source" className="flex-1 overflow-y-auto p-6 space-y-6">
          {progress && (
            <div className="rounded-base border border-border-brand-subtle bg-brand-softer p-4" aria-live="polite">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-heading">Tiến trình xử lý source code</span>
                <span className="font-semibold text-brand">{progress.percent}%</span>
              </div>
              <div role="progressbar" aria-label="Tiến trình xử lý source code" aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={progress.percent} className="h-2 overflow-hidden rounded-full bg-neutral-secondary-medium">
                <div className="h-full rounded-full bg-brand transition-colors duration-300 ease-out" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-body-subtle">{progress.label}</p>
            </div>
          )}

          {step === 1 && (
            <>
              <SourceUpdateHistory updates={history} loading={historyLoading} error={historyError} servicePath={servicePath} />
              <div className="space-y-4">
                <p className="text-sm text-body">
                  {t(
                    'Tải source mới lên. Hệ thống so sánh với source hiện tại và chỉ cập nhật những method có thay đổi; phần còn lại giữ nguyên.',
                    'Upload the new source. GreyTest compares it with the current source and only updates changed methods; everything else is kept.',
                  )}
                </p>
                <div className="flex gap-2 border-b border-border-default pb-2">
                  <button type="button" onClick={() => setActiveTab('ZIP')} aria-pressed={activeTab === 'ZIP'}
                    className={activeTab === 'ZIP' ? 'btn btn-ghost bg-brand-softer text-fg-brand-strong' : 'btn btn-ghost'}>
                    <Upload size={16} />
                    Upload file ZIP mới
                  </button>
                  <button type="button" onClick={() => setActiveTab('GITHUB')} aria-pressed={activeTab === 'GITHUB'}
                    className={activeTab === 'GITHUB' ? 'btn btn-ghost bg-brand-softer text-fg-brand-strong' : 'btn btn-ghost'}>
                    <GitBranch size={16} />
                    Lấy từ nhánh GitHub
                  </button>
                </div>

                {activeTab === 'ZIP' ? (
                  <div
                    onClick={(event) => { if (event.target !== fileInputRef.current) fileInputRef.current?.click(); }}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-base border-2 border-dashed border-border-default p-8 text-center transition-colors hover:border-brand hover:bg-brand-softer"
                    role="button" tabIndex={0}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
                  >
                    <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <Upload size={32} className="mb-2 text-brand" />
                    <p className="text-sm font-semibold text-heading">
                      {file ? file.name : t('Nhấp để chọn file ZIP dự án mới', 'Click to select new project ZIP file')}
                    </p>
                    <p className="mt-1 text-xs text-body-subtle">Hỗ trợ file ZIP toàn bộ mã nguồn Java Spring Boot</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-heading" htmlFor="source-update-branch">Tên nhánh (Branch)</label>
                    <input id="source-update-branch" type="text" value={branch} onChange={(e) => setBranch(e.target.value)}
                      placeholder="ví dụ: main, develop, feature/new-logic"
                      className="w-full rounded-control border border-border-default bg-neutral-primary px-4 py-2.5 text-sm text-heading" />
                    <p className="text-xs text-body-subtle">Hệ thống sẽ lấy commit mới nhất từ nhánh trên repository: {project.sourceUrl}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && updateDraft && (
            <div className="space-y-5">
              {isLegacyDraft && (
                <div role="status" className="rounded-base border border-border-warning-subtle bg-warning-soft p-4 text-sm text-fg-warning">
                  {t(
                    `Bản cập nhật này được tạo theo cách cũ (${formatSemanticLabel(updateDraft.status, language)}) và không thể áp dụng trực tiếp. Hãy bấm "Hủy cập nhật" rồi tải source lại.`,
                    `This update was created with the old flow (${formatSemanticLabel(updateDraft.status, language)}) and cannot be applied directly. Cancel it and upload the source again.`,
                  )}
                </div>
              )}
              {!isAnalyzed && !isLegacyDraft && (
                <div role="status" className="rounded-base border border-border-default p-4 text-sm text-body">
                  {t('Source đã được tải lên nhưng chưa phân tích xong. Bấm "Phân tích lại" để tiếp tục.',
                    'The source is uploaded but not analyzed yet. Click "Analyze again" to continue.')}
                </div>
              )}

              {impact && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-heading">{t('Thay đổi phát hiện:', 'Detected changes:')}</span>
                    <Tag variant="status" tone="success" icon={Plus}>{impact.addedMethodsCount} {t('method mới', 'new methods')}</Tag>
                    <Tag variant="status" tone="warning" icon={PencilLine}>{impact.modifiedMethodsCount} {t('method sửa', 'modified')}</Tag>
                    <Tag variant="status" tone="danger" icon={Trash2}>{impact.deletedMethodsCount} {t('method xóa', 'deleted')}</Tag>
                  </div>

                  {isAnalyzed && (
                    <section aria-label={t('Điều gì xảy ra khi áp dụng', 'What applying does')} className="rounded-base border border-border-brand-subtle bg-brand-softer p-4 text-sm">
                      <h3 className="font-semibold text-heading">{t('Khi bấm "Áp dụng source mới":', 'When you click "Apply new source":')}</h3>
                      {nothingAffected ? (
                        <p className="mt-2 text-body">{t('Không có Business Rule, Test Plan, Test Case hay Unit Test nào bị ảnh hưởng. Chỉ cập nhật source.',
                          'No Business Rule, Test Plan, Test Case or Unit Test is affected. Only the source is updated.')}</p>
                      ) : (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-body">
                          {affected.rules > 0 && (
                            <li>{t(
                              `Xóa ${affected.rules} Business Rule, ${affected.plans} Test Plan, ${affected.cases} Test Case, ${affected.unitTests} Unit Test của các method bị sửa hoặc xóa.`,
                              `Remove ${affected.rules} Business Rules, ${affected.plans} Test Plans, ${affected.cases} Test Cases, ${affected.unitTests} Unit Tests of modified or deleted methods.`,
                            )}</li>
                          )}
                          {(impact.modifiedMethodsCount ?? 0) > 0 && affected.rules > 0 && (
                            <li>{t('Phần của method bị sửa sẽ được sinh lại theo source mới; phần của method bị xóa thì bỏ hẳn.',
                              'Parts of modified methods are regenerated from the new source; parts of deleted methods are dropped.')}</li>
                          )}
                          {impact.addedMethodsCount > 0 && (
                            <li>{t(`${impact.addedMethodsCount} method mới sẽ cần sinh Business Rule.`, `${impact.addedMethodsCount} new methods will need Business Rules.`)}</li>
                          )}
                          <li>{t('Mọi phần khác giữ nguyên, kể cả những gì bạn đã duyệt.', 'Everything else is kept, including what you already approved.')}</li>
                        </ul>
                      )}
                    </section>
                  )}

                  {serviceMethods.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-body-subtle">
                        {t('Method Service thay đổi (bấm để xem source trước / sau)', 'Changed Service methods (click to see before / after)')}
                      </h3>
                      {serviceMethods.map((m: MethodDiffItem) => {
                        const isExpanded = expandedDiffMethodKey === m.methodKey;
                        const hasSource = Boolean(m.beforeSource || m.afterSource);
                        const tone = m.diffType === 'ADDED' ? 'success' : m.diffType === 'DELETED' ? 'danger' : 'warning';
                        return (
                          <div key={m.methodKey} className="rounded-base border border-border-default p-3 text-xs">
                            <div className={`flex items-center justify-between gap-2 ${hasSource ? 'cursor-pointer select-none' : ''}`}
                              onClick={() => hasSource && setExpandedDiffMethodKey(isExpanded ? null : m.methodKey)}>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Tag variant="status" tone={tone} icon={m.diffType === 'ADDED' ? Plus : m.diffType === 'DELETED' ? Trash2 : PencilLine}>
                                    {formatSemanticLabel(m.diffType, language)}
                                  </Tag>
                                  <span className="truncate font-mono font-semibold text-heading">{m.signature}</span>
                                </div>
                                <p className="mt-1 text-xs text-body-subtle">
                                  <span className="font-mono">{m.qualifiedClassName}</span>{m.reason ? `, ${m.reason}` : ''}
                                </p>
                              </div>
                              {hasSource && (
                                <IconButton icon={isExpanded ? ChevronUp : ChevronDown}
                                  label={isExpanded ? t('Thu gọn diff', 'Collapse diff') : t('Mở rộng diff', 'Expand diff')}
                                  onClick={(event) => { event.stopPropagation(); setExpandedDiffMethodKey(isExpanded ? null : m.methodKey); }}
                                  aria-expanded={isExpanded} />
                              )}
                            </div>
                            {isExpanded && <MethodSourceDiff method={m} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && applied && (
            <section role="status" className="space-y-4">
              <div className="flex items-start gap-3 rounded-base border border-border-success-subtle bg-success-soft p-4 text-sm text-fg-success-strong">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <p className="font-semibold">{t('Đã áp dụng source mới. Phần không thay đổi được giữ nguyên.', 'New source applied. Unchanged parts were kept.')}</p>
              </div>
              {nothingToRegenerate ? (
                <p className="text-sm text-body">{t('Không có phần nào cần sinh lại.', 'Nothing needs to be regenerated.')}</p>
              ) : (
                <div className="text-sm">
                  <h3 className="font-semibold text-heading">{t('Việc cần làm tiếp, theo thứ tự:', 'Next steps, in order:')}</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-body">
                    {NEXT_STEPS.filter((s) => s.from === 'BR_PENDING_REVIEW' || reachedAtLeast(applied.statusBefore, s.from))
                      .map((s) => <li key={s.from}>{t(s.vi, s.en)}</li>)}
                  </ol>
                  <p className="mt-2 text-xs text-body-subtle">
                    {t('"Tiếp tục sinh" chỉ sinh cho phần còn thiếu do source thay đổi.', '"Resume generation" only fills in what the source change removed.')}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-default px-6 py-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost text-sm">{t('Đóng', 'Close')}</button>
            {step === 2 && (
              <button type="button" disabled={loading} onClick={handleCancelDraft} className="btn btn-ghost-danger text-sm">
                {t('Hủy cập nhật', 'Cancel update')}
              </button>
            )}
          </div>
          {step === 1 && (
            <button type="button" disabled={loading || (activeTab === 'ZIP' && !file)} onClick={handleCreateDraft} className="btn btn-brand whitespace-nowrap text-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {t('Tải lên & xem thay đổi', 'Upload & review changes')}
            </button>
          )}
          {step === 2 && updateDraft && (
            <div className="flex items-center gap-3">
              {!isLegacyDraft && (
                <button type="button" disabled={loading} onClick={() => handleAnalyze(updateDraft.id)} className="btn btn-secondary text-sm">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  {t('Phân tích lại', 'Analyze again')}
                </button>
              )}
              <button type="button" disabled={loading || !isAnalyzed} onClick={handleApplySource} className="btn btn-brand whitespace-nowrap text-sm">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {t('Áp dụng source mới', 'Apply new source')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
