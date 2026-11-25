import { Check, CircleCheck, Clock, PencilLine, Ruler, Shuffle, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useLanguage, type Language } from '../i18n/language';

type SemanticBadgeKind = 'test-type' | 'review-status';

const LABELS: Record<string, [string, string]> = {
  HAPPY_PATH: ['Trường hợp hợp lệ', 'Happy path'],
  BOUNDARY: ['Trường hợp biên', 'Boundary'],
  EXCEPTION: ['Trường hợp ngoại lệ', 'Exception'],
  EDGE: ['Trường hợp đặc biệt', 'Edge case'],
  EDGE_CASE: ['Trường hợp đặc biệt', 'Edge case'],
  PENDING_REVIEW: ['Chờ duyệt', 'Pending review'],
  PENDING: ['Chờ duyệt', 'Pending'],
  APPROVED: ['Đã duyệt', 'Approved'],
  REJECTED: ['Đã từ chối', 'Rejected'],
  ACCEPTED: ['Đã chấp nhận', 'Accepted'],
  DRAFT: ['Bản nháp', 'Draft'],
  HIGH: ['Cao', 'High'],
  MEDIUM: ['Trung bình', 'Medium'],
  LOW: ['Thấp', 'Low'],
  AI_GENERATED: ['AI sinh', 'AI generated'],
  USER_ADDED: ['Người dùng thêm', 'User added'],
  USER_MODIFIED: ['Người dùng chỉnh sửa', 'User modified'],
  AI_REVIEW_SUGGESTED: ['AI đề xuất', 'AI suggested'],
  NEW_TEST: ['Test mới', 'New test'],
  INCREMENTAL: ['Sinh bổ sung', 'Incremental'],
  IMPROVE_EXISTING_TEST: ['Cải thiện test có sẵn', 'Improve existing test'],
  BUSINESS_RULE: ['Business Rule', 'Business rule'],
  TEST_PLAN: ['Test Plan', 'Test plan'],
  TEST_CASE: ['Test Case', 'Test case'],
  UNIT_TEST: ['Unit Test', 'Unit test'],
  METHOD: ['Method', 'Method'],
  CREATE: ['Thêm mới', 'Create'],
  UPDATE: ['Cập nhật', 'Update'],
  REMOVE: ['Xóa', 'Remove'],
  KEEP: ['Giữ nguyên', 'Keep'],
  ADDED: ['Mới thêm', 'Added'],
  MODIFIED: ['Đã chỉnh sửa', 'Modified'],
  DELETED: ['Đã xóa', 'Deleted'],
  ANALYZED: ['Đã phân tích', 'Analyzed'],
  ANALYZING: ['Đang phân tích', 'Analyzing'],
  UNCHANGED: ['Không thay đổi', 'Unchanged'],
  GENERATING: ['Đang sinh', 'Generating'],
  READY_TO_APPLY: ['Sẵn sàng áp dụng', 'Ready to apply'],
  APPLIED: ['Đã áp dụng', 'Applied'],
  CANCELLED: ['Đã hủy', 'Cancelled'],
  FAILED: ['Thất bại', 'Failed'],
  ADMIN: ['Quản trị viên', 'Admin'],
  USER: ['Người dùng', 'User'],
  UP: ['Hoạt động', 'Up'],
  ONLINE: ['Hoạt động', 'Online'],
  READY: ['Hoạt động', 'Ready'],
  IN_PROCESS: ['Hoạt động', 'In process'],
  DOWN: ['Ngừng hoạt động', 'Down'],
  UNKNOWN: ['Chưa xác định', 'Unknown'],
  OUT_OF_SERVICE: ['Tạm ngừng dịch vụ', 'Out of service'],
};

type Tone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral';

/** Loại test là phân loại: chip trung tính, chỉ icon nhỏ mang màu gợi ý. */
const TEST_TYPES: Record<string, { tone: Tone; icon: LucideIcon }> = {
  HAPPY_PATH: { tone: 'success', icon: CircleCheck },
  BOUNDARY: { tone: 'warning', icon: Ruler },
  EXCEPTION: { tone: 'danger', icon: TriangleAlert },
  EDGE: { tone: 'brand', icon: Shuffle },
  EDGE_CASE: { tone: 'brand', icon: Shuffle },
};

/** Trạng thái review: viên thuốc tô nền nhạt theo màu trạng thái, kèm icon. */
const REVIEW_STATUSES: Record<string, { tone: Tone; icon: LucideIcon }> = {
  APPROVED: { tone: 'success', icon: Check },
  ACCEPTED: { tone: 'success', icon: Check },
  PENDING_REVIEW: { tone: 'warning', icon: Clock },
  PENDING: { tone: 'warning', icon: Clock },
  REJECTED: { tone: 'danger', icon: X },
  DRAFT: { tone: 'neutral', icon: PencilLine },
  MODIFIED: { tone: 'neutral', icon: PencilLine },
};

/** Trạng thái review dùng cùng bảng màu viên thuốc với trạng thái dự án (StatusBadge). */
const TONE_PILL: Record<Tone, string> = {
  success: 'bg-success-soft text-fg-success-strong',
  warning: 'bg-warning-soft text-fg-warning',
  danger: 'bg-danger-soft text-fg-danger-strong',
  brand: 'bg-brand-softer text-fg-brand-strong',
  neutral: 'bg-neutral-secondary-medium text-body',
};

const TONE_TEXT: Record<Tone, string> = {
  success: 'text-fg-success-strong',
  warning: 'text-fg-warning',
  danger: 'text-fg-danger-strong',
  brand: 'text-fg-brand-strong',
  neutral: 'text-body-subtle',
};

export function formatSemanticLabel(value: unknown, language: Language) {
  if (value === null || value === undefined || value === '') return '';
  const str = typeof value === 'string' ? value : String(value);
  const labels = Object.prototype.hasOwnProperty.call(LABELS, str) ? LABELS[str] : undefined;
  return labels ? labels[language === 'vi' ? 0 : 1] : str.replace(/_/g, ' ');
}

interface SemanticBadgeProps {
  value: string;
  kind: SemanticBadgeKind;
  label?: string;
  className?: string;
}

/** Loại kiểm thử: viên thuốc trung tính có icon màu gợi ý. Trạng thái review: viên thuốc màu trạng thái. */
export function SemanticBadge({ value, kind, label, className = '' }: SemanticBadgeProps) {
  const { language } = useLanguage();
  const text = label ?? formatSemanticLabel(value, language);
  if (kind === 'test-type') {
    const type = TEST_TYPES[value];
    const Icon = type?.icon;
    return (
      <span data-tone={type?.tone ?? 'neutral'} className={`inline-flex items-center gap-1 rounded-control bg-neutral-secondary-medium px-2.5 py-1 text-xs font-semibold text-heading ${className}`}>
        {Icon && <Icon size={12} strokeWidth={2.2} aria-hidden="true" className={`shrink-0 ${TONE_TEXT[type.tone]}`} />}
        {text}
      </span>
    );
  }
  const status = REVIEW_STATUSES[value];
  const Icon = status?.icon ?? Clock;
  const tone = status?.tone ?? 'neutral';
  return (
    <span data-tone={tone} className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-semibold ${TONE_PILL[tone]} ${className}`}>
      {Icon && <Icon size={13} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />}
      {text}
    </span>
  );
}
