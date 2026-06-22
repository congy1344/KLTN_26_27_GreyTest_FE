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

  // Nhóm class theo loại, sắp xếp theo thứ tự: SERVICE → CONTROLLER → REPOSITORY → ENTITY → OTHER
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

  return (
    <div className="space-y-6">
      {grouped.map(({ type, items }) => {
        const cfg = CLASS_TYPE_CONFIG[type] || CLASS_TYPE_CONFIG.OTHER;
        return (
          <div key={type}>
            {/* Group header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                {cfg.label}
              </span>
              <span className="text-xs text-body-subtle">{items.length} class{items.length > 1 ? 'es' : ''}</span>
            </div>

            {/* Class items */}
            <div className="space-y-2">
              {items.map((cls) => {
                const isExpanded = expandedClasses.has(cls.id);
                return (
                  <div
                    key={cls.id}
                    className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs overflow-hidden transition-all duration-200"
                  >
                    {/* Class header */}
                    <button
                      onClick={() => toggleClass(cls.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-secondary-medium transition-colors duration-150"
                      id={`btn-toggle-class-${cls.id}`}
                    >
                      <ChevronDown
                        size={14}
                        strokeWidth={2}
                        className={`text-body-subtle shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                      />
                      <Box size={14} strokeWidth={1.5} className={cfg.text + ' shrink-0'} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-heading">{cls.className}</span>
                        {cls.packageName && (
                          <span className="text-[11px] text-body-subtle font-mono ml-2">{cls.packageName}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-body-subtle shrink-0">
                        {cls.methods.length} method{cls.methods.length !== 1 ? 's' : ''}
                      </span>
                    </button>

                    {/* Methods */}
                    {isExpanded && cls.methods.length > 0 && (
                      <div className="border-t border-border-default">
                        {cls.methods.map((method) => {
                          const isMethodExpanded = expandedMethods.has(method.id);
                          return (
                            <div key={method.id} className="border-b border-border-default last:border-b-0">
                              {/* Method header */}
                              <button
                                onClick={() => toggleMethod(method.id)}
                                className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-neutral-secondary-soft transition-colors duration-150"
                                id={`btn-toggle-method-${method.id}`}
                              >
                                <ChevronDown
                                  size={12}
                                  strokeWidth={2}
                                  className={`text-body-subtle shrink-0 transition-transform duration-150 ${isMethodExpanded ? 'rotate-0' : '-rotate-90'}`}
                                />
                                <Code2 size={12} strokeWidth={1.5} className="text-body-subtle shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="text-[13px] font-medium text-heading font-mono">
                                    {method.methodName}
                                  </span>
                                  <span className="text-[11px] text-body-subtle ml-1">
                                    ({method.parameters.map((p) => p.type).join(', ')})
                                  </span>
                                  {method.returnType && (
                                    <>
                                      <ArrowRight size={10} className="inline mx-1 text-body-subtle" />
                                      <span className="text-[11px] text-body-subtle font-mono">{method.returnType}</span>
                                    </>
                                  )}
                                </div>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                  method.visibility === 'PUBLIC' ? 'bg-success-soft text-fg-success-strong' :
                                  method.visibility === 'PRIVATE' ? 'bg-danger-soft text-fg-danger-strong' :
                                  'bg-neutral-secondary-medium text-body'
                                }`}>
                                  {method.visibility?.toLowerCase()}
                                </span>
                              </button>

                              {/* Method details */}
                              {isMethodExpanded && (
                                <div className="px-5 pb-3 space-y-3 bg-neutral-secondary-soft">
                                  {/* Endpoints */}
                                  {method.endpoints.length > 0 && (
                                    <div className="space-y-1.5 pt-2">
                                      {method.endpoints.map((ep) => (
                                        <div key={ep.id} className="flex items-center gap-2">
                                          <Globe size={11} strokeWidth={1.5} className="text-body-subtle shrink-0" />
                                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-mono border ${HTTP_METHOD_COLOR[ep.httpMethod] || HTTP_METHOD_COLOR.GET}`}>
                                            {ep.httpMethod}
                                          </span>
                                          <span className="text-xs font-mono text-heading">{ep.path}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Source code */}
                                  {method.sourceCode && (
                                    <div className="relative">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-body-subtle font-medium uppercase tracking-wider">Source Code</span>
                                        {method.lineStart > 0 && (
                                          <span className="text-[10px] text-body-subtle font-mono">
                                            L{method.lineStart}–{method.lineEnd}
                                          </span>
                                        )}
                                      </div>
                                      <pre className="bg-neutral-primary-medium border border-border-default rounded-default p-3 text-[12px] font-mono text-heading overflow-x-auto leading-relaxed max-h-[280px] overflow-y-auto">
                                        <code>{method.sourceCode}</code>
                                      </pre>
                                    </div>
                                  )}

                                  {/* Parameters & throws */}
                                  {method.throwsList.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] text-body-subtle font-medium">Throws:</span>
                                      {method.throwsList.map((t) => (
                                        <span
                                          key={t}
                                          className="text-[10px] font-mono bg-danger-soft text-fg-danger-strong border border-border-danger-subtle rounded px-1.5 py-0.5"
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
