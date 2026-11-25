import type { ActivityAction } from '../types';

const labels: Record<ActivityAction, string> = {
  GENERATE_BUSINESS_RULE: 'Sinh Business Rule',
  REVIEW_BUSINESS_RULE: 'AI review Business Rule',
  GENERATE_TEST_PLAN: 'Sinh Test Plan',
  GENERATE_TEST_CASE: 'Sinh Test Case',
  GENERATE_UNIT_TEST: 'Sinh Unit Test',
  COVERAGE_REFINEMENT: 'Tối ưu Coverage',
  LLM_CALL: 'Gọi LLM Gateway',
  ADMIN_STATUS_CHANGE: 'Đổi trạng thái tài khoản',
  ADMIN_ROLE_CHANGE: 'Đổi vai trò tài khoản',
  ADMIN_QUOTA_CHANGE: 'Điều chỉnh quota',
  USER_UPGRADE_TIER: 'Người dùng nâng cấp gói PRO',
  USER_CANCEL_TIER: 'Người dùng hủy gói về Free',
  ADMIN_TIER_CHANGE: 'Đổi gói tài khoản (Tier)',
  USER_LOGIN: 'Đăng nhập hệ thống',
};

const adminSubActionLabels: Record<string, string> = {
  CREATE_USER: 'Tạo tài khoản người dùng',
  UPDATE_USER_DETAILS: 'Cập nhật thông tin người dùng',
  DELETE_USER: 'Xóa tài khoản người dùng',
  ADMIN_CANCEL_JOB: 'Hủy tác vụ sinh test',
  ADMIN_RETRY_JOB: 'Chạy lại tác vụ sinh test',
  UPDATE_AI_KEYS: 'Cập nhật khóa API AI',
  UPDATE_STAGE_LIMITS: 'Cập nhật giới hạn token',
  UPDATE_AI_MODEL: 'Đổi mô hình AI hoạt động',
  CREATE_TIER_PACKAGE: 'Tạo gói dịch vụ Tier',
  UPDATE_TIER_PACKAGE: 'Cập nhật gói dịch vụ Tier',
  DELETE_TIER_PACKAGE: 'Xóa gói dịch vụ Tier',
  DISABLE_TIER_PACKAGE: 'Tạm dừng gói dịch vụ Tier',
  UPDATE_SYSTEM_SETTINGS: 'Cập nhật cấu hình hệ thống',
  UPDATE_FEEDBACK_STATUS: 'Xử lý phản hồi người dùng',
  DELETE_FEEDBACK: 'Xóa phản hồi người dùng',
  TOGGLE_UNDER_ATTACK_MODE: 'Bật/tắt chế độ phòng thủ WAF',
  BLOCK_IP: 'Chặn địa chỉ IP (WAF)',
  UNBLOCK_IP: 'Gỡ chặn địa chỉ IP (WAF)',
  UNBLOCK_ALL_IPS: 'Gỡ chặn toàn bộ IP (WAF)',
  UPDATE_RATE_LIMIT: 'Cập nhật giới hạn tải (Rate Limit)',
  UPDATE_RATE_LIMIT_CONFIG: 'Cập nhật cấu hình Rate Limit WAF',
};

const statusLabels: Record<string, string> = {
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  NEW: 'Mới tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối',
  CLOSED: 'Đã đóng',
};

export function activityLabel(action: ActivityAction, metadata?: Record<string, unknown>): string {
  if (action === 'ADMIN_STATUS_CHANGE' && typeof metadata?.action === 'string') {
    return adminSubActionLabels[metadata.action] || labels[action];
  }
  return labels[action] || action;
}

export function formatActivityMetadata(metadata: Record<string, unknown> = {}): string {
  const parts: string[] = [];
  if (metadata.ip) parts.push(`IP: ${metadata.ip}`);
  if (metadata.userAgent) parts.push(`Thiết bị: ${String(metadata.userAgent).slice(0, 45)}`);
  if (metadata.portal) parts.push(`Cổng: ${metadata.portal === 'ADMIN_PORTAL' ? 'Admin' : 'Web'}`);
  if (typeof metadata.status === 'string' && metadata.status.trim()) {
    const normalized = metadata.status.trim().toUpperCase();
    parts.push(`Trạng thái: ${statusLabels[normalized] || metadata.status}`);
  }
  if (metadata.targetUserId != null) parts.push(`Tài khoản #${metadata.targetUserId}`);
  if (typeof metadata.createdEmail === 'string' && metadata.createdEmail) parts.push(`Email: ${metadata.createdEmail}`);
  if (typeof metadata.deletedEmail === 'string' && metadata.deletedEmail) parts.push(`Đã xóa: ${metadata.deletedEmail}`);
  if (typeof metadata.code === 'string' && metadata.code) parts.push(`Gói ${metadata.code}`);
  if (metadata.id != null && typeof metadata.action === 'string' && metadata.action.includes('FEEDBACK')) {
    parts.push(`Phản hồi #${metadata.id}`);
  }
  if (typeof metadata.stage === 'string' && metadata.stage) parts.push(`Giai đoạn: ${metadata.stage}`);
  if (typeof metadata.projectName === 'string' && metadata.projectName) parts.push(`Dự án: ${metadata.projectName}`);
  if (typeof metadata.underAttackMode === 'boolean') {
    parts.push(`Chế độ phòng thủ: ${metadata.underAttackMode ? 'Bật' : 'Tắt'}`);
  }
  if (typeof metadata.rateLimitPerMinute === 'number') parts.push(`Giới hạn: ${metadata.rateLimitPerMinute} req/phút`);
  if (typeof metadata.configuredCount === 'number') parts.push(`${metadata.configuredCount} khóa kích hoạt`);
  if (typeof metadata.previousEnabled === 'boolean' && typeof metadata.newEnabled === 'boolean') {
    parts.push(`Trạng thái ${metadata.previousEnabled ? 'Hoạt động' : 'Đã khóa'} → ${metadata.newEnabled ? 'Hoạt động' : 'Đã khóa'}`);
  } else if (typeof metadata.enabled === 'boolean') parts.push(metadata.enabled ? 'Đã mở khóa' : 'Đã khóa');
  if (typeof metadata.previousRole === 'string' && typeof metadata.newRole === 'string') {
    parts.push(`Vai trò ${metadata.previousRole} → ${metadata.newRole}`);
  } else if (typeof metadata.role === 'string') parts.push(`Vai trò ${metadata.role}`);
  if (typeof metadata.previousTier === 'string' && typeof metadata.newTier === 'string') {
    parts.push(`Gói ${metadata.previousTier} → ${metadata.newTier}`);
  }
  if (typeof metadata.quotaLimit === 'number') parts.push(`Quota ${metadata.quotaLimit} lượt`);
  if (metadata.quotaLimit === null) parts.push('Quota Không giới hạn');
  if (typeof metadata.reason === 'string' && metadata.reason.trim()) parts.push(`Lý do: ${metadata.reason.trim()}`);
  if (typeof metadata.model === 'string') parts.push(`Model ${metadata.model}`);
  if (typeof metadata.provider === 'string') parts.push(`Provider ${metadata.provider}`);

  if (!parts.length) {
    Object.entries(metadata).slice(0, 2).forEach(([key, value]) => {
      if (key !== 'reason' && ['string', 'number', 'boolean'].includes(typeof value)) parts.push(`${key}: ${String(value)}`);
    });
  }
  return parts.join(' · ') || 'Không có chi tiết';
}
