import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fillTrendTimeline } from './trend-timeline';

describe('fillTrendTimeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array when rawPoints is empty', () => {
    expect(fillTrendTimeline([])).toEqual([]);
  });

  it('fills 12 monthly points when granularity is month and only 1 point exists', () => {
    const raw = [{ bucket: '2026-11-01T00:00:00', total: 195 }];
    const filled = fillTrendTimeline(raw, 'month');

    expect(filled.length).toBeGreaterThanOrEqual(12);
    const novPoint = filled.find((p) => p.bucket.startsWith('2026-11'));
    expect(novPoint).toBeDefined();
    expect(novPoint?.total).toBe(195);

    // Other months have 0
    const zeroPoints = filled.filter((p) => p.total === 0);
    expect(zeroPoints.length).toBeGreaterThanOrEqual(11);
  });

  it('fills 30 daily points when granularity is day and only 1 point exists', () => {
    const raw = [{ bucket: '2026-11-22T00:00:00', total: 195 }];
    const filled = fillTrendTimeline(raw, 'day');

    expect(filled.length).toBe(30);
    const dayPoint = filled.find((p) => p.bucket.startsWith('2026-11-22'));
    expect(dayPoint?.total).toBe(195);
  });

  it('fills 5 yearly points when granularity is year', () => {
    const raw = [{ bucket: '2026-01-01T00:00:00', total: 195 }];
    const filled = fillTrendTimeline(raw, 'year');

    expect(filled.length).toBe(5);
    const yrPoint = filled.find((p) => p.bucket.startsWith('2026-01-01'));
    expect(yrPoint?.total).toBe(195);
  });

  it('handles custom date range between from and to', () => {
    const raw = [{ bucket: '2026-11-15T00:00:00', total: 50 }];
    const filled = fillTrendTimeline(raw, 'day', '2026-11-10', '2026-11-20');

    expect(filled.length).toBe(11);
    const point = filled.find((p) => p.bucket.startsWith('2026-11-15'));
    expect(point?.total).toBe(50);
  });

  it('handles only to date specified without from date', () => {
    const raw = [{ bucket: '2026-10-10T00:00:00', total: 20 }];
    const filled = fillTrendTimeline(raw, 'day', undefined, '2026-10-15', 7);

    expect(filled.length).toBe(7);
    const point = filled.find((p) => p.bucket.startsWith('2026-10-10'));
    expect(point?.total).toBe(20);
  });
});
