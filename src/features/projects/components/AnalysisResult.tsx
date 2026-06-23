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
      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-heading">Tổng quan phân tích</h3>
            <p className="mt-1 text-xs text-body-subtle">
              Các chỉ số được trích xuất từ production source.
            </p>
          </div>
          <span className="text-xs font-mono text-body-subtle">Project #{data.projectId}</span>
        </div>

        <AnalysisStats
          totalClasses={data.totalClasses}
          totalMethods={data.totalMethods}
          totalEndpoints={data.totalEndpoints}
          totalRelations={data.totalRelations}
        />

        {data.existingTestFiles > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-base border border-border-brand-subtle bg-brand-softer p-4 shadow-xs">
            <ShieldCheck size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-fg-brand-strong" />
            <div>
              <p className="text-sm font-semibold text-fg-brand-strong">
                Đã phát hiện {data.existingTestFiles} file test có sẵn
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-body">
                Các file trong src/test/java được giữ nguyên nhưng không đưa vào phân tích hoặc context sinh test.
              </p>
            </div>
          </div>
        )}
      </section>

      {data.relations.length > 0 && (
        <section>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-heading">Quan hệ Service và Repository</h3>
            <p className="mt-1 text-xs text-body-subtle">Các field dependency resolve được trong service.</p>
          </div>
          <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
            <div className="space-y-2">
              {data.relations.map((rel) => (
                <div
                  key={rel.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-default bg-neutral-secondary-soft px-3 py-2"
                >
                  <GitFork size={13} strokeWidth={1.6} className="shrink-0 text-fg-brand" />
                  <span className="font-mono text-sm font-medium text-heading">{rel.serviceClassName}</span>
                  <ArrowRight size={12} className="shrink-0 text-body-subtle" />
                  <span className="font-mono text-sm text-body">{rel.repositoryClassName}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-heading">Cấu trúc source code</h3>
          <p className="mt-1 text-xs text-body-subtle">Mở từng class và method để xem endpoint, signature và source.</p>
        </div>
        <ClassTree classes={data.classes} />
      </section>
    </div>
  );
}
