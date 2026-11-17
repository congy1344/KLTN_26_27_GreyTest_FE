import { Tag } from './Tag';
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';

export interface MetricTrend {
  value: string | number;
  direction?: 'up' | 'down' | 'neutral';
  label?: string;
  tone?: 'success' | 'danger' | 'neutral';
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: 'brand' | 'neutral';
  hint?: string;
  trend?: MetricTrend;
}

/** Card chỉ số dùng chung cho các panel (Coverage, Report, Test Case, Unit Test, Dashboard). */
export function MetricCard({ icon: Icon, label, value, tone = 'neutral', hint, trend }: MetricCardProps) {
  return (
    <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 transition-colors duration-200 flex flex-col justify-between h-full">
      <div>
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-control ${
          tone === 'brand' ? 'bg-neutral-secondary-soft text-body-subtle' : 'bg-neutral-secondary-medium text-body-subtle'
        }`}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <p className="text-xs font-semibold text-body-subtle">{label}</p>
        <p className="mt-1 text-[22px] font-semibold text-heading font-sans tabular-nums">{value}</p>
      </div>

      <div>
        {trend && (() => {
          const resolvedTone = trend.tone || (trend.direction === 'up' ? 'success' : trend.direction === 'down' ? 'danger' : 'neutral');
          return (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold">
              <Tag variant="status" tone={resolvedTone} icon={trend.direction === 'up' ? ArrowUp : trend.direction === 'down' ? ArrowDown : Minus}>
                <span>{trend.value}</span>
              </Tag>
              {trend.label && (
                <span className="text-xs text-body-subtle">{trend.label}</span>
              )}
            </div>
          );
        })()}
        {hint && <p className="mt-1 text-xs text-body-subtle">{hint}</p>}
      </div>
    </div>
  );
}
