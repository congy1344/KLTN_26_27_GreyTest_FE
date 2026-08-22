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
};

export function activityLabel(action: ActivityAction): string {
  return labels[action];
}

export function formatActivityMetadata(metadata: Record<string, unknown> = {}): string {
  const parts: string[] = [];
  if (metadata.targetUserId != null) parts.push(`Tài khoản #${metadata.targetUserId}`);
  if (typeof metadata.enabled === 'boolean') parts.push(metadata.enabled ? 'Đã mở khóa' : 'Đã khóa');
  if (typeof metadata.role === 'string') parts.push(`Vai trò ${metadata.role}`);
  if (typeof metadata.quotaLimit === 'number') parts.push(`Quota ${metadata.quotaLimit} lượt`);
  if (typeof metadata.model === 'string') parts.push(`Model ${metadata.model}`);
  if (typeof metadata.provider === 'string') parts.push(`Provider ${metadata.provider}`);

  if (!parts.length) {
    Object.entries(metadata).slice(0, 2).forEach(([key, value]) => {
      if (['string', 'number', 'boolean'].includes(typeof value)) parts.push(`${key}: ${String(value)}`);
    });
  }
  return parts.join(' · ') || 'Không có chi tiết';
}
