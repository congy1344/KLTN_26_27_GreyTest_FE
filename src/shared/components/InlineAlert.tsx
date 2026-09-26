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
      className={`mt-3 flex items-start justify-between gap-3 rounded-default border p-3 text-sm font-medium animate-fade-in ${toneClasses[tone]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {dismissible && (
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          aria-label="Đóng thông báo"
          title="Đóng thông báo"
          className="shrink-0 -mr-1 -mt-0.5 rounded-md p-1 text-current opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
