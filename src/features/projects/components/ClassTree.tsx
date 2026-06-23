import { useState } from 'react';
import { ChevronDown, Box, Code2, Globe, ArrowRight } from 'lucide-react';
import type { JavaClassInfo } from '../types';

interface ClassTreeProps {
  classes: JavaClassInfo[];
}

const CLASS_TYPE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  SERVICE: { label: 'Service', bg: 'bg-brand-softer', border: 'border-border-brand-subtle', text: 'text-fg-brand-strong' },
  CONTROLLER: { label: 'Controller', bg: 'bg-success-soft', border: 'border-border-success-subtle', text: 'text-fg-success-strong' },
  REPOSITORY: { label: 'Repository', bg: 'bg-warning-soft', border: 'border-border-warning-subtle', text: 'text-fg-warning' },
  ENTITY: { label: 'Entity', bg: 'bg-danger-soft', border: 'border-border-danger-subtle', text: 'text-fg-danger-strong' },
  ENUM: { label: 'Enum', bg: 'bg-neutral-secondary-medium', border: 'border-border-default', text: 'text-heading' },
  RECORD: { label: 'Record', bg: 'bg-brand-softer', border: 'border-border-brand-subtle', text: 'text-fg-brand-strong' },
  OTHER: { label: 'Other', bg: 'bg-neutral-secondary-medium', border: 'border-border-default', text: 'text-body' },
};

const HTTP_METHOD_COLOR: Record<string, string> = {
  GET: 'text-fg-success-strong bg-success-soft border-border-success-subtle',
  HEAD: 'text-body bg-neutral-secondary-medium border-border-default',
  POST: 'text-fg-brand-strong bg-brand-softer border-border-brand-subtle',
  PUT: 'text-fg-warning bg-warning-soft border-border-warning-subtle',
  DELETE: 'text-fg-danger-strong bg-danger-soft border-border-danger-subtle',
  PATCH: 'text-body bg-neutral-secondary-medium border-border-default',
  ANY: 'text-body bg-neutral-secondary-medium border-border-default',
  OPTIONS: 'text-body bg-neutral-secondary-medium border-border-default',
  TRACE: 'text-body bg-neutral-secondary-medium border-border-default',
};

export function ClassTree({ classes }: ClassTreeProps) {
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
  const [expandedMethods, setExpandedMethods] = useState<Set<number>>(new Set());

  const typeOrder = ['SERVICE', 'CONTROLLER', 'REPOSITORY', 'ENTITY', 'ENUM', 'RECORD', 'OTHER'];
  const grouped = typeOrder
    .map((type) => ({
      type,
      items: classes.filter((c) => c.classType === type),
    }))
    .filter((g) => g.items.length > 0);

  const toggleClass = (id: number) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMethod = (id: number) => {
    setExpandedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!classes.length) {
    return (
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-heading">Chưa có class nào được trích xuất</p>
        <p className="mt-1 text-xs text-body-subtle">Hãy kiểm tra lại project có source trong src/main/java không.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ type, items }) => {
        const cfg = CLASS_TYPE_CONFIG[type] || CLASS_TYPE_CONFIG.OTHER;
        return (
          <div key={type}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                {cfg.label}
              </span>
              <span className="text-xs text-body-subtle">{items.length} class</span>
            </div>

            <div className="space-y-2">
              {items.map((cls) => {
                const isExpanded = expandedClasses.has(cls.id);
                return (
                  <div
                    key={cls.id}
                    className="overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  >
                    <button
                      onClick={() => toggleClass(cls.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-neutral-secondary-soft"
                      id={`btn-toggle-class-${cls.id}`}
                    >
                      <ChevronDown
                        size={14}
                        strokeWidth={1.8}
                        className={`shrink-0 text-body-subtle transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                      />
                      <Box size={14} strokeWidth={1.6} className={cfg.text + ' shrink-0'} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-heading">{cls.className}</span>
                        {cls.packageName && (
                          <span className="ml-2 text-[11px] font-mono text-body-subtle">{cls.packageName}</span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] text-body-subtle">
                        {cls.methods.length} method
                      </span>
                    </button>

                    {isExpanded && cls.methods.length > 0 && (
                      <div className="border-t border-border-default">
                        {cls.methods.map((method) => {
                          const isMethodExpanded = expandedMethods.has(method.id);
                          return (
                            <div key={method.id} className="border-b border-border-default last:border-b-0">
                              <button
                                onClick={() => toggleMethod(method.id)}
                                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-neutral-secondary-soft"
                                id={`btn-toggle-method-${method.id}`}
                              >
                                <ChevronDown
                                  size={12}
                                  strokeWidth={1.8}
                                  className={`shrink-0 text-body-subtle transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMethodExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                                <Code2 size={12} strokeWidth={1.6} className="shrink-0 text-body-subtle" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-mono text-[13px] font-medium text-heading">
                                    {method.methodName}
                                  </span>
                                  <span className="ml-1 text-[11px] text-body-subtle">
                                    ({method.parameters.map((p) => p.type).join(', ')})
                                  </span>
                                  {method.returnType && (
                                    <>
                                      <ArrowRight size={10} className="mx-1 inline text-body-subtle" />
                                      <span className="font-mono text-[11px] text-body-subtle">{method.returnType}</span>
                                    </>
                                  )}
                                </div>
                                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                                  method.visibility === 'PUBLIC' ? 'bg-success-soft text-fg-success-strong' :
                                  method.visibility === 'PRIVATE' ? 'bg-danger-soft text-fg-danger-strong' :
                                  'bg-neutral-secondary-medium text-body'
                                }`}
                                >
                                  {method.visibility?.toLowerCase()}
                                </span>
                              </button>

                              {isMethodExpanded && (
                                <div className="space-y-3 bg-neutral-secondary-soft px-5 pb-4">
                                  {method.endpoints.length > 0 && (
                                    <div className="space-y-1.5 pt-3">
                                      {method.endpoints.map((ep) => (
                                        <div key={ep.id} className="flex min-w-0 items-center gap-2">
                                          <Globe size={11} strokeWidth={1.6} className="shrink-0 text-body-subtle" />
                                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${HTTP_METHOD_COLOR[ep.httpMethod] || HTTP_METHOD_COLOR.GET}`}>
                                            {ep.httpMethod}
                                          </span>
                                          <span className="truncate font-mono text-xs text-heading">{ep.path}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {method.sourceCode && (
                                    <div className="relative">
                                      <div className="mb-1 flex items-center justify-between">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-body-subtle">Source Code</span>
                                        {method.lineStart > 0 && (
                                          <span className="font-mono text-[10px] text-body-subtle">
                                            L{method.lineStart}-{method.lineEnd}
                                          </span>
                                        )}
                                      </div>
                                      <pre className="max-h-[280px] overflow-auto rounded-default border border-border-default bg-neutral-primary-medium p-3 font-mono text-[12px] leading-relaxed text-heading">
                                        <code>{method.sourceCode}</code>
                                      </pre>
                                    </div>
                                  )}

                                  {method.throwsList.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] font-medium text-body-subtle">Throws:</span>
                                      {method.throwsList.map((t) => (
                                        <span
                                          key={t}
                                          className="rounded border border-border-danger-subtle bg-danger-soft px-1.5 py-0.5 font-mono text-[10px] text-fg-danger-strong"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
