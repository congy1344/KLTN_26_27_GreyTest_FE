import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  GitBranch,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import {
  createZipSourceUpdate,
  createGithubSourceUpdate,
  fetchProjectSourceUpdates,
  fetchSourceUpdate,
  analyzeSourceUpdate,
  generateIncrementalSourceUpdate,
  SOURCE_UPDATE_TIMEOUT_MS,
  patchSourceUpdateItem,
  applySourceUpdate,
  cancelSourceUpdate,
} from '../api/source-update-api';
import type { SourceUpdateRequestOptions } from '../api/source-update-api';
import type {
  ImpactSummaryDto,
  MethodDiffItem,
  Project,
  SourceUpdateAction,
  SourceUpdateDto,
  SourceUpdateItemDto,
  SourceUpdateReviewStatus,
} from '../types';
import { getErrorMessage } from '../../../shared/api/api-client';

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
const TERMINAL_UPDATE_STATUSES = new Set<SourceUpdateDto['status']>(['APPLIED', 'CANCELLED', 'FAILED']);

function withSourceUpdateTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMessage: string,
  controller = new AbortController(),
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      controller.abort();
      const error = new Error(timeoutMessage);
      error.name = TIMEOUT_ERROR_NAME;
      reject(error);
    }, SOURCE_UPDATE_TIMEOUT_MS);

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
    : getErrorMessage(error);
}

function isSourceUpdateTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === TIMEOUT_ERROR_NAME;
}

const progressPercent = (percent: number) => Math.min(100, Math.max(0, Math.round(percent)));

export function SourceUpdateModal({ project, servicePath, isOpen, onClose, onApplied }: SourceUpdateModalProps) {
  const [activeTab, setActiveTab] = useState<'ZIP' | 'GITHUB'>(project.sourceType === 'GITHUB' ? 'GITHUB' : 'ZIP');
  const [file, setFile] = useState<File | null>(null);
  const [branch, setBranch] = useState('main');
  const [updateDraft, setUpdateDraft] = useState<SourceUpdateDto | null>(null);
  const [impactSummary, setImpactSummary] = useState<ImpactSummaryDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingStage, setGeneratingStage] = useState<string | null>(null);
  const [progress, setProgress] = useState<SourceUpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageNotice, setStageNotice] = useState<{ type: 'success' | 'error'; message: string; timestamp: string } | null>(null);
  const [completedStages, setCompletedStages] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [expandedDiffMethodKey, setExpandedDiffMethodKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAbortRef = useRef<AbortController | null>(null);
  const operationVersionRef = useRef(0);

  useEffect(() => {
    if (isOpen && project.id) {
      setError(null);
      setProgress(null);
      setStageNotice(null);
    } else if (!isOpen) {
      cancelActiveOperation();
      setUpdateDraft(null);
      setImpactSummary(null);
      setStageNotice(null);
      setCompletedStages({});
      setExpandedItemId(null);
      setExpandedDiffMethodKey(null);
      setFile(null);
      setProgress(null);
      setLoading(false);
      setGeneratingStage(null);
    }
  }, [isOpen, project.id]);

  useEffect(() => {
    if (updateDraft?.impactSummary) {
      try {
        setImpactSummary(JSON.parse(updateDraft.impactSummary));
      } catch {
        setImpactSummary(null);
      }
    }
  }, [updateDraft]);

  useEffect(() => {
    if (!isOpen || !project.id) return;
    const operationId = beginOperation();
    const controller = new AbortController();
    void fetchProjectSourceUpdates(project.id, { signal: controller.signal })
      .then((updates) => {
        if (!isCurrentOperation(operationId)) return;
        const activeDraft = updates.find((update) => !TERMINAL_UPDATE_STATUSES.has(update.status));
        if (activeDraft) setUpdateDraft(activeDraft);
      })
      .catch((err) => {
        if (!controller.signal.aborted && isCurrentOperation(operationId)) {
          setError(getSourceUpdateErrorMessage(err));
        }
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

  function runRequest<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMessage: string,
  ) {
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
        'Kiểm tra bản nháp source code quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return false;
      const activeDraft = updates.find((update) => !TERMINAL_UPDATE_STATUSES.has(update.status));
      if (!activeDraft) return false;
      // Nếu server đã lưu bản nháp sau khi request upload bị ngắt, giữ lại ID để người dùng tiếp tục xử lý.
      setUpdateDraft(activeDraft);
      setError(null);
      updateProgress(100, 'Đã nhận lại bản nháp source code từ server.');
      return true;
    } catch {
      return false;
    }
  }

  async function reconcileDraftAfterTimeout(operationId: number, updateId: number) {
    try {
      const current = await runRequest(
        (signal) => fetchSourceUpdate(project.id, updateId, { signal }),
        'Kiểm tra trạng thái source update quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return null;
      setUpdateDraft(current);
      setError(null);
      updateProgress(100, 'Đã đồng bộ lại trạng thái source update từ server.');
      return current;
    } catch {
      return null;
    }
  }

  function isBusy() {
    return loading || generatingStage !== null;
  }

  async function analyzeDraft(updateId: number, startPercent: number, operationId: number) {
    updateProgress(startPercent, 'Đang phân tích cấu trúc AST của source code...');
    const analyzed = await runRequest(
      (signal) => analyzeSourceUpdate(project.id, updateId, servicePath, { signal }),
      'Phân tích AST quá thời gian chờ 120 giây.',
    );
    if (!isCurrentOperation(operationId)) return;
    setUpdateDraft(analyzed);
    updateProgress(100, 'Đã hoàn tất cập nhật và phân tích source code.');
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
      // Tự động phân tích AST diff ngay sau khi upload
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
    if (isBusy()) return;
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    setProgress(null);
    try {
      await analyzeDraft(updateId, 10, operationId);
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) && await reconcileDraftAfterTimeout(operationId, updateId);
        if (!reconciled && isCurrentOperation(operationId)) setError(getSourceUpdateErrorMessage(err));
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  async function handleGenerateStage(stage: 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST') {
    if (!updateDraft || isBusy()) return;
    const operationId = beginOperation();
    setGeneratingStage(stage);
    setError(null);
    setStageNotice(null);
    const stageNames: Record<string, string> = {
      BUSINESS_RULE: 'Business Rule',
      TEST_PLAN: 'Test Plan',
      TEST_CASE: 'Test Case',
      UNIT_TEST: 'Unit Test',
    };
    const stageName = stageNames[stage] || stage;
    updateProgress(5, `Đang sinh ${stageName}...`);
    try {
      const prevCount = updateDraft.items?.length ?? 0;
      const result = await runRequest(
        (signal) => generateIncrementalSourceUpdate(project.id, updateDraft.id, stage, { signal }),
        `Sinh ${stageName} quá thời gian chờ 120 giây.`,
      );
      if (!isCurrentOperation(operationId)) return;
      setUpdateDraft(result);
      const newCount = (result.items?.length ?? 0) - prevCount;
      setCompletedStages((prev) => ({ ...prev, [stage]: true }));
      setStageNotice({
        type: 'success',
        message: `✓ Đã sinh xong ${stageName}! ${newCount > 0 ? `Đã tạo thêm ${newCount} đề xuất mới sẵn sàng duyệt.` : 'Đã cập nhật các đề xuất tương ứng.'}`,
        timestamp: new Date().toLocaleTimeString(),
      });
      updateProgress(100, `Đã hoàn tất sinh ${stageName}.`);
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) && await reconcileDraftAfterTimeout(operationId, updateDraft.id);
        if (!reconciled && isCurrentOperation(operationId)) {
          const errMsg = getSourceUpdateErrorMessage(err);
          setError(errMsg);
          setStageNotice({
            type: 'error',
            message: `✕ Sinh ${stageName} thất bại: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    } finally {
      if (isCurrentOperation(operationId)) setGeneratingStage(null);
    }
  }

  async function handleGenerateAll() {
    if (!updateDraft || isBusy()) return;
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    setStageNotice(null);
    updateProgress(0, 'Đang bắt đầu sinh tăng dần toàn bộ...');
    try {
      const prevCount = updateDraft.items?.length ?? 0;
      updateProgress(10, 'Đang sinh Business Rule...');
      let result = await runRequest(
        (signal) => generateIncrementalSourceUpdate(project.id, updateDraft.id, 'BUSINESS_RULE', { signal }),
        'Sinh Business Rule quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setCompletedStages((prev) => ({ ...prev, BUSINESS_RULE: true }));
      updateProgress(35, 'Đã sinh Business Rule. Đang sinh Test Plan...');
      result = await runRequest(
        (signal) => generateIncrementalSourceUpdate(project.id, updateDraft.id, 'TEST_PLAN', { signal }),
        'Sinh Test Plan quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setCompletedStages((prev) => ({ ...prev, TEST_PLAN: true }));
      updateProgress(65, 'Đã sinh Test Plan. Đang sinh Test Case...');
      result = await runRequest(
        (signal) => generateIncrementalSourceUpdate(project.id, updateDraft.id, 'TEST_CASE', { signal }),
        'Sinh Test Case quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setCompletedStages((prev) => ({ ...prev, TEST_CASE: true }));
      updateProgress(85, 'Đã sinh Test Case. Đang sinh Unit Test...');
      result = await runRequest(
        (signal) => generateIncrementalSourceUpdate(project.id, updateDraft.id, 'UNIT_TEST', { signal }),
        'Sinh Unit Test quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setCompletedStages({
        BUSINESS_RULE: true,
        TEST_PLAN: true,
        TEST_CASE: true,
        UNIT_TEST: true,
      });
      setUpdateDraft(result);
      const totalCreated = (result.items?.length ?? 0) - prevCount;
      setStageNotice({
        type: 'success',
        message: `✓ Đã sinh thành công toàn bộ BR, Test Plan, Test Case và Unit Test! Tổng cộng ${totalCreated > 0 ? `${totalCreated} đề xuất mới` : `${result.items?.length ?? 0} đề xuất`} đã sẵn sàng áp dụng.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      updateProgress(100, 'Đã hoàn tất sinh tăng dần cho source code.');
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) && await reconcileDraftAfterTimeout(operationId, updateDraft.id);
        if (!reconciled && isCurrentOperation(operationId)) {
          const errMsg = getSourceUpdateErrorMessage(err);
          setError(errMsg);
          setStageNotice({
            type: 'error',
            message: `✕ Sinh tự động gặp lỗi: ${errMsg}`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  async function handlePatchItem(itemId: number, reviewStatus: SourceUpdateReviewStatus, action?: SourceUpdateAction) {
    if (!updateDraft || isBusy()) return;
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    try {
      await runRequest(
        (signal) => patchSourceUpdateItem(project.id, updateDraft.id, itemId, { reviewStatus, action }, { signal }),
        'Cập nhật đề xuất quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      const refreshed = await runRequest(
        (signal) => fetchSourceUpdate(project.id, updateDraft.id, { signal }),
        'Tải lại bản nháp quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setUpdateDraft(refreshed);
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) && await reconcileDraftAfterTimeout(operationId, updateDraft.id);
        if (!reconciled && isCurrentOperation(operationId)) setError(getSourceUpdateErrorMessage(err));
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  async function handleAcceptAllItems() {
    if (!updateDraft || isBusy() || !updateDraft.items || updateDraft.items.length === 0) return;
    const pendingItems = updateDraft.items.filter((item) => item.reviewStatus !== 'ACCEPTED');
    if (pendingItems.length === 0) return;
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    updateProgress(10, `Đang chấp nhận tất cả ${pendingItems.length} đề xuất...`);
    try {
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        await runRequest(
          (signal) => patchSourceUpdateItem(project.id, updateDraft.id, item.id, { reviewStatus: 'ACCEPTED' }, { signal }),
          'Chấp nhận đề xuất quá thời gian chờ.',
        );
        updateProgress(10 + Math.round(((i + 1) / pendingItems.length) * 80), `Đã chấp nhận ${i + 1}/${pendingItems.length} đề xuất...`);
      }
      const refreshed = await runRequest(
        (signal) => fetchSourceUpdate(project.id, updateDraft.id, { signal }),
        'Tải lại bản nháp sau khi duyệt.',
      );
      if (!isCurrentOperation(operationId)) return;
      setUpdateDraft(refreshed);
      updateProgress(100, `Đã chấp nhận thành công tất cả ${pendingItems.length} đề xuất!`);
      setStageNotice({
        type: 'success',
        message: `✓ Đã chấp nhận tất cả ${pendingItems.length} đề xuất. Toàn bộ đã sẵn sàng để áp dụng vào project!`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        setError(getSourceUpdateErrorMessage(err));
      }
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  async function handleApply() {
    if (!updateDraft || isBusy()) return;
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    updateProgress(5, 'Đang chuẩn bị áp dụng cập nhật vào project...');
    try {
      // Tự động sinh lại Test Case cho các Test Plan bị ảnh hưởng nếu chưa sinh
      const hasTestCaseItems = (updateDraft.items || []).some(
        (item) => item.targetType === 'TEST_CASE' && item.afterData != null,
      );
      const affectedPlanCount = impactSummary?.affectedTestPlanIds?.length ?? 0;
      if (affectedPlanCount > 0 && !hasTestCaseItems && !completedStages['TEST_CASE']) {
        updateProgress(10, 'Đang tự động sinh lại Test Case cho các Test Plan bị ảnh hưởng...');
        const updated = await runRequest(
          (signal) => generateIncrementalSourceUpdate(project.id, updateDraft.id, 'TEST_CASE', { signal }),
          'Tự động sinh Test Case quá thời gian chờ 120 giây.',
        );
        if (!isCurrentOperation(operationId)) return;
        if (updated) {
          updateDraft.items = updated.items;
          setUpdateDraft(updated);
        }
        setCompletedStages((prev) => ({ ...prev, TEST_CASE: true }));
      }

      // Tự động duyệt các đề xuất còn PENDING để đảm bảo không bị chặn hoặc lỗi backend
      const pendingItems = (updateDraft.items || []).filter((item) => item.reviewStatus === 'PENDING');
      if (pendingItems.length > 0) {
        updateProgress(15, `Đang tự động duyệt ${pendingItems.length} đề xuất còn lại...`);
        for (const item of pendingItems) {
          await runRequest(
            (signal) => patchSourceUpdateItem(project.id, updateDraft.id, item.id, { reviewStatus: 'ACCEPTED' }, { signal }),
            'Duyệt đề xuất trước khi áp dụng quá thời gian chờ.',
          );
        }
      }
      updateProgress(60, 'Đang ghi nhận thay đổi vào project...');
      await runRequest(
        (signal) => applySourceUpdate(project.id, updateDraft.id, { signal }),
        'Áp dụng cập nhật quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      updateProgress(100, 'Đã áp dụng thành công cập nhật vào project.');
      onApplied();
      onClose();
    } catch (err) {
      if (isCurrentOperation(operationId)) {
        const reconciled = isSourceUpdateTimeout(err) && await reconcileDraftAfterTimeout(operationId, updateDraft.id);
        if (reconciled && reconciled.status === 'APPLIED') {
          onApplied();
          onClose();
        } else if (!reconciled && isCurrentOperation(operationId)) {
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
      setLoading(false);
      setFile(null);
      setProgress(null);
      setGeneratingStage(null);
      onClose();
      return;
    }
    const operationId = beginOperation();
    setLoading(true);
    setError(null);
    try {
      await runRequest(
        (signal) => cancelSourceUpdate(project.id, updateDraft.id, { signal }),
        'Hủy bản nháp quá thời gian chờ 120 giây.',
      );
      if (!isCurrentOperation(operationId)) return;
      setUpdateDraft(null);
      setImpactSummary(null);
      setProgress(null);
      setGeneratingStage(null);
      onClose();
    } catch (err) {
      if (isCurrentOperation(operationId)) setError(getSourceUpdateErrorMessage(err));
    } finally {
      if (isCurrentOperation(operationId)) setLoading(false);
    }
  }

  const canApply = updateDraft?.status === 'ANALYZED' || updateDraft?.status === 'READY_TO_APPLY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border-default bg-neutral-primary-soft shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-heading">Cập nhật Source Code & Sinh Tăng Dần</h2>
              <p className="text-xs text-body-subtle">
                Dự án: <span className="font-semibold text-heading">{project.name}</span>
                {servicePath ? (
                  <>
                    {' · '}Đang chọn Service: <span className="font-semibold text-brand">{servicePath}</span> (chỉ phân tích & cập nhật service này)
                  </>
                ) : (
                  ' · Nhận diện thay đổi method và chỉ sinh cho phần bị ảnh hưởng'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelDraft}
            className="rounded-lg p-1 text-body-subtle hover:bg-neutral-secondary-soft hover:text-heading"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="m-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {progress && (
          <div className="mx-6 mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-heading">Tiến trình xử lý source code</span>
              <span className="font-bold text-brand">{progress.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Tiến trình xử lý source code"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              className="h-2 overflow-hidden rounded-full bg-brand/10"
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-body-subtle">{progress.label}</p>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!updateDraft ? (
            /* Bước 1: Upload source mới */
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-border-default pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('ZIP')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'ZIP' ? 'bg-brand text-white shadow-sm' : 'text-body hover:bg-neutral-secondary-soft'
                  }`}
                >
                  <Upload size={16} />
                  Upload file ZIP mới
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('GITHUB')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'GITHUB' ? 'bg-brand text-white shadow-sm' : 'text-body hover:bg-neutral-secondary-soft'
                  }`}
                >
                  <GitBranch size={16} />
                  Lấy từ nhánh GitHub
                </button>
              </div>

              {activeTab === 'ZIP' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-default p-8 text-center transition-colors hover:border-brand hover:bg-brand/5"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <Upload size={32} className="mb-2 text-brand" />
                  <p className="text-sm font-semibold text-heading">
                    {file ? file.name : 'Nhấp để chọn file ZIP project mới'}
                  </p>
                  <p className="mt-1 text-xs text-body-subtle">Hỗ trợ file ZIP toàn bộ mã nguồn Java Spring Boot</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-heading">Tên nhánh (Branch)</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="ví dụ: main, develop, feature/new-logic"
                    className="w-full rounded-lg border border-border-default bg-neutral-primary px-4 py-2.5 text-sm text-heading focus:border-brand focus:outline-none"
                  />
                  <p className="text-xs text-body-subtle">
                    Hệ thống sẽ lấy commit mới nhất từ nhánh trên repository: {project.sourceUrl}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={loading || (activeTab === 'ZIP' && !file)}
                  onClick={handleCreateDraft}
                  className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Tải lên & Phân tích khác biệt AST
                </button>
              </div>
            </div>
          ) : (
            /* Bước 2, 3, 4: Đã có bản nháp update */
            <div className="space-y-6">
              {/* Tóm tắt AST Diff & Impact */}
              {impactSummary && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-border-default bg-neutral-secondary-soft p-3">
                    <p className="text-xs text-body-subtle">Method thay đổi</p>
                    <p className="text-xl font-bold text-heading">{impactSummary.totalChangedMethods}</p>
                    <div className="mt-1 flex gap-2 text-[10px] text-body-subtle">
                      <span className="text-emerald-500">+{impactSummary.addedMethodsCount} thêm</span>
                      <span className="text-amber-500">~{impactSummary.modifiedMethodsCount} sửa</span>
                      <span className="text-rose-500">-{impactSummary.deletedMethodsCount} xóa</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border-default bg-neutral-secondary-soft p-3">
                    <p className="text-xs text-body-subtle">Quy tắc (BR) ảnh hưởng</p>
                    <p className="text-xl font-bold text-heading">{impactSummary.affectedBusinessRuleIds?.length ?? 0}</p>
                    <p className="mt-1 text-[10px] text-body-subtle">Cần sinh / cập nhật</p>
                  </div>
                  <div className="rounded-lg border border-border-default bg-neutral-secondary-soft p-3">
                    <p className="text-xs text-body-subtle">Test Plan ảnh hưởng</p>
                    <p className="text-xl font-bold text-heading">{impactSummary.affectedTestPlanIds?.length ?? 0}</p>
                    <p className="mt-1 text-[10px] text-body-subtle">Kế hoạch kiểm thử</p>
                  </div>
                  <div className="rounded-lg border border-border-default bg-neutral-secondary-soft p-3">
                    <p className="text-xs text-body-subtle">Test Case / Unit Test</p>
                    <p className="text-xl font-bold text-heading">
                      {(impactSummary.affectedTestCaseIds?.length ?? 0) + (impactSummary.affectedUnitTestIds?.length ?? 0)}
                    </p>
                    <p className="mt-1 text-[10px] text-body-subtle">Các ca & mã test</p>
                  </div>
                </div>
              )}

              {/* Danh sách Changed Methods Diff (Chỉ hiển thị Service) */}
              {(() => {
                const serviceMethods = (impactSummary?.changedMethods || []).filter((m: MethodDiffItem) => {
                  if (!m.isServiceMethod) return false;
                  if (!servicePath) return true;
                  if (m.servicePath) return m.servicePath === servicePath;
                  return true;
                });
                if (serviceMethods.length === 0) return null;
                return (
                  <div className="rounded-lg border border-border-default bg-neutral-secondary-soft/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-body-subtle">
                        Danh sách phương thức Service thay đổi {servicePath ? `(${servicePath})` : ''} (AST Diff)
                      </h3>
                      <span className="text-[11px] text-body-subtle">
                        Nhấp vào phương thức để xem chi tiết mã nguồn trước / sau
                      </span>
                    </div>
                    <div className="space-y-2">
                      {serviceMethods.map((m: MethodDiffItem) => {
                        const isExpanded = expandedDiffMethodKey === m.methodKey;
                        const hasSource = Boolean(m.beforeSource || m.afterSource);

                      return (
                        <div
                          key={m.methodKey}
                          className={`rounded-md border transition-colors ${
                            m.diffType === 'ADDED'
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : m.diffType === 'MODIFIED'
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-rose-500/30 bg-rose-500/5'
                          } p-3 text-xs`}
                        >
                          <div
                            className={`flex items-center justify-between gap-2 ${hasSource ? 'cursor-pointer select-none' : ''}`}
                            onClick={() => hasSource && setExpandedDiffMethodKey(isExpanded ? null : m.methodKey)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                    m.diffType === 'ADDED'
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : m.diffType === 'MODIFIED'
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {m.diffType === 'ADDED' && '+ THÊM MỚI'}
                                  {m.diffType === 'MODIFIED' && '~ ĐÃ SỬA'}
                                  {m.diffType === 'DELETED' && '- ĐÃ XÓA'}
                                </span>
                                <span className="font-mono font-semibold text-heading truncate">{m.signature}</span>
                                {m.isServiceMethod && (
                                  <span className="rounded bg-brand/10 px-1.5 py-0.2 text-[9px] font-medium text-brand">
                                    Service
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-body-subtle">
                                <span className="font-medium text-heading">{m.qualifiedClassName}</span> · {m.reason}
                              </p>
                            </div>

                            {hasSource && (
                              <button
                                type="button"
                                className="rounded p-1 text-body-subtle hover:bg-neutral-secondary-soft"
                                aria-label={isExpanded ? 'Thu gọn diff' : 'Mở rộng diff'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </div>

                          {/* Chi tiết Before/After Source Code */}
                          {isExpanded && (
                            <div className="mt-3 space-y-2 border-t border-border-default pt-3">
                              {m.diffType === 'MODIFIED' && (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  {m.beforeSource && (
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold text-rose-500">Mã nguồn ban đầu (Before):</p>
                                      <pre className="max-h-52 overflow-x-auto rounded border border-rose-500/20 bg-rose-500/5 p-2 font-mono text-[11px] text-rose-700 dark:text-rose-300">
                                        <code>{m.beforeSource}</code>
                                      </pre>
                                    </div>
                                  )}
                                  {m.afterSource && (
                                    <div>
                                      <p className="mb-1 text-[10px] font-bold text-emerald-500">Mã nguồn mới cập nhật (After):</p>
                                      <pre className="max-h-52 overflow-x-auto rounded border border-emerald-500/20 bg-emerald-500/5 p-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                                        <code>{m.afterSource}</code>
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}

                              {m.diffType === 'ADDED' && m.afterSource && (
                                <div>
                                  <p className="mb-1 text-[10px] font-bold text-emerald-500">Mã nguồn phương thức mới thêm:</p>
                                  <pre className="max-h-52 overflow-x-auto rounded border border-emerald-500/20 bg-emerald-500/5 p-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                                    <code>{m.afterSource}</code>
                                  </pre>
                                </div>
                              )}

                              {m.diffType === 'DELETED' && m.beforeSource && (
                                <div>
                                  <p className="mb-1 text-[10px] font-bold text-rose-500">Mã nguồn phương thức đã bị xóa:</p>
                                  <pre className="max-h-52 overflow-x-auto rounded border border-rose-500/20 bg-rose-500/5 p-2 font-mono text-[11px] text-rose-700 dark:text-rose-300 opacity-80">
                                    <code>{m.beforeSource}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {/* Action Toolbar Sinh tăng dần */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/20 bg-brand/5 p-4">
                <div>
                  <h4 className="text-sm font-bold text-heading flex items-center gap-1.5">
                    <Sparkles size={16} className="text-brand" />
                    Sinh Tăng Dần Bằng AI (Selective Generation)
                  </h4>
                  <p className="text-xs text-body-subtle">
                    Chỉ gọi LLM sinh cho các method và artifacts bị ảnh hưởng, giữ nguyên toàn bộ artifacts khác.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loading || generatingStage !== null}
                    onClick={() => handleGenerateStage('BUSINESS_RULE')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      completedStages['BUSINESS_RULE']
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border-default bg-neutral-primary-soft text-heading hover:bg-neutral-secondary-soft'
                    }`}
                  >
                    {generatingStage === 'BUSINESS_RULE' ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                    {completedStages['BUSINESS_RULE'] ? '✓ Đã sinh BR' : '1. Sinh BR'}
                  </button>
                  <button
                    type="button"
                    disabled={loading || generatingStage !== null}
                    onClick={() => handleGenerateStage('TEST_PLAN')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      completedStages['TEST_PLAN']
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border-default bg-neutral-primary-soft text-heading hover:bg-neutral-secondary-soft'
                    }`}
                  >
                    {generatingStage === 'TEST_PLAN' ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                    {completedStages['TEST_PLAN'] ? '✓ Đã sinh Test Plan' : '2. Sinh Test Plan'}
                  </button>
                  <button
                    type="button"
                    disabled={loading || generatingStage !== null}
                    onClick={() => handleGenerateStage('TEST_CASE')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      completedStages['TEST_CASE']
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border-default bg-neutral-primary-soft text-heading hover:bg-neutral-secondary-soft'
                    }`}
                  >
                    {generatingStage === 'TEST_CASE' ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                    {completedStages['TEST_CASE'] ? '✓ Đã sinh Test Case' : '3. Sinh Test Case'}
                  </button>
                  <button
                    type="button"
                    disabled={loading || generatingStage !== null}
                    onClick={() => handleGenerateStage('UNIT_TEST')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      completedStages['UNIT_TEST']
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-border-default bg-neutral-primary-soft text-heading hover:bg-neutral-secondary-soft'
                    }`}
                  >
                    {generatingStage === 'UNIT_TEST' ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                    {completedStages['UNIT_TEST'] ? '✓ Đã sinh Unit Test' : '4. Sinh Unit Test'}
                  </button>
                  <button
                    type="button"
                    disabled={loading || generatingStage !== null}
                    onClick={handleGenerateAll}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand/90"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Sinh Tất Cả
                  </button>
                </div>
              </div>

              {/* Thông báo kết quả sinh AI */}
              {stageNotice && (
                <div
                  className={`flex items-start justify-between gap-3 rounded-lg border p-3.5 text-xs animate-fade-in ${
                    stageNotice.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {stageNotice.type === 'success' ? (
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <div>
                      <p className="font-semibold">{stageNotice.message}</p>
                      <p className="mt-0.5 text-[11px] opacity-80">Thời gian: {stageNotice.timestamp}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStageNotice(null)}
                    className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Đóng thông báo"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Danh sách các đề xuất thay đổi (Source Update Items) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-heading flex items-center gap-2">
                    <span>Các Đề Xuất Cập Nhật Đang Chờ Duyệt ({updateDraft.items?.length ?? 0})</span>
                    <span className="text-xs font-normal text-body-subtle">
                      (Bản nháp: <span className="font-semibold text-brand">{updateDraft.status}</span>)
                    </span>
                  </h3>
                  {updateDraft.items && updateDraft.items.some((i) => i.reviewStatus !== 'ACCEPTED') && (
                    <button
                      type="button"
                      disabled={isBusy()}
                      onClick={handleAcceptAllItems}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      <CheckCircle2 size={13} />
                      Chấp nhận tất cả đề xuất
                    </button>
                  )}
                </div>

                {updateDraft.items?.length === 0 ? (
                  <p className="rounded-lg border border-border-default p-4 text-center text-xs text-body-subtle">
                    Chưa có đề xuất nào. Bấm nút "Sinh Tăng Dần" ở trên để AI tạo các đề xuất mới.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {updateDraft.items.map((item: SourceUpdateItemDto) => {
                      const isExpanded = expandedItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border-default bg-neutral-primary-soft p-3.5 shadow-xs transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-neutral-secondary-soft px-2 py-0.5 font-mono text-[11px] font-bold text-body">
                                {item.targetType}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                  item.action === 'CREATE'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : item.action === 'UPDATE'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : item.action === 'REMOVE'
                                    ? 'bg-rose-500/10 text-rose-500'
                                    : 'bg-neutral-secondary-soft text-body-subtle'
                                }`}
                              >
                                {item.action}
                              </span>
                              <span className="text-xs text-body">{item.reason || item.targetKey || `ID #${item.targetId}`}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.reviewStatus === 'ACCEPTED'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : item.reviewStatus === 'REJECTED'
                                    ? 'bg-rose-500/10 text-rose-500'
                                    : 'bg-neutral-secondary-soft text-body-subtle'
                                }`}
                              >
                                {item.reviewStatus}
                              </span>

                              <button
                                type="button"
                                disabled={isBusy()}
                                onClick={() => handlePatchItem(item.id, 'ACCEPTED')}
                                title="Chấp nhận đề xuất này"
                                className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy()}
                                onClick={() => handlePatchItem(item.id, 'REJECTED')}
                                title="Từ chối đề xuất này"
                                className="rounded p-1 text-rose-500 hover:bg-rose-500/10"
                              >
                                <XCircle size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                className="rounded p-1 text-body-subtle hover:bg-neutral-secondary-soft"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {isExpanded && item.afterData && (
                            <div className="mt-3 border-t border-border-default pt-3">
                              <p className="mb-1 text-[11px] font-semibold text-body-subtle">Nội dung đề xuất (JSON / Source):</p>
                              <pre className="max-h-48 overflow-x-auto rounded bg-neutral-secondary-soft p-2 font-mono text-[11px] text-heading">
                                {item.afterData}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border-default px-6 py-4">
          <button
            type="button"
            onClick={handleCancelDraft}
            className="rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-body hover:bg-neutral-secondary-soft"
          >
            {updateDraft ? 'Hủy bản nháp' : 'Đóng'}
          </button>

          {updateDraft && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isBusy()}
                onClick={() => handleAnalyze(updateDraft.id)}
                className="flex items-center gap-1.5 rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-body hover:bg-neutral-secondary-soft"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Phân tích lại
              </button>
              <button
                type="button"
                disabled={isBusy() || !canApply}
                onClick={handleApply}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Áp Dụng Cập Nhật Vào Project (Apply)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
