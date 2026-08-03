import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Download, FileJson2, FileText, Link2, ShieldCheck } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { MetricCard } from '../../../shared/components/MetricCard';
import { useLanguage } from '../../../shared/i18n/language';
import { parseReportSummary, useReportExport } from '../hooks/useReport';
import type { ReportFormat } from '../types';

export function ReportPanel({ projectId }: { projectId: number }) {
  const [format, setFormat] = useState<ReportFormat>('markdown');
  const { t } = useLanguage();
  const preview = useReportExport(projectId, format);
  // Metric card luôn đọc từ bản JSON (khi đang xem markdown thì là 1 request nhỏ thêm, có cache)
  const jsonReport = useReportExport(projectId, 'json');
  const summary = useMemo(() => parseReportSummary(jsonReport.data), [jsonReport.data]);

  const handleDownload = () => {
    if (!preview.data) return;
    const extension = format === 'json' ? 'json' : 'md';
    const type = format === 'json' ? 'application/json' : 'text/markdown';
    const url = URL.createObjectURL(new Blob([preview.data], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `greytest-report-${projectId}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Report</h3>
          <p className="mt-1 text-xs text-body-subtle">
            {t('Xuất Report cuối pipeline theo JSON hoặc Markdown.', 'Export the final pipeline Report as JSON or Markdown.')}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard
          icon={ShieldCheck}
          label="Requirement Coverage"
          value={summary?.requirementCoverage != null ? `${summary.requirementCoverage}%` : '-'}
          tone="brand"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Line Coverage"
          value={summary?.lineCoverage != null ? `${summary.lineCoverage}%` : '-'}
        />
        <MetricCard icon={ClipboardList} label="Unit Tests" value={summary ? summary.totalUnitTests : '-'} />
        <MetricCard icon={Link2} label="Trace Links" value={summary ? summary.traceability.length : '-'} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <p className="text-sm font-semibold text-heading">{t('Định dạng export', 'Export format')}</p>
          <div role="group" aria-label="Report format" className="mt-4 grid gap-2">
            {(['markdown', 'json'] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={format === item}
                className={`flex min-h-[44px] items-center justify-between gap-3 rounded-default border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  format === item
                    ? 'border-border-brand-subtle bg-brand-softer text-fg-brand-strong'
                    : 'border-border-default bg-neutral-secondary-soft text-body hover:border-border-default-strong'
                }`}
                onClick={() => setFormat(item)}
              >
                <span className="inline-flex items-center gap-2">
                  {item === 'json' ? <FileJson2 size={14} /> : <FileText size={14} />}
                  {item === 'json' ? 'JSON' : 'Markdown'}
                </span>
                {format === item && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            <ContextRow label="Sections" value="Summary, Traceability, Coverage" />
            <ContextRow label="Endpoint" value="/export?format=" />
            <ContextRow label="PDF/Excel" value="Out of scope" />
          </div>
        </div>

        <div className="rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border-default p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">Report preview</p>
              <p className="mt-1 text-xs text-body-subtle">
                {t('Nội dung được sinh từ dữ liệu thật của project trên backend.', 'Content is generated from the real project data on the backend.')}
              </p>
            </div>
            <button className="btn btn-brand shrink-0" disabled={!preview.data} onClick={handleDownload}>
              <Download size={14} />
              Download {format.toUpperCase()}
            </button>
          </div>
          {preview.isLoading ? (
            <LoadingState label={t('Đang tạo report...', 'Generating report...')} minHeight="min-h-[430px]" />
          ) : preview.isError ? (
            <div className="p-4">
              <InlineAlert tone="danger">{getErrorMessage(preview.error)}</InlineAlert>
              <button type="button" className="btn btn-secondary mt-3" onClick={() => preview.refetch()}>
                {t('Thử lại', 'Retry')}
              </button>
            </div>
          ) : (
            <textarea
              aria-label="Report preview"
              className="form-input min-h-[430px] w-full resize-y rounded-none border-0 bg-neutral-primary-soft font-mono text-xs leading-relaxed focus:ring-0"
              readOnly
              value={preview.data ?? ''}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 rounded-default bg-neutral-secondary-soft px-3 py-2">
      <dt className="text-body-subtle">{label}</dt>
      <dd className="truncate font-medium text-heading">{value}</dd>
    </div>
  );
}
