import { Link } from 'react-router-dom';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { getErrorMessage } from '../api/api-client';
import { useLanguage } from '../i18n/language';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  backTo?: string;
  backLabel?: string;
}

/** Khối lỗi cấp trang/panel: message + nút thử lại hoặc link quay về. */
export function ErrorState({ error, title, onRetry, backTo, backLabel }: ErrorStateProps) {
  const { t } = useLanguage();
  const isRateLimited = (error as { response?: { status?: number } })?.response?.status === 429;
  const effectiveTitle = isRateLimited
    ? t('Tạm thời vượt giới hạn tần suất yêu cầu', 'Rate limit temporarily exceeded')
    : title;
  const message = error ? getErrorMessage(error) : effectiveTitle ?? t('Có lỗi xảy ra', 'Something went wrong');
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-base border border-border-default bg-neutral-primary-soft p-10 text-center animate-fade-in">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-control bg-danger-soft text-fg-danger-strong">
        <AlertCircle size={20} strokeWidth={1.8} />
      </div>
      {effectiveTitle && Boolean(error) && <h2 className="font-display text-lg font-semibold text-heading">{effectiveTitle}</h2>}
      <p className="text-sm font-semibold text-fg-danger-strong">{message}</p>
      {!onRetry && !backTo && <p className="mt-2 text-sm text-body">{t('Tải lại trang để thử tải dữ liệu lần nữa.', 'Reload the page to try loading the data again.')}</p>}
      {onRetry && (
        <button type="button" className="btn btn-secondary mt-4" onClick={onRetry}>
          <RotateCcw size={14} strokeWidth={1.8} />
          {t('Thử lại', 'Retry')}
        </button>
      )}
      {backTo && (
        <Link to={backTo} className="rounded-control mt-4 text-sm font-medium text-fg-brand transition-colors hover:text-fg-brand-strong">
          {backLabel ?? t('Quay lại danh sách', 'Back to projects')}
        </Link>
      )}
    </div>
  );
}
