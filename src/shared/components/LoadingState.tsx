import { Loader2 } from 'lucide-react';
import { useLanguage } from '../i18n/language';

interface LoadingStateProps {
  label?: string;
  minHeight?: string;
}

/** Spinner nhỏ ở giữa panel khi query đang chạy. */
export function LoadingState({ label, minHeight = 'min-h-[240px]' }: LoadingStateProps) {
  const { t } = useLanguage();
  return (
    <div className={`flex ${minHeight} flex-col items-center justify-center gap-3 p-8 text-center`}>
      <div className="w-full max-w-xl space-y-3" aria-hidden="true">
        <div className="h-5 w-1/3 rounded-base bg-neutral-secondary-medium animate-pulse" />
        <div className="h-12 rounded-base bg-neutral-secondary-soft animate-pulse" />
        <div className="h-12 rounded-base bg-neutral-secondary-soft animate-pulse" />
      </div>
      <Loader2 size={20} className="animate-spin text-fg-brand" />
      <p className="text-xs font-medium text-body-subtle">{label ?? t('Đang tải...', 'Loading...')}</p>
    </div>
  );
}
