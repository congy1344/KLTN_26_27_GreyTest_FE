import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Loader2, X } from 'lucide-react';
import { useLanguage } from '../i18n/language';
import type { GenerationProgress, GenerationProgressStepStatus } from '../types/generation-progress';

interface AiGenerationProgressProps {
  active: boolean;
  label: string;
  progress?: GenerationProgress;
}

const STEP_STYLES: Record<GenerationProgressStepStatus, string> = {
  WAITING: 'bg-neutral-secondary-medium text-body-subtle',
  RUNNING: 'bg-brand text-neutral-primary-soft shadow-xs',
  COMPLETED: 'bg-success-soft text-fg-success-strong',
  FAILED: 'bg-danger-soft text-fg-danger-strong',
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

/** Hiển thị tiến độ sinh AI qua widget nổi ở góc dưới bên phải, giữ nguyên log khi xong hoặc lỗi. */
export function AiGenerationProgress({
  active,
  label,
  progress,
}: AiGenerationProgressProps) {
  const { t } = useLanguage();
  const [floatingDismissed, setFloatingDismissed] = useState(false);
  // Giữ lại tiến trình mới nhất để dù hoàn thành hay thất bại vẫn giữ nguyên log trên màn hình
  const [persistedProgress, setPersistedProgress] = useState<GenerationProgress | undefined>(progress);

  useEffect(() => {
    if (progress && progress.status !== 'IDLE') {
      setPersistedProgress(progress);
    }
  }, [progress]);

  const currentProgress = (progress && progress.status !== 'IDLE') ? progress : persistedProgress;
  const percent = Math.min(Math.max(currentProgress?.percent ?? 0, 0), 100);
  const hasDeterminateProgress = Boolean(currentProgress && currentProgress.totalSteps > 0);

  const isCompleted = currentProgress?.status === 'COMPLETED';
  const isFailed = currentProgress?.status === 'FAILED';
  const isQueued = currentProgress?.status === 'QUEUED';
  const isRunning = !isCompleted && !isFailed
    && (active || isQueued || currentProgress?.status === 'RUNNING');

  // Khi có đợt chạy mới thì tự động mở lại widget nếu trước đó từng bấm đóng
  useEffect(() => {
    if (isRunning) {
      setFloatingDismissed(false);
    }
  }, [isRunning]);

  const hasProgress = Boolean(
    active || (currentProgress && currentProgress.status && currentProgress.status !== 'IDLE')
  );

  const latestLog = currentProgress?.logs && currentProgress.logs.length > 0
    ? currentProgress.logs[currentProgress.logs.length - 1]
    : null;
  const latestTime = formatLogTime(latestLog?.timestamp);

  const currentMessage = latestLog
    ? latestLog.message
    : currentProgress?.steps.find((s) => s.status === 'RUNNING')?.label
    || (isQueued
      ? t('Tác vụ đã vào hàng đợi và sẽ tự chạy nền.', 'Task is queued and running in background.')
      : isCompleted
        ? t('Tác vụ hoàn thành thành công.', 'Task completed successfully.')
        : isFailed
          ? t('Tác vụ thất bại.', 'Task failed.')
          : t('Đang xử lý...', 'Processing...'));

  const announcement = (
    <span role="status" aria-live="polite" className="sr-only">
      {isFailed
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

      {/* Floating dock hiển thị ở góc dưới bên phải; giữ nguyên khi hoàn tất hoặc thất bại */}
      {hasProgress && !floatingDismissed && (
        <aside
          role="complementary"
          aria-label={t('Tiến trình AI đang chạy', 'Running AI progress')}
          className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-xl border border-border-brand/40 bg-neutral-primary-soft/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border-default pb-2">
            <div className="flex min-w-0 items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 size={16} className="text-fg-success-strong shrink-0" />
              ) : isFailed ? (
                <AlertCircle size={16} className="text-fg-danger-strong shrink-0" />
              ) : isQueued ? (
                <Clock3 size={16} className="text-brand shrink-0" />
              ) : (
                <Loader2 size={16} className="animate-spin text-brand shrink-0" />
              )}
              <span className="truncate text-xs font-bold text-heading">{label}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isCompleted && (
                <span className="rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold text-fg-success-strong">
                  {t('Hoàn thành', 'Completed')}
                </span>
              )}
              {isFailed && (
                <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-fg-danger-strong">
                  {t('Thất bại', 'Failed')}
                </span>
              )}
              <span className="font-mono text-xs font-bold text-fg-brand-strong">{percent}%</span>
              <button
                type="button"
                className="rounded p-1 text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading"
                title={t('Đóng', 'Close')}
                aria-label={t('Đóng tiến trình', 'Close progress')}
                onClick={() => setFloatingDismissed(true)}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-soft">
            <span
              className={`block h-full rounded-full transition-[width] duration-300 ease-out ${
                isCompleted ? 'bg-success' : isFailed ? 'bg-danger' : 'bg-brand'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Log mới nhất kèm thời gian */}
          <div className="mt-2 flex items-start justify-between gap-2">
            <p className="text-xs font-medium leading-snug text-heading line-clamp-2">
              {currentMessage}
            </p>
            {latestTime && (
              <span className="shrink-0 rounded bg-neutral-secondary-medium/60 px-1.5 py-0.5 font-mono text-[10px] text-body-subtle">
                {latestTime}
              </span>
            )}
          </div>

          {/* Danh sách các bước */}
          {currentProgress?.steps && currentProgress.steps.length > 0 && (
            <div className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto border-t border-border-default pt-2">
              {currentProgress.steps.map((step) => (
                <div key={step.order} className="flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <StepIcon status={step.status} />
                    <span className={`truncate ${step.status === 'RUNNING' ? 'font-semibold text-fg-brand-strong' : 'text-body-subtle'}`}>
                      {step.label}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STEP_STYLES[step.status]}`}>
                    {stepStatusLabel(step.status, t)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Lịch sử log kèm mốc thời gian */}
          {currentProgress?.logs && currentProgress.logs.length > 1 && (
            <div className="mt-2 max-h-24 space-y-1 overflow-y-auto border-t border-border-default pt-1.5 font-mono text-[10px] text-body-subtle">
              {currentProgress.logs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="flex items-start gap-1.5">
                  <span className="shrink-0 text-body-subtle/70">
                    {formatLogTime(log.timestamp)}
                  </span>
                  <span className="break-words text-heading">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </>
  );
}

function StepIcon({ status }: { status: GenerationProgressStepStatus }) {
  const className = status === 'FAILED'
    ? 'mt-0.5 text-fg-danger-strong'
    : status === 'COMPLETED'
      ? 'mt-0.5 text-fg-success-strong'
      : 'mt-0.5 text-fg-brand-strong';
  if (status === 'RUNNING') return <Loader2 size={15} className={`${className} animate-spin`} aria-hidden="true" />;
  if (status === 'COMPLETED') return <CheckCircle2 size={15} className={className} aria-hidden="true" />;
  if (status === 'FAILED') return <AlertCircle size={15} className={className} aria-hidden="true" />;
  return <Clock3 size={15} className={className} aria-hidden="true" />;
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
