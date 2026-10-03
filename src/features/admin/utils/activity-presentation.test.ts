import { describe, expect, it } from 'vitest';
import { formatActivityMetadata } from './activity-presentation';

describe('formatActivityMetadata', () => {
  it('shows previous and new roles instead of a legacy role', () => {
    expect(formatActivityMetadata({ targetUserId: 9, previousRole: 'USER', newRole: 'ADMIN', role: 'USER' }))
      .toBe('Tài khoản #9 · Vai trò USER → ADMIN');
  });

  it('shows status transitions and the trimmed lock reason', () => {
    expect(formatActivityMetadata({ targetUserId: 9, previousEnabled: true, newEnabled: false, reason: '  Tài khoản thử nghiệm  ' }))
      .toBe('Tài khoản #9 · Trạng thái Hoạt động → Đã khóa · Lý do: Tài khoản thử nghiệm');
  });

  it('preserves the distinction between unlimited, zero, and absent quota metadata', () => {
    expect(formatActivityMetadata({ quotaLimit: null })).toBe('Quota Không giới hạn');
    expect(formatActivityMetadata({ quotaLimit: 0 })).toBe('Quota 0 lượt');
    expect(formatActivityMetadata({ reason: '  ' })).toBe('Không có chi tiết');
  });

  it('keeps legacy metadata readable', () => {
    expect(formatActivityMetadata({ targetUserId: 9, enabled: true, role: 'ADMIN' }))
      .toBe('Tài khoản #9 · Đã mở khóa · Vai trò ADMIN');
  });
});
