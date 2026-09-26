import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardList,
  Code2,
  Download,
  FileCheck,
  FileJson2,
  FileText,
  FolderKanban,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../../shared/api/api-client';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { MetricCard } from '../../../shared/components/MetricCard';
import { useLanguage } from '../../../shared/i18n/language';
import { cleanAiText } from '../../business-rules/utils/business-rule-text';
import { parseReportSummary, useReportExport } from '../hooks/useReport';
import type { ReportFormat } from '../types';

interface ParsedMarkdownSection {
  id: string;
  title: string;
  badge?: string;
  content: string;
}

function parseMarkdownDocument(rawMarkdown: string) {
  if (!rawMarkdown) return { header: '', sections: [] };

  const lines = rawMarkdown.split(/\r?\n/);
  const headerLines: string[] = [];
  const sections: ParsedMarkdownSection[] = [];
  let currentSection: { id: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentSection) {
        sections.push(buildSection(currentSection.id, currentSection.title, currentSection.lines));
      }
      const title = h2Match[1].trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      currentSection = { id, title, lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  if (currentSection) {
    sections.push(buildSection(currentSection.id, currentSection.title, currentSection.lines));
  }

  return {
    header: headerLines.join('\n').trim(),
    sections,
  };
}

function buildSection(id: string, title: string, lines: string[]): ParsedMarkdownSection {
  const content = lines.join('\n').trim();
  let badge: string | undefined;
  const tableRows = (content.match(/\n\|/g) || []).length;
  const h3Count = (content.match(/^###\s+/gm) || []).length;

  if (h3Count > 0) {
    badge = `${h3Count} items`;
  } else if (tableRows > 2) {
    badge = `${tableRows - 2} items`;
  }

  return { id, title, badge, content };
}

function getSectionIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('coverage overview') || lower.includes('coverage')) return ShieldCheck;
  if (lower.includes('tóm tắt') || lower.includes('summary')) return ClipboardList;
  if (lower.includes('business rule') || lower.includes('quy tắc')) return FileCheck;
  if (lower.includes('test plan')) return FolderKanban;
  if (lower.includes('test case')) return FileText;
  if (lower.includes('unit test')) return Code2;
  if (lower.includes('traceability') || lower.includes('ma trận')) return Link2;
  if (lower.includes('gap') || lower.includes('lỗ hổng')) return AlertCircle;
  return FileText;
}

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeHighlight];

const MARKDOWN_COMPONENTS = {
  img: () => null,
  table: ({ children, ...props }: any) => (
    <div className="my-3 overflow-x-auto rounded-default border border-border-default bg-neutral-primary-soft shadow-xs">
      <table className="m-0 w-full border-collapse border-0 text-left text-xs" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: any) => (
    <th
      className="bg-neutral-secondary-soft px-3.5 py-2.5 font-semibold text-heading whitespace-nowrap text-xs"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => {
    const raw = typeof children === 'string' ? children.trim() : '';
    const isCode = /^(BR-\d+|TP-\d+|TC-\d+)$/i.test(raw);
    const isStatus = /^(APPROVED|REJECTED|PENDING)$/i.test(raw);
    const isMetricOrNumber = /^(\d+(\.\d+)?%?|-|HIGH|MEDIUM|LOW)$/i.test(raw);

    return (
      <td
        className={`px-3.5 py-2.5 text-xs text-body align-top ${
          isCode || isStatus || isMetricOrNumber ? 'whitespace-nowrap font-medium text-heading' : ''
        }`}
        {...props}
      >
        {isCode ? (
          <span className="inline-block rounded bg-brand-softer px-1.5 py-0.5 font-mono text-xs font-semibold text-fg-brand-strong">
            {children}
          </span>
        ) : isStatus ? (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              raw === 'APPROVED'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : raw === 'REJECTED'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {children}
          </span>
        ) : (
          children
        )}
      </td>
    );
  },
};

interface SectionCardProps {
  section: ParsedMarkdownSection;
  isOpen: boolean;
  onToggle: (id: string) => void;
  collapseLabel: string;
  expandLabel: string;
}

const SectionCard = memo(function SectionCard({
  section,
  isOpen,
  onToggle,
  collapseLabel,
  expandLabel,
}: SectionCardProps) {
  // Chỉ render Markdown khi mục được mở ít nhất một lần, và sau đó giữ trong DOM để toggle bằng CSS (0ms)
  const [hasRendered, setHasRendered] = useState(isOpen);

  useEffect(() => {
    if (isOpen && !hasRendered) {
      setHasRendered(true);
    }
  }, [isOpen, hasRendered]);

  const Icon = getSectionIcon(section.title);

  return (
    <div className="overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft shadow-xs transition-shadow hover:shadow-sm">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => onToggle(section.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(section.id);
          }
        }}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-3 bg-neutral-secondary-soft/60 px-4 py-3 text-left transition-colors hover:bg-neutral-secondary-soft focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-default bg-brand-softer text-fg-brand-strong">
            <Icon size={16} />
          </div>
          <h2 className="text-sm font-bold text-heading">{section.title}</h2>
          {section.badge && (
            <span className="rounded-full border border-border-default bg-neutral-primary-soft px-2 py-0.5 text-[11px] font-medium text-body-subtle">
              {section.badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-body-subtle">
          <span className="hidden text-xs font-medium sm:inline">
            {isOpen ? collapseLabel : expandLabel}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {hasRendered && (
        <div
          className={`report-markdown border-t border-border-default p-4 ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <ReactMarkdown
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
            components={MARKDOWN_COMPONENTS}
          >
            {section.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
});

export function ReportPanel({ projectId, servicePath }: { projectId: number; servicePath?: string }) {
  const [format, setFormat] = useState<ReportFormat>('markdown');
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const preview = useReportExport(projectId, format, servicePath);
  const jsonReport = useReportExport(projectId, 'json', servicePath);
  const summary = useMemo(() => parseReportSummary(jsonReport.data), [jsonReport.data]);

  useEffect(() => {
    if (preview.data || jsonReport.data) {
      // Backend cập nhật trạng thái project sang COMPLETED khi xuất report thành công
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  }, [preview.data, jsonReport.data, queryClient, projectId]);

  const cleanData = useMemo(() => cleanAiText(preview.data ?? ''), [preview.data]);
  const parsedDoc = useMemo(() => parseMarkdownDocument(cleanData), [cleanData]);

  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // Mặc định mở toàn bộ các mục lớn khi dữ liệu tải xong
  useEffect(() => {
    if (parsedDoc.sections.length > 0) {
      setOpenSections(new Set(parsedDoc.sections.map((s) => s.id)));
    }
  }, [parsedDoc.sections]);

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allOpen = parsedDoc.sections.length > 0 && parsedDoc.sections.every((s) => openSections.has(s.id));
  const toggleAll = useCallback(() => {
    if (allOpen) {
      setOpenSections(new Set());
    } else {
      setOpenSections(new Set(parsedDoc.sections.map((s) => s.id)));
    }
  }, [allOpen, parsedDoc.sections]);

  const handleDownload = () => {
    if (!preview.data) return;
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    const sanitized = cleanAiText(preview.data);
    const extension = format === 'json' ? 'json' : 'md';
    const type = format === 'json' ? 'application/json' : 'text/markdown';
    const url = URL.createObjectURL(new Blob([sanitized], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `greytest-report-${projectId}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const collapseLabel = t('Thu gọn', 'Collapse');
  const expandLabel = t('Mở rộng', 'Expand');

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
          ) : format === 'markdown' ? (
            <article aria-label="Report preview" className="min-h-[430px] max-h-[75vh] overflow-auto p-6">
              {parsedDoc.header && (
                <div className="report-markdown mb-6 border-b border-border-default pb-4">
                  <ReactMarkdown
                    remarkPlugins={REMARK_PLUGINS}
                    rehypePlugins={REHYPE_PLUGINS}
                    components={MARKDOWN_COMPONENTS}
                  >
                    {parsedDoc.header}
                  </ReactMarkdown>
                </div>
              )}

              {parsedDoc.sections.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-body-subtle">
                      {t(`${parsedDoc.sections.length} mục lớn`, `${parsedDoc.sections.length} major sections`)}
                    </span>
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="inline-flex items-center gap-1.5 rounded-default border border-border-default bg-neutral-secondary-soft px-3 py-1.5 text-xs font-semibold text-heading transition-colors hover:bg-neutral-secondary-soft/80"
                    >
                      {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
                      {allOpen ? t('Thu gọn tất cả', 'Collapse all') : t('Mở tất cả', 'Expand all')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {parsedDoc.sections.map((section) => (
                      <SectionCard
                        key={section.id}
                        section={section}
                        isOpen={openSections.has(section.id)}
                        onToggle={toggleSection}
                        collapseLabel={collapseLabel}
                        expandLabel={expandLabel}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="report-markdown">
                  <ReactMarkdown
                    remarkPlugins={REMARK_PLUGINS}
                    rehypePlugins={REHYPE_PLUGINS}
                    components={MARKDOWN_COMPONENTS}
                  >
                    {cleanData}
                  </ReactMarkdown>
                </div>
              )}
            </article>
          ) : (
            <pre aria-label="Report preview" className="min-h-[430px] max-h-[70vh] overflow-auto whitespace-pre-wrap bg-neutral-primary-soft p-6 font-mono text-xs leading-relaxed text-heading">
              <code>{cleanData}</code>
            </pre>
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
