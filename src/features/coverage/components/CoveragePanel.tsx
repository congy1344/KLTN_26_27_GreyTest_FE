import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileUp,
  GitBranch,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { MetricCard } from '../../../shared/components/MetricCard';
import { useLanguage } from '../../../shared/i18n/language';
import { parseApiDate } from '../../../shared/utils/date-time';
import { useCoverageReport, useStartCoverageRefinement, useUploadCoverage } from '../hooks/useCoverage';
import type { CoverageGap } from '../types';
import type { ProjectStatus } from '../../projects/types';

// Hint chênh lệch so với vòng upload trước (chỉ có từ vòng 2)
function deltaHint(current: number | undefined, previous: number | null | undefined, t: (vi: string, en: string) => string) {
  if (current == null || previous == null) return undefined;
  const delta = Math.round((current - previous) * 100) / 100;
  const sign = delta > 0 ? '+' : '';
  return t(`${sign}${delta}% so với vòng trước`, `${sign}${delta}% vs previous round`);
}

export function CoveragePanel({ projectId, projectStatus = 'COVERAGE_ANALYZED' }: { projectId: number; projectStatus?: ProjectStatus }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const reportQuery = useCoverageReport(projectId);
  const upload = useUploadCoverage(projectId);
  const refinement = useStartCoverageRefinement(projectId);
  const report = reportQuery.data ?? null;
  const fileName = selectedFile?.name ?? '';
  const canRefine = projectStatus === 'COVERAGE_ANALYZED' || projectStatus === 'COMPLETED';
  const refinableGapCount = report?.gaps.filter((gap) => gap.refinable).length ?? 0;
  const nonRefinableGapCount = (report?.gaps.length ?? 0) - refinableGapCount;

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  const handleUpload = () => {
    if (!selectedFile) return;
    upload.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        setShowSuccess(true);
      },
    });
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Coverage</h3>
          <p className="mt-1 text-xs text-body-subtle">
            {t('Upload JaCoCo XML sau khi chạy Unit Test local, rồi xem coverage và coverage gap.', 'Upload JaCoCo XML after running Unit Tests locally, then inspect coverage and gaps.')}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-brand shrink-0"
          disabled={!report || !canRefine}
          onClick={() => navigate(`/projects/${projectId}/traceability`, {
            state: {
              workflowNotice: t(
                'Coverage đã được phân tích. Chuyển sang bước Traceability.',
                'Coverage has been analyzed. Continue with Traceability.',
              ),
            },
          })}
        >
          {t('Tiếp tục đến Traceability', 'Continue to Traceability')}
          <ArrowRight size={14} strokeWidth={1.8} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard icon={BarChart3} label="Overall Line Coverage" value={report ? `${report.lineCoverage}%` : '-'} tone="brand" hint={deltaHint(report?.lineCoverage, report?.previousLineCoverage, t)} />
        <MetricCard icon={GitBranch} label="Overall Branch Coverage" value={report ? `${report.branchCoverage}%` : '-'} hint={deltaHint(report?.branchCoverage, report?.previousBranchCoverage, t)} />
        <MetricCard icon={ShieldCheck} label="Requirement Coverage" value={report ? `${report.requirementCoverage}%` : '-'} hint={deltaHint(report?.requirementCoverage, report?.previousRequirementCoverage, t)} />
        <MetricCard icon={AlertTriangle} label="Refinable Service Gaps" value={refinableGapCount} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-default bg-brand-softer text-fg-brand-strong">
              <FileUp size={16} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">JaCoCo XML</p>
              <p className="mt-0.5 truncate text-xs text-body-subtle">target/site/jacoco/jacoco.xml</p>
            </div>
          </div>

          <input
            id={`coverage-file-${projectId}`}
            aria-label={t('Chọn JaCoCo XML', 'Choose JaCoCo XML')}
            className="sr-only"
            type="file"
            accept=".xml,text/xml"
            onChange={(event) => {
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              event.currentTarget.value = '';
              upload.reset();
            }}
          />
          <label
            htmlFor={`coverage-file-${projectId}`}
            className="group flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-default border border-dashed border-border-default-strong bg-neutral-secondary-soft px-4 py-5 text-center transition-colors hover:border-border-brand-subtle hover:bg-brand-softer/40 focus-within:ring-2 focus-within:ring-brand"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle transition-colors group-hover:bg-neutral-primary-soft group-hover:text-fg-brand-strong">
              <UploadCloud size={18} strokeWidth={1.8} />
            </span>
            <span className="mt-3 text-sm font-semibold text-heading">
              {fileName || t('Chọn file jacoco.xml', 'Choose jacoco.xml')}
            </span>
            <span className="mt-1 text-xs text-body-subtle">
              {t('Chỉ nhận file XML từ JaCoCo', 'JaCoCo XML files only')}
            </span>
          </label>

          <button className="btn btn-brand mt-3 w-full" disabled={!fileName || upload.isPending} onClick={handleUpload}>
            {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            {upload.isPending ? t('Đang phân tích...', 'Analyzing...') : t('Upload và phân tích coverage', 'Upload and analyze coverage')}
          </button>

          {upload.isError && <div className="mt-3"><InlineAlert tone="danger">{getErrorMessage(upload.error)}</InlineAlert></div>}
          {showSuccess && (
            <div className="mt-3"><InlineAlert tone="success">{t('Upload và phân tích thành công', 'Uploaded and analyzed successfully')}</InlineAlert></div>
          )}

          <div className="mt-4 grid gap-2 text-sm">
            <ContextRow label={t('File đã chọn', 'Selected file')} value={fileName || t('Chưa chọn file', 'No file selected')} />
            <ContextRow label="Line gate" value=">= 80%" />
            <ContextRow label="Branch gate" value=">= 70%" />
          </div>
        </div>

        <div className="rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
          <div className="border-b border-border-default p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-heading">Coverage result</p>
              {report && (
                <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">
                  {t(`Vòng ${report.round}`, `Round ${report.round}`)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-body-subtle">
              {report
                ? t(`Upload lúc ${parseApiDate(report.uploadedAt).toLocaleString('vi-VN')}`, `Uploaded at ${parseApiDate(report.uploadedAt).toLocaleString('en-US')}`)
                : t('Chưa có coverage report.', 'No coverage report yet.')}
            </p>
          </div>

          {reportQuery.isLoading ? (
            <LoadingState label={t('Đang tải coverage...', 'Loading coverage...')} minHeight="min-h-[330px]" />
          ) : reportQuery.isError ? (
            <div className="p-4">
              <InlineAlert tone="danger">{getErrorMessage(reportQuery.error)}</InlineAlert>
              <button type="button" className="btn btn-secondary mt-3" onClick={() => reportQuery.refetch()}>
                {t('Thử lại', 'Retry')}
              </button>
            </div>
          ) : !report ? (
            <EmptyState
              icon={BarChart3}
              title={t('Chưa có coverage report', 'No coverage report yet')}
              hint={t('Upload jacoco.xml để phân tích coverage theo class/method.', 'Upload jacoco.xml to analyze coverage by class and method.')}
              minHeight="min-h-[330px]"
            />
          ) : report.gaps.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t('Không có coverage gap', 'No coverage gaps')}
              hint={t('Mọi method đều đạt ngưỡng line >= 80% và branch >= 70%.', 'All methods meet the line >= 80% and branch >= 70% gates.')}
              minHeight="min-h-[330px]"
            />
          ) : (
            <>
              <div className="divide-y divide-border-default">
                {report.gaps.map((gap) => (
                  <GapRow key={`${gap.className}.${gap.methodName}-${gap.methodId}`} gap={gap} />
                ))}
              </div>
              <div className="border-t border-border-default bg-brand-softer/40 p-4">
                {refinement.isError && (
                  <InlineAlert tone="danger">{getErrorMessage(refinement.error)}</InlineAlert>
                )}
                {refinableGapCount === 0 && (
                  <InlineAlert tone="warning">
                    {t(
                      `Không còn coverage gap Service đủ điều kiện bổ sung. ${nonRefinableGapCount} gap còn lại nằm ngoài phạm vi hoặc chưa đủ trace.`,
                      `No Service coverage gaps remain eligible for refinement. The remaining ${nonRefinableGapCount} gaps are out of scope or lack traceability.`,
                    )}
                  </InlineAlert>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-body-subtle">
                    {refinableGapCount > 0
                      ? t(
                          `AI sẽ bổ sung ${refinableGapCount} Service gap và tự sinh Unit Test cho vòng ${report.round + 1}; ${nonRefinableGapCount} gap không đủ điều kiện sẽ được bỏ qua.`,
                          `AI will refine ${refinableGapCount} Service gaps and generate their Unit Tests for round ${report.round + 1}; ${nonRefinableGapCount} ineligible gaps will be ignored.`,
                        )
                      : t('GreyTest hiện chỉ sinh Unit Test cho tầng Service.', 'GreyTest currently generates Unit Tests for the Service layer only.')}
                  </p>
                  <button
                    type="button"
                    disabled={refinement.isPending || !canRefine || refinableGapCount === 0}
                    onClick={() => refinement.mutate(undefined, {
                      onSuccess: () => navigate(`/projects/${projectId}/unit-tests`, {
                        state: {
                          workflowNotice: t(
                            `Đã sinh bổ sung Test Case và Unit Test cho vòng ${report.round + 1}.`,
                            `Supplemental Test Cases and Unit Tests for round ${report.round + 1} were generated.`,
                          ),
                        },
                      }),
                    })}
                    className="btn btn-brand shrink-0"
                  >
                    {refinement.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} strokeWidth={1.8} />}
                    {refinement.isPending
                      ? t('AI đang bổ sung...', 'AI is refining...')
                      : canRefine
                        ? refinableGapCount > 0
                          ? t(`Bắt đầu vòng ${report.round + 1}`, `Start round ${report.round + 1}`)
                          : t('Không có Service gap', 'No Service gaps')
                        : t('Upload JaCoCo vòng mới trước', 'Upload the new JaCoCo report first')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function GapRow({ gap }: { gap: CoverageGap }) {
  const missedLines = gap.missedLines.length
    ? gap.missedLines.slice(0, 5).join(', ') + (gap.missedLines.length > 5 ? ', ...' : '')
    : '-';
  return (
    <article className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[minmax(0,1fr)_120px_90px_150px] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs font-semibold text-heading">{gap.className}.{gap.methodName}</p>
        <p className="mt-1 text-xs leading-relaxed text-body-subtle">{gap.suggestion}</p>
      </div>
      <span className="font-mono text-xs text-body-subtle" title={gap.missedLines.join(', ')}>
        Lines {missedLines}
      </span>
      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        gap.risk === 'HIGH' ? 'bg-danger-soft text-fg-danger-strong' : 'bg-warning-soft text-fg-warning'
      }`}>
        {gap.risk === 'HIGH' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
        {gap.risk}
      </span>
      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        gap.refinable ? 'bg-success-soft text-fg-success-strong' : 'bg-neutral-secondary-medium text-body-subtle'
      }`}>
        {gap.refinable ? 'Service · Có thể bổ sung' : 'Không thể bổ sung'}
      </span>
    </article>
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
