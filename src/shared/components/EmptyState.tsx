import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  minHeight?: string;
}

/** Trạng thái rỗng dùng chung: icon + tiêu đề + gợi ý hành động tiếp theo. */
export function EmptyState({ icon: Icon, title, hint, action, minHeight = 'min-h-[240px]' }: EmptyStateProps) {
  return (
    <div className={`flex ${minHeight} flex-col items-center justify-center p-8 text-center animate-fade-in`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle">
        <Icon size={17} strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-heading">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs leading-relaxed text-body-subtle">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
