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
  BUSINESS_RULE: ['Quy tắc nghiệp vụ', 'Business rule'],
  TEST_PLAN: ['Kế hoạch kiểm thử', 'Test plan'],
  TEST_CASE: ['Ca kiểm thử', 'Test case'],
  UNIT_TEST: ['Kiểm thử đơn vị', 'Unit test'],
  METHOD: ['Phương thức', 'Method'],
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
  DOWN: ['Ngừng hoạt động', 'Down'],
  UNKNOWN: ['Chưa xác định', 'Unknown'],
  OUT_OF_SERVICE: ['Tạm ngừng dịch vụ', 'Out of service'],
};

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

export function formatSemanticLabel(value: string | null | undefined, language: Language) {
  if (!value) return '';
  const labels = Object.prototype.hasOwnProperty.call(LABELS, value) ? LABELS[value] : undefined;
  return labels ? labels[language === 'vi' ? 0 : 1] : value.replace(/_/g, ' ');
}

interface SemanticBadgeProps {
  value: string;
  kind: SemanticBadgeKind;
  label?: string;
  className?: string;
}

/** Hiển thị màu ngữ nghĩa nhất quán cho loại kiểm thử và trạng thái review. */
export function SemanticBadge({ value, kind, label, className = '' }: SemanticBadgeProps) {
  const { language } = useLanguage();
  const styles = kind === 'test-type' ? TEST_TYPE_STYLES : REVIEW_STATUS_STYLES;

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[value] ?? DEFAULT_STYLE} ${className}`}>
      {label ?? formatSemanticLabel(value, language)}
    </span>
  );
}
