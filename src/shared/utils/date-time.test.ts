import { describe, expect, it } from 'vitest';
import { parseApiDate } from './date-time';

describe('parseApiDate', () => {
  it('treats backend LocalDateTime values as UTC', () => {
    expect(parseApiDate('2026-07-28T05:00:00').toISOString()).toBe('2026-07-28T05:00:00.000Z');
  });

  it('keeps timestamps that already include an offset', () => {
    expect(parseApiDate('2026-07-28T12:00:00+07:00').toISOString()).toBe('2026-07-28T05:00:00.000Z');
  });
});
