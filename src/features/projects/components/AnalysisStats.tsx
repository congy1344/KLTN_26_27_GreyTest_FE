import { Box, Code2, Globe, GitFork } from 'lucide-react';

interface AnalysisStatsProps {
  totalClasses: number;
  totalMethods: number;
  totalEndpoints: number;
  totalRelations: number;
}

const STATS = [
  { key: 'classes', label: 'Classes', icon: Box, accentBg: 'bg-brand-softer', accentBorder: 'border-border-brand-subtle', accentText: 'text-fg-brand-strong' },
  { key: 'methods', label: 'Methods', icon: Code2, accentBg: 'bg-success-soft', accentBorder: 'border-border-success-subtle', accentText: 'text-fg-success-strong' },
  { key: 'endpoints', label: 'REST Endpoints', icon: Globe, accentBg: 'bg-warning-soft', accentBorder: 'border-border-warning-subtle', accentText: 'text-fg-warning' },
  { key: 'relations', label: 'Service to Repo', icon: GitFork, accentBg: 'bg-brand-softer', accentBorder: 'border-border-brand-subtle', accentText: 'text-fg-brand-strong' },
] as const;

export function AnalysisStats({ totalClasses, totalMethods, totalEndpoints, totalRelations }: AnalysisStatsProps) {
  const values: Record<string, number> = {
    classes: totalClasses,
    methods: totalMethods,
    endpoints: totalEndpoints,
    relations: totalRelations,
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm animate-fade-in-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-default border ${stat.accentBg} ${stat.accentBorder}`}>
                <Icon size={16} strokeWidth={1.8} className={stat.accentText} />
              </div>
              <span className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-body-subtle">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight text-heading">{values[stat.key]}</p>
          </div>
        );
      })}
    </div>
  );
}
