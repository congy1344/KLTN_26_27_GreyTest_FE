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
    <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-sm transition-shadow duration-200 hover:shadow-md flex flex-col justify-between h-full">
      <div>
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
          tone === 'brand' ? 'bg-brand-softer text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body-subtle'
        }`}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <p className="text-xs font-semibold uppercase text-body-subtle">{label}</p>
        <p className="mt-1 text-2xl font-bold text-heading font-sans tabular-nums">{value}</p>
      </div>

      <div>
        {trend && (() => {
          const resolvedTone = trend.tone || (trend.direction === 'up' ? 'success' : trend.direction === 'down' ? 'danger' : 'neutral');
          return (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                  resolvedTone === 'success'
                    ? 'bg-success-soft text-fg-success-strong border border-border-success-subtle'
                    : resolvedTone === 'danger'
                    ? 'bg-danger-soft text-fg-danger-strong border border-border-danger-subtle'
                    : 'bg-neutral-secondary text-body-subtle border border-border-default'
                }`}
              >
                {trend.direction === 'up' && <ArrowUp size={11} strokeWidth={2.5} />}
                {trend.direction === 'down' && <ArrowDown size={11} strokeWidth={2.5} />}
                {trend.direction === 'neutral' && <Minus size={11} strokeWidth={2.5} />}
                <span>{trend.value}</span>
              </span>
              {trend.label && (
                <span className="text-[11px] text-body-subtle">{trend.label}</span>
              )}
            </div>
          );
        })()}
        {hint && <p className="mt-1 text-[11px] text-body-subtle">{hint}</p>}
      </div>
    </div>
  );
}
