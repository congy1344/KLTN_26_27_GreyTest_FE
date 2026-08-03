import type { ReactNode } from 'react';

interface InlineAlertProps {
  tone?: 'danger' | 'success' | 'warning';
  children: ReactNode;
}

const toneClasses = {
  danger: 'border-border-danger-subtle bg-danger-soft text-fg-danger-strong',
  success: 'border-border-success-subtle bg-success-soft text-fg-success-strong',
  warning: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
} as const;

/** Thông báo inline trong panel (lỗi mutation, upload thành công...). */
export function InlineAlert({ tone = 'danger', children }: InlineAlertProps) {
  return (
    <div role="alert" className={`mt-3 rounded-default border p-3 text-sm font-medium animate-fade-in ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}
