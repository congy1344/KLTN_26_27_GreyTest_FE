import { describe, expect, it } from 'vitest';
import { activityLabel, formatActivityMetadata } from './activity-presentation';

describe('activity presentation', () => {
  it('uses concise Vietnamese labels', () => {
    expect(activityLabel('GENERATE_TEST_PLAN')).toBe('Sinh Test Plan');
    expect(activityLabel('ADMIN_STATUS_CHANGE')).toBe('Đổi trạng thái tài khoản');
  });

  it('formats known metadata without raw JSON', () => {
    expect(formatActivityMetadata({ targetUserId: 6, enabled: false }))
      .toBe('Tài khoản #6 · Đã khóa');
  });
});
