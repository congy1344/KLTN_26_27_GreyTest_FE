import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type TagTone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral';

// Cùng bảng màu viên thuốc với StatusBadge và SemanticBadge để mọi tag trong app trông như một hệ.
const TONE_PILL: Record<TagTone, string> = {
  success: 'bg-success-soft text-fg-success-strong',
  warning: 'bg-warning-soft text-fg-warning',
  danger: 'bg-danger-soft text-fg-danger-strong',
  brand: 'bg-brand-softer text-fg-brand-strong',
  neutral: 'bg-neutral-secondary-medium text-body',
};

type TagProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & { children: ReactNode } & (
  | { variant: 'status'; tone: TagTone; icon: LucideIcon }
  | { variant?: 'meta'; tone?: never; icon?: never }
);

export function Tag({ variant = 'meta', tone, icon: Icon, children, className = '', ...props }: TagProps) {
  return (
    <span {...props} data-tone={variant === 'status' ? tone : 'neutral'} className={`inline-flex items-center gap-1 ${variant === 'status'
      ? `rounded-control px-2.5 py-1 font-sans text-xs font-semibold ${TONE_PILL[tone!]}`
      : 'rounded-control bg-neutral-secondary-medium px-2.5 py-1 text-xs font-semibold text-heading'} ${className}`}>
      {Icon && <Icon size={13} strokeWidth={2.2} aria-hidden="true" className={`shrink-0 ${Icon === Loader2 ? 'animate-spin' : ''}`} />}
      {children}
    </span>
  );
}
