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
  { key: 'relations', label: 'Service → Repo', icon: GitFork, accentBg: 'bg-brand-softer', accentBorder: 'border-border-brand-subtle', accentText: 'text-fg-brand-strong' },
] as const;

export function AnalysisStats({ totalClasses, totalMethods, totalEndpoints, totalRelations }: AnalysisStatsProps) {
  const values: Record<string, number> = {
    classes: totalClasses,
    methods: totalMethods,
    endpoints: totalEndpoints,
    relations: totalRelations,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.key}
            className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-5 animate-fade-in-up"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-default ${stat.accentBg} border ${stat.accentBorder}`}>
                <Icon size={16} strokeWidth={2} className={stat.accentText} />
              </div>
              <span className="text-xs font-medium text-body-subtle uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-heading tracking-tight">{values[stat.key]}</p>
          </div>
        );
      })}
    </div>
  );
}
