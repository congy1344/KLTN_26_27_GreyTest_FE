import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  tone?: 'brand' | 'neutral';
  hint?: string;
}

/** Card chỉ số dùng chung cho các panel (Coverage, Report, Test Case, Unit Test). */
export function MetricCard({ icon: Icon, label, value, tone = 'neutral', hint }: MetricCardProps) {
  return (
    <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-default ${
        tone === 'brand' ? 'bg-brand-softer text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body-subtle'
      }`}>
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <p className="text-xs font-semibold uppercase text-body-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold text-heading">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-body-subtle">{hint}</p>}
    </div>
  );
}
