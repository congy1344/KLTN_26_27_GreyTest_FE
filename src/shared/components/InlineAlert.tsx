import { useLanguage } from '../i18n/language';
import { IconButton } from './IconButton';
import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface InlineAlertProps {
  tone?: 'danger' | 'success' | 'warning';
  dismissible?: boolean;
  autoDismissMs?: number;
  onDismiss?: () => void;
  children: ReactNode;
}

const toneClasses = {
  danger: 'border-border-danger-subtle bg-danger-soft text-fg-danger-strong',
  success: 'border-border-success-subtle bg-success-soft text-fg-success-strong',
  warning: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
} as const;

/** Thông báo inline trong panel (lỗi mutation, cảnh báo, upload thành công...) có nút tắt và auto-dismiss tùy chọn. */
export function InlineAlert({
  tone = 'danger',
  dismissible = true,
  autoDismissMs,
  onDismiss,
  children,
}: InlineAlertProps) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!autoDismissMs || dismissed) return undefined;
    const timer = window.setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, dismissed, onDismiss]);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className={`mt-3 flex items-start justify-between gap-3 rounded-base border p-3 text-sm font-medium animate-fade-in ${toneClasses[tone]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {dismissible && (
        <IconButton icon={X} label={t('Đóng thông báo', 'Dismiss notification')} onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }} title={t('Đóng thông báo', 'Dismiss notification')} />
      )}
    </div>
  );
}
