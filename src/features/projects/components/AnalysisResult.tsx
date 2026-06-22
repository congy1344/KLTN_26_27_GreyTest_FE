import { AnalysisStats } from './AnalysisStats';
import { ClassTree } from './ClassTree';
import type { AnalysisResult as AnalysisResultType } from '../types';
import { GitFork, ArrowRight, ShieldCheck } from 'lucide-react';

interface AnalysisResultProps {
  data: AnalysisResultType;
}

export function AnalysisResult({ data }: AnalysisResultProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats */}
      <section>
        <h3 className="text-xs font-semibold text-body-subtle uppercase tracking-widest mb-4">
          Tổng quan phân tích
        </h3>
        <AnalysisStats
          totalClasses={data.totalClasses}
          totalMethods={data.totalMethods}
          totalEndpoints={data.totalEndpoints}
          totalRelations={data.totalRelations}
        />
        {data.existingTestFiles > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-base border border-border-brand-subtle bg-brand-softer p-4">
            <ShieldCheck size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-fg-brand-strong" />
            <div>
              <p className="text-sm font-semibold text-fg-brand-strong">
                Đã phát hiện {data.existingTestFiles} file test có sẵn
              </p>
              <p className="mt-0.5 text-xs text-body">
                Các file trong src/test/java được giữ nguyên nhưng không đưa vào phân tích hoặc context sinh test.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Service → Repository Relations */}
      {data.relations.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-body-subtle uppercase tracking-widest mb-4">
            Quan hệ Service → Repository
          </h3>
          <div className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-4">
            <div className="space-y-2">
              {data.relations.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-default bg-neutral-secondary-soft"
                >
                  <GitFork size={13} strokeWidth={1.5} className="text-fg-brand shrink-0" />
                  <span className="text-sm font-medium text-heading font-mono">{rel.serviceClassName}</span>
                  <ArrowRight size={12} className="text-body-subtle shrink-0" />
                  <span className="text-sm text-body font-mono">{rel.repositoryClassName}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Class Tree */}
      <section>
        <h3 className="text-xs font-semibold text-body-subtle uppercase tracking-widest mb-4">
          Cấu trúc source code
        </h3>
        <ClassTree classes={data.classes} />
      </section>
    </div>
  );
}
