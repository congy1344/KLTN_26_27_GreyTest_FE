import type { TrendPoint } from '../types';

export function UsageTrendChart({ points }: { points: TrendPoint[] }) {
  if (!points.length) return <p className="py-16 text-center text-sm text-body-subtle">Chưa có dữ liệu trong khoảng thời gian này.</p>;
  const maximum = Math.max(...points.map((point) => point.total), 1);
  return (
    <div className="flex h-56 items-end gap-2 overflow-x-auto pt-6" aria-label="Biểu đồ xu hướng sử dụng">
      {points.map((point) => (
        <div key={point.bucket} className="group flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold text-heading opacity-0 transition-opacity group-hover:opacity-100">{point.total}</span>
          <div className="w-full rounded-t bg-brand transition-[height]" style={{ height: `${Math.max((point.total / maximum) * 155, 4)}px` }} title={`${point.bucket}: ${point.total}`} />
          <span className="max-w-14 truncate text-[10px] text-body-subtle">{new Date(point.bucket).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
        </div>
      ))}
    </div>
  );
}
