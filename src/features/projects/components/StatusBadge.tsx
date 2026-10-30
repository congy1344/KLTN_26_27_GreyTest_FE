import type { ProjectStatus } from '../types';
import { useLanguage } from '../../../shared/i18n/language';

const STATUS_CONFIG: Record<ProjectStatus, { label: [string, string]; bg: string; border: string; text: string; dotColor: string }> = {
  UPLOADED: {
    label: ['Đã tải lên', 'Uploaded'],
    bg: 'bg-brand-softer',
    border: 'border-border-brand-subtle',
    text: 'text-fg-brand-strong',
    dotColor: 'bg-brand',
  },
  ANALYZED: {
    label: ['Đã phân tích', 'Analyzed'],
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  BR_PENDING_REVIEW: {
    label: ['BR chờ duyệt', 'BR pending review'],
    bg: 'bg-warning-soft',
    border: 'border-border-warning-subtle',
    text: 'text-fg-warning',
    dotColor: 'bg-warning animate-pulse',
  },
  BR_APPROVED: {
    label: ['BR đã duyệt', 'BR approved'],
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  PLAN_PENDING_REVIEW: {
    label: ['Kế hoạch chờ duyệt', 'Plan pending review'],
    bg: 'bg-warning-soft',
    border: 'border-border-warning-subtle',
    text: 'text-fg-warning',
    dotColor: 'bg-warning animate-pulse',
  },
  PLAN_APPROVED: {
    label: ['Kế hoạch đã duyệt', 'Plan approved'],
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  CASE_PENDING_REVIEW: {
    label: ['Ca kiểm thử chờ duyệt', 'Case pending review'],
    bg: 'bg-warning-soft',
    border: 'border-border-warning-subtle',
    text: 'text-fg-warning',
    dotColor: 'bg-warning animate-pulse',
  },
  CASE_APPROVED: {
    label: ['Ca kiểm thử đã duyệt', 'Case approved'],
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  TEST_GENERATED: {
    label: ['Đã sinh test', 'Tests generated'],
    bg: 'bg-brand-softer',
    border: 'border-border-brand-subtle',
    text: 'text-fg-brand-strong',
    dotColor: 'bg-brand',
  },
  COVERAGE_ANALYZED: {
    label: ['Đã phân tích coverage', 'Coverage analyzed'],
    bg: 'bg-brand-softer',
    border: 'border-border-brand-subtle',
    text: 'text-fg-brand-strong',
    dotColor: 'bg-brand',
  },
  COMPLETED: {
    label: ['Hoàn thành', 'Completed'],
    bg: 'bg-success-soft',
    border: 'border-border-success-subtle',
    text: 'text-fg-success-strong',
    dotColor: 'bg-success',
  },
  FAILED: {
    label: ['Thất bại', 'Failed'],
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
  const { t } = useLanguage();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {t(...config.label)}
    </span>
  );
}
