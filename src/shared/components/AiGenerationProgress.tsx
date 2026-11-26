import { IconButton } from './IconButton';
import { Tag } from './Tag';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Pause,
  Play,
  Zap,
  Terminal,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/language';
import { ConfirmDialog } from './ConfirmDialog';
import type { GenerationProgress, GenerationProgressStepStatus } from '../types/generation-progress';

interface AiGenerationProgressProps {
  active: boolean;
  label: string;
  progress?: GenerationProgress;
  projectId?: number;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

/** Parse và format thời gian timestamp dạng HH:mm:ss. */
function formatLogTime(timestamp?: string): string {
  if (!timestamp) return '';
  try {
    const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(timestamp);
    const date = new Date(hasTimezone ? timestamp : `${timestamp}Z`);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '';
  }
}

/** Chuyển đổi timestamp sang milliseconds để tính toán khoảng thời gian. */
function parseLogTimestamp(timestamp?: string): number | null {
  if (!timestamp) return null;
  try {
    const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(timestamp);
    const date = new Date(hasTimezone ? timestamp : `${timestamp}Z`);
    const time = date.getTime();
    return isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

/** Định dạng thời lượng thực thi của AI (giây -> Xs hoặc Xm Ys). */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/** Chuyển đổi các thông điệp log kỹ thuật/testability thô sang câu thông báo ngắn gọn, dễ hiểu cho người dùng */
export function formatHumanLogMessage(message: string): string {
  if (!message) return message;

  // Pattern 1: "Testability method 16759: UNKNOWN / READY / BLOCKED — ..."
  const rawMethodMatch = message.match(/^Testability\s+method\s+(\d+):\s*([A-Z_]+)\s*—\s*(.+)$/i);
  if (rawMethodMatch) {
    const [, methodId, status, rawEvidence] = rawMethodMatch;

    // Trích xuất method name nếu có
    const methodNameMatch = rawEvidence.match(/(?:.*[\\/])?[A-Za-z0-9_]+\.java:\d+\s+([A-Za-z0-9_]+)/);
    const methodName = methodNameMatch?.[1];
    const target = methodName || `Method #${methodId}`;

    let summary = 'Cần lưu ý cấu trúc mã nguồn.';
    if (rawEvidence.includes('UNCONTROLLED_RANDOM')) {
      summary = 'Chứa nhánh ngẫu nhiên không điều khiển được.';
    } else if (rawEvidence.includes('COLLECTION_MUTATION')) {
      summary = 'Có sửa đổi collection nội bộ.';
    } else if (rawEvidence.includes('UNRESOLVED_HELPER_PATH')) {
      summary = 'Có lời gọi helper nội bộ cần kiểm tra.';
    } else if (rawEvidence.includes('UNCONTROLLED_TIME') || rawEvidence.includes('NONDETERMINISM')) {
      summary = 'Dùng thời gian hoặc ngẫu nhiên nội bộ.';
    } else if (rawEvidence.includes('INTERNAL_FINAL')) {
      summary = 'Collaborator final khởi tạo nội bộ.';
    }

    const tag = status.toUpperCase() === 'BLOCKED' ? '[Cảnh báo]' : '[Lưu ý]';
    return `${tag} ${target}: ${summary}`;
  }

  // Pattern 2: "Testability TC-40 (40): BLOCKED: UNCONTROLLED_RANDOM_BRANCH @ path:line execute — ..."
  const rawCaseMatch = message.match(/^Testability\s+([A-Za-z0-9_-]+)\s*\(([^)]+)\):\s*(.+)$/i);
  if (rawCaseMatch) {
    const [, caseCode, , rawDetails] = rawCaseMatch;
    let summary = 'Chưa đủ điều kiện sinh test tự động.';
    if (rawDetails.includes('Math.random') || rawDetails.includes('RANDOM')) {
      summary = 'Nhánh Math.random() không thể điều khiển tự động.';
    } else if (rawDetails.includes('COLLECTION')) {
      summary = 'Collection fixture bị sửa đổi trực tiếp.';
    }
    return `[Cảnh báo] Tạm bỏ qua ca kiểm thử ${caseCode}: ${summary}`;
  }

  // Chuẩn hóa và rút gọn nếu log đã có tiền tố dài [Lưu ý kiểm thử] hoặc [Cảnh báo kiểm thử]
  if (message.startsWith('[Lưu ý kiểm thử]') || message.startsWith('[Cảnh báo kiểm thử]')) {
    const beforePipe = message.split('|')[0].trim();
    return beforePipe
      .replace(/^\[Lưu ý kiểm thử\]/, '[Lưu ý]')
      .replace(/^\[Cảnh báo kiểm thử\]/, '[Cảnh báo]');
  }

  // Lược bỏ các đoạn context dump AST nội bộ của JavaParser (MethodCallExprContext{...}, Context{wrapped=...)
  if (/[A-Za-z0-9_]*Context\{wrapped=/i.test(message)) {
    message = message.replace(/\s*[A-Za-z0-9_]*Context\{wrapped=[\s\S]*$/i, '').trim();
  }

  return message;
}

/** Lọc bỏ các thông điệp kỹ thuật/nội bộ (cảnh báo testability, helper, collection nội bộ...) để nhật ký dễ hiểu cho người dùng */
export function isUserFacingLog(message: string): boolean {
  if (!message || !message.trim()) return false;
  const humanized = formatHumanLogMessage(message);
  const lower = humanized.toLowerCase();

  // Bỏ qua các cảnh báo / lưu ý phân tích tĩnh mã nguồn, testability, helper nội bộ
  if (
    humanized.startsWith('[Lưu ý') ||
    humanized.startsWith('[Cảnh báo') ||
    lower.startsWith('testability') ||
    lower.includes('helper nội bộ') ||
    lower.includes('collection nội bộ') ||
    lower.includes('nhánh ngẫu nhiên') ||
    lower.includes('collaborator final') ||
    lower.includes('cấu trúc mã nguồn khi sinh test') ||
    lower.includes('cần lưu ý cấu trúc mã nguồn') ||
    lower.includes('chưa đủ điều kiện sinh test') ||
    lower.includes('chưa đủ điều kiện sinh unit test') ||
    lower.includes('đang đối chiếu setup mock') ||
    lower.includes('chưa đạt kiểm tra nội dung') ||
    lower.includes('chưa khớp bằng chứng source') ||
    lower.includes('chưa đúng schema') ||
    lower.includes('còn thiếu nhánh hoặc chưa khớp source') ||
    lower.includes('ngân sách retry tinh chỉnh context')
  ) {
    return false;
  }
  return true;
}

/** Tùy biến màu chữ thông điệp log phù hợp theo ngữ cảnh (thành công, lỗi, cảnh báo/lưu ý, đang xử lý) */
export function getLogMessageColor(message: string): string {
  const lower = message.toLowerCase();
  // 1. Ưu tiên kiểm tra lỗi trước: log lỗi (thất bại, dừng ở batch, quota...) luôn phải hiển thị màu đỏ
  if (
    lower.includes('thất bại') ||
    lower.includes('lỗi') ||
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('failure') ||
    lower.includes('exception') ||
    lower.includes('dừng ở batch') ||
    lower.includes('hết số lần thử') ||
    lower.includes('quota')
  ) {
    return 'text-fg-danger-strong font-medium';
  }
  // 2. Cảnh báo / hoàn tất một phần / testability hiển thị màu cam/hổ phách (phải kiểm tra trước hoàn thành/hoàn tất)
  if (
    lower.includes('hoàn tất một phần') ||
    lower.includes('partially') ||
    lower.includes('cảnh báo') ||
    lower.includes('lưu ý') ||
    lower.includes('testability') ||
    lower.includes('khả năng kiểm thử') ||
    lower.includes('bị chặn') ||
    lower.includes('tạm bỏ qua') ||
    lower.includes('warning') ||
    lower.includes('blocked') ||
    lower.includes('chưa cover đủ')
  ) {
    return 'text-fg-warning font-medium';
  }
  // 3. Các thông điệp hoàn thành/thành công có màu xanh lá nổi bật ở tất cả các giao diện AI sinh
  if (
    lower.includes('hoàn thành') ||
    lower.includes('hoàn tất') ||
    lower.includes('thành công') ||
    lower.includes('đã sinh') ||
    lower.includes('đã lưu') ||
    lower.includes('hợp lệ') ||
    lower.includes('completed') ||
    lower.includes('success')
  ) {
    return 'text-fg-success-strong font-medium';
  }
  if (
    lower.includes('đang gọi ai') ||
    lower.includes('gọi ai agent') ||
    lower.includes('đang xử lý') ||
    lower.includes('đang phân tích') ||
    lower.includes('đang kiểm tra') ||
    lower.includes('đang gửi')
  ) {
    return 'text-fg-brand-strong font-medium';
  }
  return 'text-heading';
}

const STORAGE_DISMISSED_PREFIX = 'greytest:ai-progress:dismissed:';
const STORAGE_MINIMIZED_PREFIX = 'greytest:ai-progress:minimized:';
const STORAGE_LATEST_PREFIX = 'greytest:ai-progress:latest:';

function getStorageItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

function removeStorageItem(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage quota or access errors
  }
}

export function getProgressRunKey(progress?: GenerationProgress | null): string {
  if (!progress || progress.status === 'IDLE') return '';
  const stage = progress.stage || 'UNKNOWN';
  const firstLog = progress.logs?.[0]?.timestamp || '';
  const totalSteps = progress.totalSteps || 0;
  return `${stage}_${firstLog}_${totalSteps}`;
}

/** Hiển thị tiến độ sinh AI qua widget nổi ở góc dưới bên phải, giữ nguyên log khi xong hoặc lỗi. */
export function AiGenerationProgress({
  active,
  label,
  progress,
  projectId,
  onResume,
  onPause,
  onCancel,
}: AiGenerationProgressProps) {
  const { t } = useLanguage();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const storageScope = projectId != null ? String(projectId) : 'global';
  const dismissedStorageKey = `${STORAGE_DISMISSED_PREFIX}${storageScope}`;
  const minimizedStorageKey = `${STORAGE_MINIMIZED_PREFIX}${storageScope}`;
  const latestStorageKey = `${STORAGE_LATEST_PREFIX}${storageScope}`;

  // Giữ lại tiến trình mới nhất để dù hoàn thành hay thất bại vẫn giữ nguyên log trên màn hình
  const [persistedProgress, setPersistedProgress] = useState<GenerationProgress | undefined>(() => {
    if (progress && progress.status !== 'IDLE') return progress;
    const cached = getStorageItem(latestStorageKey);
    if (cached) {
      try {
        return JSON.parse(cached) as GenerationProgress;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });

  useEffect(() => {
    if (progress && progress.status !== 'IDLE' && (progress.logs?.length ?? 0) > 0) {
      setPersistedProgress(progress);
      setStorageItem(latestStorageKey, JSON.stringify(progress));
    }
  }, [progress, latestStorageKey]);

  const currentProgress = (progress && progress.status !== 'IDLE') ? progress : persistedProgress;
  const percent = Math.min(Math.max(currentProgress?.percent ?? 0, 0), currentProgress?.status === 'PARTIAL' ? 99 : 100);
  const hasDeterminateProgress = Boolean(currentProgress && currentProgress.totalSteps > 0);

  const isCompleted = currentProgress?.status === 'COMPLETED';
  const isPartial = currentProgress?.status === 'PARTIAL';
  const isFailed = currentProgress?.status === 'FAILED';
  const isQueued = currentProgress?.status === 'QUEUED';
  const isPaused = currentProgress?.status === 'PAUSED';
  const isDraining = isPaused && Boolean(currentProgress?.busy);
  const isRunning = !isCompleted && !isPartial && !isFailed && !isPaused
    && (active || isQueued || currentProgress?.status === 'RUNNING');

  const runKey = getProgressRunKey(currentProgress);
  const firstLogTimestamp = currentProgress?.logs[0]?.timestamp;
  const expansionRunKey = currentProgress && firstLogTimestamp ? `${currentProgress.stage}_${firstLogTimestamp}` : '';

  const [floatingDismissed, setFloatingDismissed] = useState<boolean>(() => {
    if (!runKey) return false;
    const dismissedKey = getStorageItem(dismissedStorageKey);
    return dismissedKey === runKey;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return !expansionRunKey || getStorageItem(minimizedStorageKey) !== expansionRunKey;
  });
  const previousExpansionScope = useRef(minimizedStorageKey);
  const previousExpansionRun = useRef(expansionRunKey);

  // Giữ lựa chọn khi log đầu tiên tới, rồi lưu theo lượt chạy để lần sinh mới mặc định thu nhỏ.
  useEffect(() => {
    const sameScope = previousExpansionScope.current === minimizedStorageKey;
    if (sameScope && previousExpansionRun.current === expansionRunKey) return;
    const wasWaitingForFirstLog = !previousExpansionRun.current;
    previousExpansionScope.current = minimizedStorageKey;
    previousExpansionRun.current = expansionRunKey;

    if (sameScope && wasWaitingForFirstLog && expansionRunKey && !isMinimized) {
      setStorageItem(minimizedStorageKey, expansionRunKey);
      return;
    }
    setIsMinimized(!expansionRunKey || getStorageItem(minimizedStorageKey) !== expansionRunKey);
  }, [minimizedStorageKey, expansionRunKey, isMinimized]);

  const prevActiveRef = useRef(active);
  const lastActiveRunKeyRef = useRef<string | null>(null);

  // Đồng bộ trạng thái đã ẩn khi runKey được cập nhật hoặc mount từ cache
  useEffect(() => {
    if (runKey) {
      const dismissedKey = getStorageItem(dismissedStorageKey);
      if (dismissedKey === runKey) {
        setFloatingDismissed(true);
      }
    }
  }, [runKey, dismissedStorageKey]);

  // Khi người dùng bấm kích hoạt sinh mới (active chuyển từ false -> true): tự động mở lại widget và xóa cờ ẩn
  useEffect(() => {
    const isNewActiveTrigger = !prevActiveRef.current && active;
    prevActiveRef.current = active;

    if (isNewActiveTrigger) {
      removeStorageItem(dismissedStorageKey);
      setFloatingDismissed(false);
    } else if (isRunning && runKey && getStorageItem(dismissedStorageKey) !== runKey && lastActiveRunKeyRef.current !== runKey) {
      lastActiveRunKeyRef.current = runKey;
      setFloatingDismissed(false);
    }
  }, [active, isRunning, runKey, dismissedStorageKey]);

  const handleDismiss = () => {
    setFloatingDismissed(true);
    if (runKey) {
      setStorageItem(dismissedStorageKey, runKey);
    } else {
      setStorageItem(dismissedStorageKey, 'dismissed');
    }
  };

  const handleRestore = () => {
    removeStorageItem(dismissedStorageKey);
    setFloatingDismissed(false);
  };

  const handleToggleMinimize = () => {
    if (isMinimized && expansionRunKey) setStorageItem(minimizedStorageKey, expansionRunKey);
    else removeStorageItem(minimizedStorageKey);
    setIsMinimized(!isMinimized);
  };

  const visibleLogs = useMemo(() => {
    return (currentProgress?.logs || []).filter((log) => isUserFacingLog(log.message));
  }, [currentProgress?.logs]);

  const hasProgress = Boolean(
    active || (currentProgress && currentProgress.status && currentProgress.status !== 'IDLE')
  );

  const latestLog = visibleLogs.length > 0
    ? visibleLogs[visibleLogs.length - 1]
    : null;
  const latestTime = formatLogTime(latestLog?.timestamp);

  const [now, setNow] = useState<number>(Date.now());
  const sessionStartRef = useRef<number | null>(null);

  // Cập nhật timer thời gian thực trong khi tác vụ AI đang chạy
  useEffect(() => {
    if (isRunning) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = Date.now();
      }
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    } else if (!hasProgress) {
      sessionStartRef.current = null;
    }
  }, [isRunning, hasProgress]);

  // Tính toán thời gian làm việc của AI (start -> end hoặc start -> now)
  const startTimeMs = parseLogTimestamp(currentProgress?.logs?.[0]?.timestamp) ?? sessionStartRef.current;
  const endTimeMs = (isCompleted || isPartial || isFailed)
    ? (parseLogTimestamp(currentProgress?.logs?.[currentProgress.logs.length - 1]?.timestamp) ?? now)
    : now;

  const executionSeconds = startTimeMs ? Math.max(0, Math.round((endTimeMs - startTimeMs) / 1000)) : 0;
  const metrics = currentProgress?.runMetrics;
  const executionTimeText = metrics
    ? `${(metrics.elapsedMillis / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`
    : startTimeMs ? formatDuration(executionSeconds) : (latestTime || '');

  const currentMessage = latestLog
    ? formatHumanLogMessage(latestLog.message)
    : currentProgress?.steps.find((s) => s.status === 'RUNNING')?.label
    || (isPartial
      ? t('Hoàn tất một phần. Một số Test Case chưa có Unit Test.', 'Partially completed. Some test cases have no unit test.')
      : isPaused
      ? (isDraining
        ? t('Đang tạm dừng tác vụ: chờ lưu nốt các batch đang xử lý...', 'Pausing task: finishing in-flight batches...')
        : t('Tác vụ đã tạm dừng. Các batch đã sinh được lưu an toàn.', 'Task paused. Generated batches are safely saved.'))
      : isQueued
        ? t('Tác vụ đã vào hàng đợi và sẽ tự chạy nền.', 'Task is queued and running in background.')
        : isCompleted
          ? t('Tác vụ hoàn thành thành công.', 'Task completed successfully.')
          : isFailed
            ? t('Tác vụ thất bại.', 'Task failed.')
            : t('Đang xử lý...', 'Processing...'));

  const announcement = (
    <span role="status" aria-live="polite" className="sr-only">
      {isPartial
        ? `${label}: ${t('hoàn tất một phần', 'partially completed')} ${percent}%`
        : isPaused
        ? `${label}: ${t('đã tạm dừng', 'paused')} ${percent}%`
        : isFailed
          ? `${label}: ${t('thất bại', 'failed')} ${percent}%`
          : isCompleted
            ? `${label}: ${t('hoàn tất', 'completed')} 100%`
            : isQueued
              ? `${label}: ${t('đang chờ worker xử lý', 'queued for processing')}`
            : isRunning
              ? hasDeterminateProgress
            ? `${label}: ${percent}%`
            : `${label}: ${t('Đang lấy dữ liệu tiến độ', 'Retrieving progress')}`
              : ''}
    </span>
  );

  // Portal giữ vị trí theo viewport kể cả khi panel cha có animation dùng transform.
  return createPortal(
    <>
      {announcement}

      {/* Ghim góc dưới phải, cuộn nội dung trong khung khi nhật ký dài. */}
      {hasProgress && !floatingDismissed && (
        <aside
          role="complementary"
          aria-label={t('Tiến trình AI đang chạy', 'Running AI progress')}
          className={`fixed bottom-4 right-4 z-[60] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex flex-col rounded-base border border-border-default bg-neutral-primary-soft text-body shadow-2xl transition-colors duration-300 overflow-hidden ${
            isMinimized ? 'h-auto w-80' : 'w-[420px] h-[min(640px,calc(100dvh-2rem))]'
          }`}
        >
          {/* Header thanh lịch - nền đặc */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default-subtle bg-neutral-secondary-soft px-3 py-2 shrink-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-control bg-neutral-primary border border-border-default shrink-0 font-mono">
                {isCompleted ? (
                  <CheckCircle2 size={16} className="text-fg-success-strong" />
                ) : isPartial ? (
                  <AlertCircle size={16} className="text-fg-warning" />
                ) : isFailed ? (
                  <AlertCircle size={16} className="text-fg-danger-strong" />
                ) : isPaused ? (
                  <Pause size={16} className="text-fg-warning" />
                ) : isQueued ? (
                  <Clock3 size={16} className="text-fg-brand" />
                ) : (
                  <Loader2 size={16} className="animate-spin text-fg-brand" />
                )}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-heading" title={label}>
                  {t('Tiến trình AI', 'AI progress')}
                </span>
                {!isMinimized && <span className="text-xs text-body-subtle font-mono flex items-center gap-1.5">

                  {t('Nhật ký xử lý', 'Processing log')}
                </span>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isMinimized && isCompleted && (
                <Tag variant="status" tone={'success'} icon={Check}>
                  {t('Hoàn thành', 'Completed')}
                </Tag>
              )}
              {!isMinimized && isPartial && (
                <Tag variant="status" tone={'warning'} icon={AlertCircle}>
                  {t('Hoàn tất một phần', 'Partially completed')}
                </Tag>
              )}
              {!isMinimized && isFailed && (
                <Tag variant="status" tone={'danger'} icon={AlertCircle}>
                  {t('Thất bại', 'Failed')}
                </Tag>
              )}
              {!isMinimized && isPaused && (
                <Tag variant="status" tone={'warning'} icon={isDraining ? Loader2 : Pause}>
                  {isDraining ? t('Đang dừng...', 'Pausing...') : t('Đã tạm dừng', 'Paused')}
                </Tag>
              )}
              <Tag className="font-mono tabular-nums">
                {percent}%
              </Tag>
              <button
                type="button"
                className="rounded-control p-1.5 text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading transition-colors"
                title={isMinimized ? t('Mở rộng (Xem chi tiết log)', 'Expand (View log details)') : t('Thu nhỏ (Đưa xuống góc)', 'Minimize (Dock to corner)')}
                aria-label={isMinimized ? t('Mở rộng', 'Expand') : t('Thu nhỏ', 'Minimize')}
                onClick={handleToggleMinimize}
              >
                {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <IconButton icon={X} label={t('Đóng', 'Close')} title={t('Đóng (Ẩn log)', 'Close (Hide log)')} onClick={handleDismiss} />
            </div>
          </div>

          {/* Processing progress */}
          <div className="h-1 w-full bg-neutral-secondary overflow-hidden shrink-0">
            <span
              className={`block h-full transition-colors duration-300 ease-out ${
                isCompleted
                  ? 'bg-success'
                  : isFailed
                    ? 'bg-neutral-secondary-medium  '
                    : isPaused || isPartial
                      ? 'bg-neutral-secondary-medium  '
                      : 'bg-brand'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {isMinimized && latestLog && (
            <p className={`truncate px-3 py-1.5 text-xs ${getLogMessageColor(currentMessage)}`} title={currentMessage}>
              {currentMessage}
            </p>
          )}

          {/* Nội dung chi tiết - có thể thu gọn */}
          {!isMinimized && (
            <div className="p-3.5 space-y-3 bg-neutral-primary-soft flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Thông báo trạng thái mới nhất - nền đặc */}
              <div className="shrink-0 flex items-start justify-between gap-2.5 rounded-base bg-neutral-secondary p-3 border border-border-default-subtle overflow-hidden">
                <div className="flex-1 min-w-0 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                  <p className={`text-xs font-medium leading-relaxed break-words [overflow-wrap:anywhere] ${getLogMessageColor(currentMessage)}`}>
                    {currentMessage}
                  </p>
                  {isRunning && (onPause || onCancel) && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {onPause && (
                        <button
                          type="button"
                          onClick={onPause}
                          className="btn btn-secondary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pause size={13} />
                          <span>{t('Tạm dừng', 'Pause')}</span>
                        </button>
                      )}
                      {onCancel && (
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(true)}
                          className="btn btn-secondary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 cursor-pointer text-fg-danger-strong hover:bg-danger-soft"
                        >
                          <X size={13} />
                          <span>{t('Hủy sinh', 'Cancel generation')}</span>
                        </button>
                      )}
                    </div>
                  )}
                  {isPaused && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {onResume && (
                        <button
                          type="button"
                          onClick={onResume}
                          className="btn btn-secondary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play size={13} className="fill-current" />
                          <span className="font-semibold">{t('Tiếp tục sinh', 'Resume generation')}</span>
                        </button>
                      )}
                      {onCancel && (
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(true)}
                          className="btn btn-secondary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 cursor-pointer text-fg-danger-strong hover:bg-danger-soft"
                        >
                          <X size={13} />
                          <span>{t('Hủy sinh', 'Cancel generation')}</span>
                        </button>
                      )}
                      <span className="text-xs text-body-subtle">
                        {isDraining
                          ? t('(Đang lưu nốt batch dở dang; bấm Tiếp tục sinh thì tác vụ tự chạy khi lưu xong)', '(Finishing in-flight batches; Resume starts automatically once they are saved)')
                          : t('(Tiếp tục từ batch còn dang dở)', '(Resumes from pending batches)')}
                      </span>
                    </div>
                  )}
                  {isFailed && (/quota/i.test(currentMessage) || /hết quota/i.test(currentMessage)) && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('quota-exceeded'));
                          }
                        }}
                        className="btn !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 cursor-pointer font-semibold text-heading bg-neutral-secondary-medium"
                      >
                        <Zap size={13} className="text-fg-warning" />
                        <span>{t('Nâng cấp lên gói PRO', 'Upgrade to PRO')}</span>
                      </button>
                    </div>
                  )}
                </div>
                {executionTimeText && (
                  <Tag title={
                      isCompleted
                        ? t(`Thời gian từ 0% đến 100%: ${executionTimeText}`, `Time from 0% to 100%: ${executionTimeText}`)
                        : t(`Thời gian đã trôi qua: ${executionTimeText}`, `Elapsed time: ${executionTimeText}`)
                    } className="shrink-0 font-mono tabular-nums">
                    <Clock3 size={12} aria-hidden="true"  />
                    <span>{executionTimeText}</span>
                  </Tag>
                )}
              </div>

              {/* Danh sách các bước - nền đặc */}
              {currentProgress?.steps && currentProgress.steps.length > 0 && (
                <div className="shrink-0 rounded-base border border-border-default-subtle bg-neutral-secondary p-1.5 max-h-72 space-y-1 overflow-y-auto custom-scrollbar">
                  {currentProgress.steps.map((step) => (
                    <div
                      key={step.order}
                      className="flex items-start justify-between gap-2.5 text-xs px-2.5 py-1.5 border-t border-t-border-default-subtle transition-colors"
                      title={step.label}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <StepIcon status={step.status} />
                        <div className="min-w-0">
                          <span
                            className={`block truncate ${
                              step.status === 'RUNNING'
                                ? 'font-semibold text-fg-brand-strong'
                                : 'text-body'
                            }`}
                            title={step.label}
                          >
                            {step.label}
                          </span>
                          {step.status === 'FAILED' && step.errorMessage && (
                            <span className="mt-0.5 block whitespace-normal break-words [overflow-wrap:anywhere] text-xs font-normal leading-relaxed text-fg-danger-strong">
                              {step.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                      <Tag variant="status" tone={step.status === 'COMPLETED' ? 'success' : step.status === 'FAILED' ? 'danger' : step.status === 'RUNNING' ? 'brand' : 'neutral'} icon={step.status === 'RUNNING' ? Loader2 : step.status === 'COMPLETED' ? Check : step.status === 'FAILED' ? AlertCircle : Clock3}>
                        {stepStatusLabel(step.status, t)}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </aside>
      )}

      {/* Nút nhỏ ở góc dưới bên phải để mở lại log nếu người dùng đã lỡ tắt */}
      {hasProgress && floatingDismissed && (
        <button
          type="button"
          onClick={handleRestore}
          aria-label={t('Mở lại log AI', 'Reopen AI log')}
          title={t('Mở lại nhật ký AI', 'Reopen AI log')}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-control border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-xs font-medium text-heading hover:bg-neutral-secondary hover:shadow-lg transition-colors animate-fade-in hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-control bg-brand-soft text-heading font-mono">
            {isRunning ? (
              <Loader2 size={12} className="animate-spin text-fg-brand" />
            ) : isCompleted ? (
              <CheckCircle2 size={12} className="text-fg-success-strong" />
            ) : isPartial ? (
              <AlertCircle size={12} className="text-fg-warning" />
            ) : isFailed ? (
              <AlertCircle size={12} className="text-fg-danger-strong" />
            ) : isPaused ? (
              <Pause size={12} className="text-fg-warning" />
            ) : (
              <Terminal size={12} />
            )}
          </span>
          <span className="font-semibold text-xs text-heading">
            {t('Log AI', 'AI Log')}
          </span>
          {percent > 0 && (
            <Tag className="font-mono tabular-nums">
              {percent}%
            </Tag>
          )}
        </button>
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        title={t('Hủy tiến trình AI?', 'Cancel AI progress?')}
        description={t(
          'Tác vụ AI đang thực hiện sẽ bị hủy bỏ. Các batch đã lưu trước đó vẫn được giữ lại an toàn.',
          'The in-flight AI task will be cancelled. Any previously saved batches will be kept safely.'
        )}
        confirmLabel={t('Xác nhận hủy', 'Confirm cancel')}
        cancelLabel={t('Tiếp tục chạy', 'Keep running')}
        onConfirm={() => {
          setShowCancelConfirm(false);
          onCancel?.();
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </>, document.body
  );
}

function StepIcon({ status }: { status: GenerationProgressStepStatus }) {
  if (status === 'RUNNING') {
    return <Loader2 size={14} className="text-fg-brand animate-spin shrink-0" aria-hidden="true" />;
  }
  if (status === 'COMPLETED') {
    return <CheckCircle2 size={14} className="text-fg-success-strong shrink-0" aria-hidden="true" />;
  }
  if (status === 'FAILED') {
    return <AlertCircle size={14} className="text-fg-danger-strong shrink-0" aria-hidden="true" />;
  }
  return <Clock3 size={14} className="text-body-subtle shrink-0" aria-hidden="true" />;
}

function stepStatusLabel(
  status: GenerationProgressStepStatus,
  t: (vi: string, en: string) => string,
) {
  if (status === 'RUNNING') return t('Đang chạy', 'Running');
  if (status === 'COMPLETED') return t('Hoàn thành', 'Completed');
  if (status === 'FAILED') return t('Lỗi', 'Failed');
  return t('Đang chờ', 'Waiting');
}
