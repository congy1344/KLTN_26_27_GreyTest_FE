import { Box, Code2, Globe } from 'lucide-react';

interface AnalysisStatsProps {
  totalClasses: number;
  totalMethods: number;
  totalEndpoints: number;
}

const STATS = [
  { key: 'classes', label: 'Classes', icon: Box, accentBg: 'bg-neutral-secondary-soft', accentBorder: 'border-border-default', accentText: 'text-body-subtle' },
  { key: 'methods', label: 'Methods', icon: Code2, accentBg: 'bg-neutral-secondary-soft', accentBorder: 'border-border-default', accentText: 'text-body-subtle' },
  { key: 'endpoints', label: 'REST Endpoints', icon: Globe, accentBg: 'bg-neutral-secondary-soft', accentBorder: 'border-border-default', accentText: 'text-body-subtle' },
] as const;

export function AnalysisStats({ totalClasses, totalMethods, totalEndpoints }: AnalysisStatsProps) {
  const values: Record<string, number> = {
    classes: totalClasses,
    methods: totalMethods,
    endpoints: totalEndpoints,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className="rounded-base border border-border-default bg-neutral-primary-soft p-5 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control border ${stat.accentBg} ${stat.accentBorder}`}>
                <Icon size={16} strokeWidth={1.8} className={stat.accentText} />
              </div>
              <span className="text-right text-xs font-semibold text-body-subtle">{stat.label}</span>
            </div>
            <p className="text-[28px] tabular-nums font-semibold text-heading">{values[stat.key]}</p>
          </div>
        );
      })}
    </div>
  );
}
