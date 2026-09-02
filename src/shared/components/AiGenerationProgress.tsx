import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, ListTree, Loader2, X } from 'lucide-react';
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

const STEP_ITEM_STYLES: Record<GenerationProgressStepStatus, string> = {
  WAITING: 'border-border-default bg-neutral-secondary-soft',
  RUNNING: 'border-border-brand bg-brand-softer shadow-sm ring-1 ring-border-brand',
  COMPLETED: 'border-border-default bg-neutral-secondary-soft',
  FAILED: 'border-border-danger-subtle bg-danger-soft',
};

const STEP_FILL_STYLES: Record<GenerationProgressStepStatus, string> = {
  WAITING: 'bg-neutral-tertiary-medium',
  RUNNING: 'bg-brand-strong',
  COMPLETED: 'bg-success',
  FAILED: 'bg-danger',
};

/** Hiển thị tiến độ sinh AI trong popover không chặn thao tác trên trang. */
export function AiGenerationProgress({
  active,
  label,
  progress,
}: AiGenerationProgressProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const percent = Math.min(Math.max(progress?.percent ?? 0, 0), 100);
  const hasDeterminateProgress = Boolean(progress && progress.totalSteps > 0);
  const isTerminal = progress?.status === 'COMPLETED' || progress?.status === 'FAILED';
  const isRunning = !isTerminal
    && (active || progress?.status === 'QUEUED' || progress?.status === 'RUNNING');

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const announcement = (
    <span role="status" aria-live="polite" className="sr-only">
      {progress?.status === 'FAILED'
        ? `${label}: ${t('thất bại', 'failed')} ${percent}%`
        : progress?.status === 'COMPLETED'
          ? `${label}: ${t('hoàn tất', 'completed')} 100%`
          : progress?.status === 'QUEUED'
            ? `${label}: ${t('đang chờ worker xử lý', 'queued for processing')}`
          : isRunning
            ? hasDeterminateProgress
          ? `${label}: ${percent}%`
          : `${label}: ${t('Đang lấy dữ liệu tiến độ', 'Retrieving progress')}`
            : ''}
    </span>
  );

  return (
    <div ref={rootRef} className="relative flex-none">
      {announcement}
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-secondary px-3"
        aria-label={isRunning && hasDeterminateProgress
          ? t(`Log tiến độ ${percent}%`, `Progress log ${percent}%`)
          : t('Log tiến độ', 'Progress log')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {isRunning ? <Loader2 size={14} className="animate-spin" /> : <ListTree size={14} />}
        Log
        {isRunning && hasDeterminateProgress && (
          <span className="font-mono text-xs font-bold text-fg-brand-strong">{percent}%</span>
        )}
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={t('Chi tiết tiến độ AI', 'AI progress details')}
          className="absolute right-0 top-full z-40 mt-2 w-[420px] max-w-[calc(100vw-2rem)] rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-heading">{t('Tiến độ AI', 'AI progress')}</p>
              <p className="mt-0.5 text-xs text-body-subtle">{label}</p>
            </div>
            <button
              type="button"
              className="rounded-default p-1 text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading"
              aria-label={t('Đóng log tiến độ', 'Close progress log')}
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          </div>

          {!progress || progress.status === 'IDLE' ? (
            <div className="mt-4 rounded-default bg-neutral-secondary-soft px-3 py-4 text-center text-xs text-body-subtle">
              {t('Chưa có tiến trình nào', 'No generation has run yet')}
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-heading">{t('Tổng thể', 'Overall')}</p>
                  <p className="mt-0.5 text-[11px] text-body-subtle">
                    {t(`${progress.completedSteps}/${progress.totalSteps} bước`, `${progress.completedSteps}/${progress.totalSteps} steps`)}
                  </p>
                </div>
                <span className="font-mono text-2xl font-bold text-fg-brand-strong">{percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label={t('Tiến độ tổng thể', 'Overall progress')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-soft"
              >
                <span
                  className="generation-progress-fill block h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <ol className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1" aria-label={t('Các bước pipeline', 'Pipeline steps')}>
                {progress.steps.length > 0 ? progress.steps.map((step) => (
                  <li
                    key={step.order}
                    aria-current={step.status === 'RUNNING' ? 'step' : undefined}
                    className={`rounded-default border p-3 transition-colors ${STEP_ITEM_STYLES[step.status]}`}
                  >
                    <div className="flex items-start gap-2">
                      <StepIcon status={step.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-heading">{step.label}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STEP_STYLES[step.status]}`}>
                            {stepStatusLabel(step.status, t)}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label={step.label}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={step.percent}
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-secondary-medium"
                        >
                          <span
                            className={`block h-full rounded-full transition-colors ${STEP_FILL_STYLES[step.status]}`}
                            style={{ width: `${step.percent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right font-mono text-[10px] text-body-subtle">{step.percent}%</p>
                        {step.status === 'FAILED' && step.errorMessage && (
                          <p className="mt-2 rounded-default bg-danger-soft px-2 py-1.5 text-[11px] text-fg-danger-strong">
                            {step.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                )) : (
                  <li className="text-center text-xs text-body-subtle">
                    {t('Đang nhận danh sách bước từ backend...', 'Loading pipeline steps...')}
                  </li>
                )}
              </ol>

              {progress.logs.length > 0 && (
                <div className="mt-4 border-t border-border-default pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-body-subtle">
                    {t('Hoạt động gần nhất', 'Latest activity')}
                  </p>
                  <p className="mt-1 text-xs text-body">{progress.logs[progress.logs.length - 1].message}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
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
