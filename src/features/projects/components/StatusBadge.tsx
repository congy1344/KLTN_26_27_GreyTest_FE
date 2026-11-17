import type { ProjectStatus } from '../types';
import { useLanguage } from '../../../shared/i18n/language';

/**
 * Bốn nhóm màu, mỗi nhóm một ý nghĩa duy nhất:
 * - action: người dùng cần duyệt (vàng)
 * - next: bước tiếp theo đã sẵn sàng hoặc đang chờ hệ thống (tím)
 * - done: hoàn thành (xanh)
 * - failed / idle: lỗi (đỏ) hoặc chưa bắt đầu (xám)
 */
export type Tone = 'action' | 'next' | 'done' | 'failed' | 'idle';

const TONE_CLASS: Record<Tone, string> = {
  action: 'bg-warning-soft text-fg-warning',
  next: 'bg-brand-softer text-fg-brand-strong',
  done: 'bg-success-soft text-fg-success-strong',
  failed: 'bg-danger-soft text-fg-danger-strong',
  idle: 'bg-neutral-secondary-medium text-body',
};

// Nhãn nói việc tiếp theo thay vì trạng thái kỹ thuật, để nhìn là biết dự án đang chờ gì.
export const STATUS_CONFIG: Record<ProjectStatus, { step: number; tone: Tone; label: [string, string] }> = {
  UPLOADED: { step: 0, tone: 'idle', label: ['Chưa phân tích', 'Not analyzed'] },
  ANALYZED: { step: 1, tone: 'next', label: ['Chờ sinh Business Rule', 'Ready for Business Rules'] },
  BR_PENDING_REVIEW: { step: 1, tone: 'action', label: ['Cần duyệt Business Rule', 'Review Business Rules'] },
  BR_APPROVED: { step: 2, tone: 'next', label: ['Sẵn sàng sinh Test Plan', 'Ready for Test Plans'] },
  PLAN_PENDING_REVIEW: { step: 2, tone: 'action', label: ['Cần duyệt Test Plan', 'Review Test Plans'] },
  PLAN_APPROVED: { step: 3, tone: 'next', label: ['Sẵn sàng sinh Test Case', 'Ready for Test Cases'] },
  CASE_PENDING_REVIEW: { step: 3, tone: 'action', label: ['Cần duyệt Test Case', 'Review Test Cases'] },
  CASE_APPROVED: { step: 4, tone: 'next', label: ['Sẵn sàng sinh Unit Test', 'Ready for Unit Tests'] },
  TEST_GENERATED: { step: 5, tone: 'next', label: ['Sẵn sàng đo coverage', 'Ready for coverage'] },
  COVERAGE_ANALYZED: { step: 6, tone: 'next', label: ['Đã đo coverage', 'Coverage measured'] },
  COMPLETED: { step: 7, tone: 'done', label: ['Hoàn thành', 'Completed'] },
  FAILED: { step: 0, tone: 'failed', label: ['Thất bại', 'Failed'] },
};

interface StatusBadgeProps {
  status: ProjectStatus;
  /** Giữ để tương thích nơi gọi cũ; nhãn đã đủ nói bước hiện tại. */
  reachedStatus?: ProjectStatus;
  failedStep?: number;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[status];
  return (
    <span data-tone={config.tone} title={config.step ? t(`Bước ${config.step} trên 7`, `Step ${config.step} of 7`) : undefined}
      className={`inline-flex items-center whitespace-nowrap rounded-control px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[config.tone]}`}>
      {t(...config.label)}
    </span>
  );
}
