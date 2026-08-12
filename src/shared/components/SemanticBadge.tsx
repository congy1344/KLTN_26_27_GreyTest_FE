type SemanticBadgeKind = 'test-type' | 'review-status';

const TEST_TYPE_STYLES: Record<string, string> = {
  HAPPY_PATH: 'border-border-success-subtle bg-success-soft text-fg-success-strong',
  BOUNDARY: 'border-border-orange bg-warning-soft text-fg-warning',
  EXCEPTION: 'border-border-danger-subtle bg-danger-soft text-fg-danger-strong',
  EDGE: 'border-border-purple bg-purple-soft text-fg-purple',
  EDGE_CASE: 'border-border-purple bg-purple-soft text-fg-purple',
};

const REVIEW_STATUS_STYLES: Record<string, string> = {
  APPROVED: 'border-border-success-subtle bg-success-soft text-fg-success-strong',
  PENDING_REVIEW: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  REJECTED: 'border-border-danger-subtle bg-danger-soft text-fg-danger-strong',
};

const DEFAULT_STYLE = 'border-border-default bg-neutral-secondary-medium text-body-subtle';

export function formatSemanticLabel(value: string) {
  if (value === 'EDGE') return 'EDGE CASE';
  return value.replace(/_/g, ' ');
}

interface SemanticBadgeProps {
  value: string;
  kind: SemanticBadgeKind;
  label?: string;
  className?: string;
}

/** Hiển thị màu ngữ nghĩa nhất quán cho loại kiểm thử và trạng thái review. */
export function SemanticBadge({ value, kind, label, className = '' }: SemanticBadgeProps) {
  const styles = kind === 'test-type' ? TEST_TYPE_STYLES : REVIEW_STATUS_STYLES;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[value] ?? DEFAULT_STYLE} ${className}`}>
      {label ?? formatSemanticLabel(value)}
    </span>
  );
}
