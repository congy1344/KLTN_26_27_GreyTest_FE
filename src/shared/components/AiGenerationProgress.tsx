import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Copy,
  Loader2,
  Pause,
  Play,
  Terminal,
  X,
} from 'lucide-react';
import { useLanguage } from '../i18n/language';
import type { GenerationProgress, GenerationProgressStepStatus } from '../types/generation-progress';

interface AiGenerationProgressProps {
  active: boolean;
  label: string;
  progress?: GenerationProgress;
  projectId?: number;
  onResume?: () => void;
}

const STEP_STYLES: Record<GenerationProgressStepStatus, string> = {
  WAITING: 'bg-neutral-secondary text-body-subtle border border-border-default-subtle',
  RUNNING: 'bg-brand-soft text-fg-brand-strong font-semibold border border-border-brand-subtle shadow-2xs',
  COMPLETED: 'bg-success-soft text-fg-success-strong font-semibold border border-border-success-subtle',
  FAILED: 'bg-danger-soft text-fg-danger-strong font-semibold border border-border-danger-subtle',
};

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

/** Parse và format thời gian timestamp dạng đầy đủ ngày giờ. */
function formatFullLogTime(timestamp?: string): string {
  if (!timestamp) return '';
  try {
    const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(timestamp);
    const date = new Date(hasTimezone ? timestamp : `${timestamp}Z`);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return timestamp;
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

/** Trích xuất danh sách các đối tượng (plan, method, rule, case) nằm trong dấu ngoặc đơn của message */
function extractLogItems(message: string): { label: string; items: string[] } | null {
  const match = message.match(/\(([^)]+)\)/);
  if (!match) return null;
  const inside = match[1].trim();
  const rawList = inside.split(',').map((s) => s.trim()).filter(Boolean);
  if (rawList.length === 0) return null;

  // Lọc bỏ chuỗi tóm tắt kiểu "+3 plan" nếu có
  const items = rawList.filter((item) => !/^\+\d+\s+/i.test(item));
  if (items.length === 0) return null;

  let label = 'Danh sách chi tiết';
  const lower = message.toLowerCase();
  if (lower.includes('test plan') || items.some((i) => i.startsWith('TP-'))) {
    label = 'Danh sách Test Plan';
  } else if (lower.includes('test case') || items.some((i) => i.startsWith('TC-'))) {
    label = 'Danh sách Test Case';
  } else if (lower.includes('business rule') || items.some((i) => i.startsWith('BR-'))) {
    label = 'Danh sách Business Rule';
  } else if (lower.includes('method') || items.some((i) => i.includes('()') || i.startsWith('Method#'))) {
    label = 'Danh sách Method';
  }

  return { label, items };
}

/** Hiển thị tóm tắt ngắn gọn ở dòng log thu gọn ngoài danh sách */
function formatCollapsedLogMessage(message: string): string {
  const match = message.match(/\(([^)]+)\)/);
  if (!match) return message;
  const inside = match[1].trim();
  const items = inside.split(',').map((s) => s.trim()).filter(Boolean);
  if (items.length <= 2) return message;

  const remaining = items.length - 2;
  const preview = `${items[0]}, ${items[1]} (+${remaining} chi tiết)`;
  return message.replace(`(${inside})`, `(${preview})`);
}

/** Tùy biến màu chữ thông điệp log phù hợp theo ngữ cảnh (thành công, lỗi, thông thường) */
function getLogMessageColor(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('hoàn tất') || lower.includes('thành công') || lower.includes('đã sinh') || lower.includes('hợp lệ')) {
    return 'text-fg-success-strong font-medium';
  }
  if (lower.includes('thất bại') || lower.includes('lỗi') || lower.includes('error') || lower.includes('failed')) {
    return 'text-fg-danger-strong font-medium';
  }
  if (lower.includes('đang gọi ai') || lower.includes('đang xử lý') || lower.includes('đang phân tích') || lower.includes('đang kiểm tra') || lower.includes('đang gửi')) {
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
}: AiGenerationProgressProps) {
  const { t } = useLanguage();
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
  const percent = Math.min(Math.max(currentProgress?.percent ?? 0, 0), 100);
  const hasDeterminateProgress = Boolean(currentProgress && currentProgress.totalSteps > 0);

  const isCompleted = currentProgress?.status === 'COMPLETED';
  const isFailed = currentProgress?.status === 'FAILED';
  const isQueued = currentProgress?.status === 'QUEUED';
  const isPaused = currentProgress?.status === 'PAUSED';
  const isRunning = !isCompleted && !isFailed && !isPaused
    && (active || isQueued || currentProgress?.status === 'RUNNING');

  const runKey = getProgressRunKey(currentProgress);

  const [floatingDismissed, setFloatingDismissed] = useState<boolean>(() => {
    if (!runKey) return false;
    const dismissedKey = getStorageItem(dismissedStorageKey);
    return dismissedKey === runKey;
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return getStorageItem(minimizedStorageKey) === 'true';
  });

  const [copied, setCopied] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});
  const [copiedLogIndex, setCopiedLogIndex] = useState<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const toggleLogExpand = (index: number) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopySingleLog = (message: string, index: number) => {
    navigator.clipboard.writeText(message).then(() => {
      setCopiedLogIndex(index);
      setTimeout(() => setCopiedLogIndex(null), 2000);
    });
  };

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
      setIsMinimized(false);
      setStorageItem(minimizedStorageKey, 'false');
    } else if (isRunning && runKey && getStorageItem(dismissedStorageKey) !== runKey && lastActiveRunKeyRef.current !== runKey) {
      lastActiveRunKeyRef.current = runKey;
      setFloatingDismissed(false);
    }
  }, [active, isRunning, runKey, dismissedStorageKey, minimizedStorageKey]);

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
    setIsMinimized(false);
    setStorageItem(minimizedStorageKey, 'false');
  };

  const handleToggleMinimize = () => {
    setIsMinimized((prev) => {
      const next = !prev;
      setStorageItem(minimizedStorageKey, String(next));
      return next;
    });
  };

  // Tự động cuộn xuống cuối khi có log mới
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [currentProgress?.logs]);

  const hasProgress = Boolean(
    active || (currentProgress && currentProgress.status && currentProgress.status !== 'IDLE')
  );

  // Khi mở rộng log widget, tự động thêm class để layout trang né sang trái nhường chỗ cho log
  useEffect(() => {
    const isDockOpen = hasProgress && !floatingDismissed && !isMinimized;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('ai-progress-dock-open', isDockOpen);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('ai-progress-dock-open');
      }
    };
  }, [hasProgress, floatingDismissed, isMinimized]);

  const latestLog = currentProgress?.logs && currentProgress.logs.length > 0
    ? currentProgress.logs[currentProgress.logs.length - 1]
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
  const endTimeMs = (isCompleted || isFailed)
    ? (parseLogTimestamp(currentProgress?.logs?.[currentProgress.logs.length - 1]?.timestamp) ?? now)
    : now;

  const executionSeconds = startTimeMs ? Math.max(0, Math.round((endTimeMs - startTimeMs) / 1000)) : 0;
  const executionTimeText = startTimeMs ? formatDuration(executionSeconds) : (latestTime || '');

  const currentMessage = latestLog
    ? latestLog.message
    : currentProgress?.steps.find((s) => s.status === 'RUNNING')?.label
    || (isPaused
      ? t('Tác vụ đã tạm dừng. Các batch đã sinh được lưu an toàn.', 'Task paused. Generated batches are safely saved.')
      : isQueued
        ? t('Tác vụ đã vào hàng đợi và sẽ tự chạy nền.', 'Task is queued and running in background.')
        : isCompleted
          ? t('Tác vụ hoàn thành thành công.', 'Task completed successfully.')
          : isFailed
            ? t('Tác vụ thất bại.', 'Task failed.')
            : t('Đang xử lý...', 'Processing...'));

  const handleCopyLogs = () => {
    if (!currentProgress?.logs || currentProgress.logs.length === 0) return;
    const text = currentProgress.logs
      .map((l) => `[${formatLogTime(l.timestamp)}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const announcement = (
    <span role="status" aria-live="polite" className="sr-only">
      {isPaused
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

  return (
    <>
      {announcement}

      {/* Floating dock hiển thị ở góc dưới bên phải; NỀN ĐẶC HOÀN TOÀN 100%, không trong suốt */}
      {hasProgress && !floatingDismissed && (
        <aside
          role="complementary"
          aria-label={t('Tiến trình AI đang chạy', 'Running AI progress')}
          className={`fixed bottom-5 right-5 z-50 w-[390px] sm:w-[450px] max-w-[calc(100vw-2.5rem)] flex flex-col rounded-2xl border border-border-default bg-neutral-primary-soft text-body shadow-2xl transition-all duration-300 animate-slide-in-up overflow-hidden ${
            isMinimized ? 'h-auto' : 'h-[min(720px,calc(100dvh-5.5rem))]'
          }`}
        >
          {/* Header thanh lịch - nền đặc */}
          <div className="flex items-center justify-between gap-3 border-b border-border-default-subtle bg-neutral-secondary-soft px-4 py-3 shrink-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-primary shadow-xs border border-border-default shrink-0">
                {isCompleted ? (
                  <CheckCircle2 size={16} className="text-fg-success-strong" />
                ) : isFailed ? (
                  <AlertCircle size={16} className="text-fg-danger-strong" />
                ) : isPaused ? (
                  <Pause size={16} className="text-amber-500" />
                ) : isQueued ? (
                  <Clock3 size={16} className="text-fg-brand" />
                ) : (
                  <Loader2 size={16} className="animate-spin text-fg-brand" />
                )}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-heading tracking-tight" title={label}>
                  {label}
                </span>
                <span className="text-[10px] text-body-subtle font-mono flex items-center gap-1.5">
                  {isRunning && <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-brand animate-pulse" />}
                  GreyTest AI Agent
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isCompleted && (
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[10px] font-semibold text-fg-success-strong border border-border-success-subtle">
                  {t('Hoàn thành', 'Completed')}
                </span>
              )}
              {isFailed && (
                <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[10px] font-semibold text-fg-danger-strong border border-border-danger-subtle">
                  {t('Thất bại', 'Failed')}
                </span>
              )}
              {isPaused && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-500 border border-amber-500/20">
                  {t('Đã tạm dừng', 'Paused')}
                </span>
              )}
              <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-bold text-fg-brand-strong border border-border-brand-subtle">
                {percent}%
              </span>
              <button
                type="button"
                className="rounded-lg p-1.5 text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading transition-colors"
                title={isMinimized ? t('Mở rộng (Xem chi tiết log)', 'Expand (View log details)') : t('Thu nhỏ (Đưa xuống góc)', 'Minimize (Dock to corner)')}
                aria-label={isMinimized ? t('Mở rộng', 'Expand') : t('Thu nhỏ', 'Minimize')}
                onClick={handleToggleMinimize}
              >
                {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-body-subtle hover:bg-danger-soft hover:text-fg-danger-strong transition-colors"
                title={t('Đóng (Ẩn log)', 'Close (Hide log)')}
                aria-label={t('Đóng', 'Close')}
                onClick={handleDismiss}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Sleek Gradient Progress bar */}
          <div className="h-1 w-full bg-neutral-secondary overflow-hidden shrink-0">
            <span
              className={`block h-full transition-[width] duration-300 ease-out ${
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : isFailed
                    ? 'bg-gradient-to-r from-rose-500 to-red-500'
                    : isPaused
                      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                      : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-pulse'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Nội dung chi tiết - có thể thu gọn */}
          {!isMinimized && (
            <div className="p-3.5 space-y-3 bg-neutral-primary-soft flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Thông báo trạng thái mới nhất - nền đặc */}
              <div className="shrink-0 flex items-start justify-between gap-2.5 rounded-xl bg-neutral-secondary p-3 border border-border-default-subtle">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-relaxed text-heading">
                    {currentMessage}
                  </p>
                  {isPaused && onResume && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onResume}
                        className="btn btn-brand !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Play size={13} className="fill-current text-white" />
                        <span className="text-white font-semibold">{t('Tiếp tục sinh', 'Resume generation')}</span>
                      </button>
                      <span className="text-[11px] text-body-subtle">
                        {t('(Tiếp tục từ batch còn dang dở)', '(Resumes from pending batches)')}
                      </span>
                    </div>
                  )}
                </div>
                {executionTimeText && (
                  <span
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-neutral-primary-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-body-subtle border border-border-default shadow-2xs"
                    title={
                      isCompleted
                        ? t(`Thời gian làm của AI: ${executionTimeText}`, `AI execution time: ${executionTimeText}`)
                        : t(`Thời gian AI đang làm: ${executionTimeText}`, `AI elapsed time: ${executionTimeText}`)
                    }
                  >
                    <Clock3 size={11} className="text-fg-brand opacity-80" />
                    <span>{executionTimeText}</span>
                  </span>
                )}
              </div>

              {/* Danh sách các bước - nền đặc */}
              {currentProgress?.steps && currentProgress.steps.length > 0 && (
                <div className="shrink-0 rounded-xl border border-border-default-subtle bg-neutral-secondary p-1.5 max-h-36 space-y-1 overflow-y-auto custom-scrollbar">
                  {currentProgress.steps.map((step) => (
                    <div
                      key={step.order}
                      className="flex items-center justify-between gap-2.5 text-[11px] rounded-lg px-2.5 py-1.5 bg-neutral-primary-soft border border-border-default-subtle shadow-2xs transition-colors"
                      title={step.label}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <StepIcon status={step.status} />
                        <span
                          className={`truncate ${
                            step.status === 'RUNNING'
                              ? 'font-semibold text-fg-brand-strong'
                              : 'text-body'
                          }`}
                          title={step.label}
                        >
                          {step.label}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          STEP_STYLES[step.status]
                        }`}
                      >
                        {stepStatusLabel(step.status, t)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Console Log Terminal tinh tế - nền đặc 100% */}
              {currentProgress?.logs && currentProgress.logs.length > 1 && (
                <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
                  <div className="shrink-0 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-body-subtle">
                      <Terminal size={13} className="text-fg-brand" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-body-subtle">
                        {t('Nhật ký xử lý', 'Execution Logs')}
                      </span>
                      <span className="text-[10px] rounded-full bg-neutral-secondary-medium px-1.5 py-0.2 font-mono font-semibold text-body">
                        {currentProgress.logs.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="flex items-center gap-1 text-[11px] font-medium text-body-subtle hover:text-heading transition-colors px-1.5 py-0.5 rounded hover:bg-neutral-secondary-medium"
                      title={t('Sao chép toàn bộ log', 'Copy all logs')}
                      onClick={handleCopyLogs}
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-fg-success-strong" />
                          <span className="text-fg-success-strong font-semibold">
                            {t('Đã chép', 'Copied')}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>{t('Sao chép', 'Copy')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div
                    ref={logContainerRef}
                    className="flex-1 min-h-[180px] overflow-y-auto rounded-xl bg-neutral-secondary border border-border-default p-2.5 font-mono text-[11px] space-y-1 shadow-inner custom-scrollbar"
                  >
                    {currentProgress.logs.map((log, index) => {
                      const isExpanded = Boolean(expandedLogs[index]);
                      const isLineCopied = copiedLogIndex === index;
                      return (
                        <div
                          key={`${log.timestamp}-${index}`}
                          className="group rounded-md border border-transparent transition-colors hover:border-border-default-subtle hover:bg-neutral-primary-soft overflow-hidden"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={() => toggleLogExpand(index)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggleLogExpand(index);
                              }
                            }}
                            className="flex cursor-pointer items-start gap-1.5 px-1.5 py-1 text-heading transition-colors leading-relaxed select-none"
                          >
                            <span className="shrink-0 font-mono text-[10px] text-body-subtle whitespace-nowrap pt-0.5 tracking-tight">
                              {formatLogTime(log.timestamp)}
                            </span>

                            <button
                              type="button"
                              aria-label={isExpanded ? t('Thu gọn', 'Collapse') : t('Mở rộng', 'Expand')}
                              className="shrink-0 text-body-subtle hover:text-heading transition-transform duration-200 pt-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLogExpand(index);
                              }}
                            >
                              <ChevronRight
                                size={12}
                                className={`transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90 text-fg-brand' : 'group-hover:text-heading'
                                }`}
                              />
                            </button>

                            <span className={`break-words flex-1 text-[11px] ${getLogMessageColor(log.message)}`}>
                              {formatCollapsedLogMessage(log.message)}
                            </span>
                          </div>

                          {/* Chi tiết log khi mở xuống */}
                          {isExpanded && (() => {
                            const details = extractLogItems(log.message);
                            return (
                              <div className="mx-1.5 mb-1.5 mt-0.5 rounded border border-border-default-subtle bg-neutral-secondary-soft p-2.5 text-[10px] space-y-2 animate-fade-in font-sans">
                                <div className="flex items-center justify-between text-body-subtle">
                                  <span className="font-mono text-[10px]">
                                    {formatFullLogTime(log.timestamp)}
                                  </span>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopySingleLog(log.message, index);
                                    }}
                                    title={t('Sao chép toàn bộ dòng log này', 'Copy this full log entry')}
                                  >
                                    {isLineCopied ? (
                                      <>
                                        <Check size={11} className="text-fg-success-strong" />
                                        <span className="text-fg-success-strong font-medium">
                                          {t('Đã chép', 'Copied')}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>{t('Sao chép', 'Copy')}</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Thông điệp hoàn chỉnh */}
                                <p className="font-mono text-[11px] text-heading whitespace-pre-wrap break-words leading-relaxed select-text bg-neutral-primary-soft p-2 rounded-md border border-border-default-subtle">
                                  {log.message}
                                </p>

                                {/* Danh sách chi tiết từng đối tượng cụ thể */}
                                {details && details.items.length > 0 && (
                                  <div className="space-y-1.5 pt-0.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-[11px] text-heading">
                                        {details.label} ({details.items.length}):
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-0.5">
                                      {details.items.map((item, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center rounded-md bg-neutral-primary px-2 py-0.5 font-mono text-[11px] font-semibold text-fg-brand-strong border border-border-default shadow-2xs select-text hover:border-border-brand-subtle transition-colors"
                                        >
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
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
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-xs font-medium text-heading shadow-md hover:bg-neutral-secondary hover:shadow-lg transition-all animate-fade-in hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-brand-soft text-fg-brand-strong">
            {isRunning ? (
              <Loader2 size={12} className="animate-spin text-fg-brand" />
            ) : isCompleted ? (
              <CheckCircle2 size={12} className="text-fg-success-strong" />
            ) : isFailed ? (
              <AlertCircle size={12} className="text-fg-danger-strong" />
            ) : isPaused ? (
              <Pause size={12} className="text-amber-500" />
            ) : (
              <Terminal size={12} />
            )}
          </span>
          <span className="font-semibold text-[11px] text-heading">
            {t('Log AI', 'AI Log')}
          </span>
          {percent > 0 && (
            <span className="rounded-md bg-neutral-secondary px-1.5 py-0.2 font-mono text-[10px] font-bold text-fg-brand-strong">
              {percent}%
            </span>
          )}
        </button>
      )}
    </>
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
