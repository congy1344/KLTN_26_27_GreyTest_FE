import type { ProjectStatus } from '../types';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; bg: string; border: string; text: string; dotColor: string }> = {
  UPLOADED: {
    label: 'Đã tải lên',
    bg: 'bg-brand-softer',
    border: 'border-border-brand-subtle',
    text: 'text-fg-brand-strong',
    dotColor: 'bg-brand',
  },
  ANALYZED: {
    label: 'Đã phân tích',
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  BR_PENDING_REVIEW: {
    label: 'BR chờ duyệt',
    bg: 'bg-warning-soft',
    border: 'border-border-warning-subtle',
    text: 'text-fg-warning',
    dotColor: 'bg-warning animate-pulse',
  },
  BR_APPROVED: {
    label: 'BR đã duyệt',
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  PLAN_PENDING_REVIEW: {
    label: 'Plan chờ duyệt',
    bg: 'bg-warning-soft',
    border: 'border-border-warning-subtle',
    text: 'text-fg-warning',
    dotColor: 'bg-warning animate-pulse',
  },
  PLAN_APPROVED: {
    label: 'Plan đã duyệt',
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  CASE_PENDING_REVIEW: {
    label: 'Case chờ duyệt',
    bg: 'bg-warning-soft',
    border: 'border-border-warning-subtle',
    text: 'text-fg-warning',
    dotColor: 'bg-warning animate-pulse',
  },
  CASE_APPROVED: {
    label: 'Case đã duyệt',
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  TEST_GENERATED: {
    label: 'Đã sinh test',
    bg: 'bg-brand-softer',
    border: 'border-border-brand-subtle',
    text: 'text-fg-brand-strong',
    dotColor: 'bg-brand',
  },
  COVERAGE_ANALYZED: {
    label: 'Đã phân tích coverage',
    bg: 'bg-brand-softer',
    border: 'border-border-brand-subtle',
    text: 'text-fg-brand-strong',
    dotColor: 'bg-brand',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  FAILED: {
    label: 'Thất bại',
    bg: 'bg-danger-soft',
    border: 'border-border-danger-subtle',
    text: 'text-fg-danger-strong',
    dotColor: 'bg-danger',
  },
};

interface StatusBadgeProps {
  status: ProjectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium border ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
