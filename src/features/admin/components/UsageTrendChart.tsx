import { useState } from 'react';
import type { TrendPoint } from '../types';

interface UsageTrendChartProps {
  points: TrendPoint[];
  granularity?: 'day' | 'month' | 'year';
}

function formatBucketLabel(bucket: string, granularity: 'day' | 'month' | 'year'): string {
  try {
    const date = new Date(bucket);
    if (isNaN(date.getTime())) return bucket;

    if (granularity === 'year') {
      return date.getFullYear().toString();
    }
    if (granularity === 'month') {
      return `T${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(2)}`;
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return bucket;
  }
}

function formatFullBucket(bucket: string, granularity: 'day' | 'month' | 'year'): string {
  try {
    const date = new Date(bucket);
    if (isNaN(date.getTime())) return bucket;

    if (granularity === 'year') {
      return `Năm ${date.getFullYear()}`;
    }
    if (granularity === 'month') {
      return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return bucket;
  }
}

/**
 * Đồ thị biểu diễn xu hướng dạng đường lên xuống (Line / Area Curve Chart).
 * Thể hiện rõ các mốc thăng trầm, đỉnh nhọn, đáy và biến thiên theo Ngày, Tháng, Năm.
 */
export function UsageTrendChart({ points, granularity = 'day' }: UsageTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!points || !points.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border-default bg-neutral-primary-soft/50">
        <p className="text-center text-xs text-body-subtle">Chưa có dữ liệu trong khoảng thời gian này.</p>
      </div>
    );
  }

  const totals = points.map((p) => p.total);
  const rawMax = Math.max(...totals, 0);
  const maximum = rawMax <= 0 ? 5 : Math.ceil(rawMax * 1.15);
  const avgVal = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
  const totalSum = totals.reduce((a, b) => a + b, 0);

  // SVG Dimension constants
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 36;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 35;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Calculate coordinates for each data point
  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (i / (points.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (p.total / maximum) * chartHeight;
    return { x, y, point: p, index: i };
  });

  // Construct smooth bezier curve path for continuous up-and-down lines
  let lineD = '';
  if (coords.length === 1) {
    lineD = `M ${coords[0].x - 30},${coords[0].y} L ${coords[0].x + 30},${coords[0].y}`;
  } else if (coords.length > 1) {
    lineD = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX = (curr.x + next.x) / 2;
      lineD += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`;
    }
  }

  // Gradient area under the line
  const bottomY = paddingTop + chartHeight;
  const areaD =
    coords.length > 1
      ? `${lineD} L ${coords[coords.length - 1].x},${bottomY} L ${coords[0].x},${bottomY} Z`
      : '';

  // Determine interval for displaying X labels without collision
  const step = Math.max(1, Math.ceil(points.length / 10));

  const activePoint = hoveredIndex !== null && coords[hoveredIndex] ? coords[hoveredIndex] : null;

  return (
    <div className="space-y-3">
      {/* Quick stats banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 text-body-subtle">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-brand" />
            <span>Tổng: <strong className="text-heading font-sans tabular-nums font-bold">{totalSum.toLocaleString()}</strong> lượt</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Đỉnh cao: <strong className="text-heading font-sans tabular-nums font-bold">{rawMax.toLocaleString()}</strong></span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-purple" />
            <span>Trung bình: <strong className="text-heading font-sans tabular-nums font-bold">{avgVal.toLocaleString()}</strong></span>
          </span>
        </div>

        {activePoint && (
          <div className="rounded-md bg-brand-softer px-2.5 py-0.5 text-[11px] font-semibold text-fg-brand">
            {formatFullBucket(activePoint.point.bucket, granularity)}: <span className="font-sans tabular-nums font-bold">{activePoint.point.total}</span> lượt
          </div>
        )}
      </div>

      {/* SVG Line / Area Graph */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border-default bg-neutral-primary-soft/40 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand, #3b82f6)" stopOpacity="0.32" />
              <stop offset="60%" stopColor="var(--brand, #3b82f6)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--brand, #3b82f6)" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glowHalo" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--brand, #3b82f6)" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Grid lines (horizontal) */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={svgWidth - paddingRight}
            y2={paddingTop}
            stroke="currentColor"
            className="text-border-default/40"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={paddingLeft - 8}
            y={paddingTop + 4}
            textAnchor="end"
            className="fill-body-subtle text-[10px] font-sans tabular-nums"
          >
            {maximum}
          </text>

          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight / 2}
            x2={svgWidth - paddingRight}
            y2={paddingTop + chartHeight / 2}
            stroke="currentColor"
            className="text-border-default/40"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={paddingLeft - 8}
            y={paddingTop + chartHeight / 2 + 4}
            textAnchor="end"
            className="fill-body-subtle text-[10px] font-sans tabular-nums"
          >
            {Math.round(maximum / 2)}
          </text>

          <line
            x1={paddingLeft}
            y1={bottomY}
            x2={svgWidth - paddingRight}
            y2={bottomY}
            stroke="currentColor"
            className="text-border-default"
            strokeWidth="1"
          />
          <text
            x={paddingLeft - 8}
            y={bottomY + 4}
            textAnchor="end"
            className="fill-body-subtle text-[10px] font-sans tabular-nums"
          >
            0
          </text>

          {/* Area fill under curve */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#trendAreaGradient)"
            />
          )}

          {/* Line stroke representing up & down movement */}
          <path
            d={lineD}
            fill="none"
            stroke="currentColor"
            className="text-brand"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowHalo)"
          />

          {/* Active point vertical guideline */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={bottomY}
              stroke="currentColor"
              className="text-brand"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
          )}

          {/* Data point circles on the line */}
          {coords.map((c, i) => {
            const isHovered = hoveredIndex === i;
            const isPeak = c.point.total === rawMax && rawMax > 0;

            return (
              <g key={c.point.bucket}>
                {isPeak && !isHovered && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="7"
                    className="fill-brand/20 animate-pulse"
                  />
                )}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 6 : coords.length > 30 ? 2.5 : 4}
                  className={`${
                    isHovered
                      ? 'fill-brand text-brand stroke-neutral-primary stroke-2'
                      : isPeak
                      ? 'fill-brand text-brand stroke-neutral-primary stroke-2'
                      : 'fill-neutral-primary text-brand stroke-brand stroke-2'
                  } transition-all duration-150`}
                />
              </g>
            );
          })}

          {/* X Axis Time Labels */}
          {coords.map((c, i) => {
            const showLabel = i === 0 || i === coords.length - 1 || i % step === 0;
            if (!showLabel) return null;

            return (
              <text
                key={`label-${c.point.bucket}`}
                x={c.x}
                y={bottomY + 20}
                textAnchor="middle"
                className="fill-body-subtle text-[10px] font-sans tabular-nums"
              >
                {formatBucketLabel(c.point.bucket, granularity)}
              </text>
            );
          })}
        </svg>

        {/* Accessible overlay nodes for screen readers and tooltips (maintains test compatibility) */}
        <div
          className="absolute inset-0 flex items-end justify-between pointer-events-none"
          aria-label="Biểu đồ xu hướng sử dụng"
        >
          {coords.map((c, i) => (
            <div
              key={c.point.bucket}
              tabIndex={0}
              role="button"
              aria-label={`${formatFullBucket(c.point.bucket, granularity)}: ${c.point.total} lượt`}
              className="pointer-events-auto flex-1 h-full cursor-pointer group relative flex flex-col justify-end items-center focus:outline-none focus:ring-1 focus:ring-brand"
              title={`${c.point.bucket}: ${c.point.total}`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
            >
              {/* Invisible touch/mouse target spanning full height */}
              <div className="w-full h-full opacity-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
