import type { TrendPoint } from '../types';

/**
 * Phân tích chuỗi ngày ISO / date-only an toàn theo giờ địa phương của client,
 * tránh việc parse "YYYY-MM-DD" thuần bị ép về UTC 00:00:00Z gây lệch ngày/tháng ở múi giờ âm.
 */
function parseSafeDate(dateStr: string): Date {
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
  return new Date(normalized);
}

function formatBucketKey(d: Date, granularity: 'day' | 'month' | 'year'): string {
  const yr = d.getFullYear();
  if (granularity === 'year') return `${yr}`;
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  if (granularity === 'month') return `${yr}-${mo}`;
  return `${yr}-${mo}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Tự động bù đắp các mốc thời gian còn thiếu (Zero-filling) cho chuỗi dữ liệu xu hướng.
 * Đảm bảo đồ thị luôn có trục thời gian liên tục (ví dụ: 30 ngày, 12 tháng, 5 năm)
 * thay vì chỉ có 1 điểm cô lập khi cơ sở dữ liệu chỉ phát sinh hoạt động trong 1 ngày/tháng.
 */
export function fillTrendTimeline(
  rawPoints: TrendPoint[],
  granularity: 'day' | 'month' | 'year' = 'day',
  fromStr?: string,
  toStr?: string,
  days = 30,
): TrendPoint[] {
  if (!rawPoints || rawPoints.length === 0) return [];

  // Tạo map tra cứu theo định dạng ngày chuẩn
  const dataMap = new Map<string, number>();
  for (const p of rawPoints) {
    const d = parseSafeDate(p.bucket);
    if (isNaN(d.getTime())) continue;
    const key = formatBucketKey(d, granularity);
    dataMap.set(key, (dataMap.get(key) ?? 0) + (p.total || 0));
  }

  const now = new Date();
  let end: Date = toStr ? parseSafeDate(toStr) : new Date(now);
  if (isNaN(end.getTime())) end = new Date(now);

  const baseForStart = toStr ? end : now;
  let start: Date;
  if (fromStr) {
    start = parseSafeDate(fromStr);
    if (isNaN(start.getTime())) start = new Date(now);
  } else {
    start = new Date(baseForStart);
    if (granularity === 'year') {
      start.setFullYear(start.getFullYear() - 4);
      start.setMonth(0, 1);
    } else if (granularity === 'month') {
      start.setMonth(start.getMonth() - 11, 1);
    } else {
      start.setDate(start.getDate() - (days - 1));
    }
  }

  if (start.getTime() > end.getTime()) {
    return rawPoints;
  }

  const result: TrendPoint[] = [];
  const cursor = new Date(start);

  if (granularity === 'year') {
    cursor.setMonth(0, 1);
    const endYear = end.getFullYear();
    while (cursor.getFullYear() <= endYear) {
      const key = formatBucketKey(cursor, 'year');
      result.push({ bucket: `${key}-01-01T00:00:00`, total: dataMap.get(key) ?? 0 });
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
  } else if (granularity === 'month') {
    cursor.setDate(1);
    const endYearMonth = end.getFullYear() * 12 + end.getMonth();
    while (cursor.getFullYear() * 12 + cursor.getMonth() <= endYearMonth) {
      const key = formatBucketKey(cursor, 'month');
      result.push({ bucket: `${key}-01T00:00:00`, total: dataMap.get(key) ?? 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const endDayTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    while (new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime() <= endDayTime) {
      const key = formatBucketKey(cursor, 'day');
      result.push({ bucket: `${key}T00:00:00`, total: dataMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return result.length > 0 ? result : rawPoints;
}
