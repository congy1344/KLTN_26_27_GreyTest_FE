import { Tag } from '../../../shared/components/Tag';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useLanguage } from '../../../shared/i18n/language';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';
import { parseApiDate } from '../../../shared/utils/date-time';
import { useCoverageReport, useSandboxRun, useStartCoverageRefinement, useUploadCoverage } from '../hooks/useCoverage';
import type { CoverageGap } from '../types';
import type { ProjectStatus } from '../../projects/types';
import { projectWorkflowPath } from '../../projects/utils/project-service';

// Hint chênh lệch so với vòng upload trước; vòng đầu chưa có gì để so nên không hiện
function deltaHint(current: number | undefined, previous: number | null | undefined, round: number | undefined, t: (vi: string, en: string) => string) {
  if (current == null || previous == null || round == null || round <= 1) return undefined;
  const delta = Math.round((current - previous) * 100) / 100;
  const sign = delta > 0 ? '+' : '';
  return t(`${sign}${delta}% so với vòng trước`, `${sign}${delta}% vs previous round`);
}

export function CoveragePanel({ projectId, projectStatus = 'COVERAGE_ANALYZED', servicePath }: { projectId: number; projectStatus?: ProjectStatus; servicePath?: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const reportQuery = useCoverageReport(projectId, servicePath);
  const upload = useUploadCoverage(projectId, servicePath);
  const refinement = useStartCoverageRefinement(projectId, servicePath);
  const sandbox = useSandboxRun(projectId, servicePath);
  const report =reportQuery.data ?? null;
  const serviceCoverage = report?.serviceCoverage ?? null;
  const fileName = selectedFile?.name ?? '';
  const canRefine = projectStatus === 'COVERAGE_ANALYZED' || projectStatus === 'COMPLETED';
  const visibleGaps = report?.gaps.filter((gap) => gap.refinable) ?? [];
  const refinableGapCount = visibleGaps.length;

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

  const metrics: { label: string; value: number | null | undefined; hint?: string; success?: boolean }[] = [
    { label: 'JaCoCo Line Coverage', value: report?.lineCoverage, hint: deltaHint(report?.lineCoverage, report?.previousLineCoverage, report?.round, t) },
    { label: 'JaCoCo Branch Coverage', value: report?.branchCoverage, hint: deltaHint(report?.branchCoverage, report?.previousBranchCoverage, report?.round, t) },
    { label: 'Requirement Coverage', value: report?.requirementCoverage, hint: deltaHint(report?.requirementCoverage, report?.previousRequirementCoverage, report?.round, t), success: true },
    { label: 'Service Line Coverage', value: serviceCoverage?.lineCoverage,
      hint: serviceCoverage && serviceCoverage.coveredLines != null && serviceCoverage.totalLines != null ? t(`${serviceCoverage.coveredLines}/${serviceCoverage.totalLines} dòng`, `${serviceCoverage.coveredLines}/${serviceCoverage.totalLines} lines`) : undefined },
    { label: 'Service Branch Coverage', value: serviceCoverage?.branchCoverage,
      hint: serviceCoverage && serviceCoverage.coveredBranches != null && serviceCoverage.totalBranches != null ? t(`${serviceCoverage.coveredBranches}/${serviceCoverage.totalBranches} nhánh`, `${serviceCoverage.coveredBranches}/${serviceCoverage.totalBranches} branches`) : undefined },
  ];
  // Tỉ lệ test đạt của lượt chạy sandbox gần nhất (test không đạt có thể là lệch nghiệp vụ, xem thông báo bên dưới)
  const runStatus = sandbox.state?.status;
  const failedTests = sandbox.state?.failures?.slice(0, 20) ?? [];
  // Backend vừa khởi động lại thì trạng thái trong bộ nhớ là IDLE: dùng số test đã lưu cùng báo cáo coverage.
  const run = sandbox.state && sandbox.state.status !== 'IDLE' ? sandbox.state
    : report?.testsRun ? { status: 'SUCCEEDED', tests: report.testsRun, failed: report.testsFailed ?? 0 } : undefined;
  if (run && run.status !== 'RUNNING' && run.tests > 0) {
    metrics.push({ label: t('Test đạt', 'Tests passed'), value: Math.round((run.tests - run.failed) / run.tests * 1000) / 10,
      hint: t(`${run.tests - run.failed}/${run.tests} test đạt, ${run.failed} không đạt`, `${run.tests - run.failed}/${run.tests} passed, ${run.failed} failed`), success: true });
  }
  return (
    <section className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-body-subtle">{t('Đo bằng JaCoCo và đối chiếu với Business Rule. Chỉ số Service phản ánh phạm vi GreyTest sinh Unit Test.', 'Measured by JaCoCo and traced to Business Rules. Service metrics reflect the scope of generated Unit Tests.')}</p>
        <button type="button" className="btn btn-secondary" disabled={!report || !canRefine}
          onClick={() => navigate(projectWorkflowPath(projectId, 'traceability', servicePath), { state: { workflowNotice: t('Coverage đã được phân tích. Chuyển sang bước Traceability.', 'Coverage has been analyzed. Continue with Traceability.') } })}>
          {t('Tiếp tục đến Traceability', 'Continue to Traceability')}<ArrowRight size={14} strokeWidth={1.8} />
        </button>
      </div>
      {metrics.some((metric) => metric.value != null) && <section aria-label={t('Chỉ số coverage', 'Coverage metrics')} className="grid grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-3">
        {metrics.filter((metric) => metric.value != null).map((metric) => <div key={metric.label} className="rounded-base border border-border-default bg-neutral-primary-soft p-4">
          <p className="text-xs font-semibold text-body">{metric.label}</p>
          <p className="mb-2.5 mt-1.5 font-display text-[30px] font-semibold text-heading">{metric.value}%</p>
          <div className="h-1.5 overflow-hidden rounded-base bg-neutral-secondary-medium">
            <div className={`h-1.5 ${metric.success ? 'bg-success' : 'bg-brand'}`} style={{ width: `${metric.value}%` }} />
          </div>
          {metric.hint && <p className="mt-2 text-xs text-body-subtle">{metric.hint}</p>}
        </div>)}
      </section>}
      {failedTests.length > 0 && <section className="rounded-base border border-border-default bg-neutral-primary-soft p-4">
        <h2 className="font-display text-lg font-semibold text-heading">{t('Test không đạt ở lượt chạy gần nhất', 'Failed tests in the latest run')}</h2>
        <ul className="mt-2 divide-y divide-border-default">
          {failedTests.map((test, index) => <li key={`${test.className}#${test.methodName}-${index}`} className="break-words py-2 text-sm">
            <span className="font-mono text-heading">{test.className}#{test.methodName}</span>
            {test.testCaseCode && <Tag className="ml-2 font-mono">{test.testCaseCode}</Tag>}
            <p className="mt-1 text-body-subtle">{test.message}</p>
          </li>)}
        </ul>
        {sandbox.state && sandbox.state.failed > failedTests.length && <p className="mt-2 text-xs text-body-subtle">
          {t(`Hiển thị ${failedTests.length}/${sandbox.state.failed} test không đạt`, `Showing ${failedTests.length}/${sandbox.state.failed} failed tests`)}
        </p>}
      </section>}
      <section className="rounded-base border border-border-default bg-neutral-primary-soft p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-[1_1_240px]">
            <h2 className="font-display text-lg font-semibold text-heading">JaCoCo XML</h2>
            <p className="mt-1 font-mono text-xs text-body-subtle">target/site/jacoco/jacoco.xml</p>
          </div>
          <input id={`coverage-file-${projectId}`} aria-label={t('Chọn JaCoCo XML', 'Choose JaCoCo XML')} className="sr-only" type="file" accept=".xml,text/xml"
            onChange={(event) => { setSelectedFile(event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ''; upload.reset(); }} />
          <label htmlFor={`coverage-file-${projectId}`} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-base border border-dashed border-border-default-strong px-4 py-2 text-sm text-body hover:bg-neutral-secondary-soft">
            <UploadCloud size={16} /><span className="break-all font-mono">{fileName || t('Chọn file jacoco.xml', 'Choose jacoco.xml')}</span>
          </label>
          <button className="btn btn-secondary" disabled={!fileName || upload.isPending} onClick={handleUpload}>
            {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            {upload.isPending ? t('Đang phân tích...', 'Analyzing...') : t('Upload và phân tích coverage', 'Upload and analyze coverage')}
          </button>
        </div>
        {upload.isError && <div className="mt-3"><InlineAlert tone="danger">{getErrorMessage(upload.error)}</InlineAlert></div>}
        {showSuccess && <div className="mt-3"><InlineAlert tone="success">{t('Upload và phân tích thành công', 'Uploaded and analyzed successfully')}</InlineAlert></div>}
      </section>
      <section aria-label={t('Nhánh chưa được phủ', 'Uncovered branches')} className="overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-default px-4 py-3.5">
          <h2 className="flex-1 font-display text-lg font-semibold text-heading">{t('Nhánh chưa được phủ', 'Uncovered branches')}</h2>
          {report && <Tag className="font-mono tabular-nums">{t(`Vòng ${report.round}`, `Round ${report.round}`)}</Tag>}
          {report && visibleGaps.length > 0 && <button type="button" className="btn btn-secondary" disabled={refinement.isPending || runStatus === 'RUNNING' || !canRefine || refinableGapCount === 0}
            onClick={() => refinement.mutate(undefined, { onSuccess: () => navigate(projectWorkflowPath(projectId, 'unit-tests', servicePath), { state: { workflowNotice: t(`Đã sinh bổ sung Test Case và Unit Test cho vòng ${report.round + 1}. GreyTest đang tự chạy test để cập nhật coverage.`, `Supplemental Test Cases and Unit Tests for round ${report.round + 1} were generated. GreyTest is running the tests to update coverage.`) } }) })}>
            {refinement.isPending || runStatus === 'RUNNING' ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
            {refinement.isPending ? t('AI đang bổ sung...', 'AI is refining...') : runStatus === 'RUNNING' ? t('Đang chạy test trên server...', 'Running tests on the server...') : canRefine ? t('Sinh Test Case bổ sung', 'Generate supplemental Test Cases') : t('Upload JaCoCo vòng mới trước', 'Upload the new JaCoCo report first')}
          </button>}
        </div>
        {report && <p className="px-4 py-3 text-xs text-body-subtle">{t(`Upload lúc ${parseApiDate(report.uploadedAt).toLocaleString('vi-VN')}`, `Uploaded at ${parseApiDate(report.uploadedAt).toLocaleString('en-US')}`)}</p>}
        {reportQuery.isLoading ? <LoadingState label={t('Đang tải coverage...', 'Loading coverage...')} minHeight="min-h-[180px]" />
          : reportQuery.isError ? <div className="p-4"><InlineAlert tone="danger">{getErrorMessage(reportQuery.error)}</InlineAlert><button type="button" className="btn btn-secondary mt-3" onClick={() => reportQuery.refetch()}>{t('Thử lại', 'Retry')}</button></div>
          : !report ? <EmptyState icon={BarChart3} title={t('Chưa có coverage report', 'No coverage report yet')} hint={t('Upload jacoco.xml để phân tích coverage theo class/method.', 'Upload jacoco.xml to analyze coverage by class and method.')} minHeight="min-h-[180px]" />
          : !visibleGaps.length ? <EmptyState icon={CheckCircle2} title={t('Không có coverage gap cần bổ sung', 'No coverage gaps to refine')} hint={t('Mọi method trong phạm vi đều đạt ngưỡng line >= 80% và branch >= 70%.', 'All scoped methods meet the line >= 80% and branch >= 70% gates.')} minHeight="min-h-[180px]" />
          : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-body-subtle"><tr>
              <th scope="col" className="px-4 py-2.5 font-semibold">Method</th><th scope="col" className="px-4 py-2.5 font-semibold">{t('Dòng thiếu', 'Missed lines')}</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">{t('Nhánh thiếu', 'Missed branches')}</th><th scope="col" className="px-4 py-2.5 font-semibold">{t('Mức', 'Risk')}</th>
            </tr></thead>
            <tbody>{visibleGaps.map((gap) => <GapRow key={`${gap.className}.${gap.methodName}-${gap.methodId}`} gap={gap} />)}</tbody>
          </table></div>}
        {refinement.isError && <div className="p-4"><InlineAlert tone="danger">{getErrorMessage(refinement.error)}</InlineAlert></div>}
        {report && visibleGaps.length > 0 && <p className="px-4 py-3 text-xs text-body-subtle">{t(`AI sẽ bổ sung ${refinableGapCount} Service gap, sinh Unit Test rồi tự chạy lại cho vòng ${report.round + 1}.`, `AI will refine ${refinableGapCount} Service gaps, generate their Unit Tests and rerun them for round ${report.round + 1}.`)}</p>}
      </section>
    </section>
  );
}

function GapRow({ gap }: { gap: CoverageGap }) {
  const { language, t } = useLanguage();
  return <tr className="border-t border-border-default">
    <td className="px-4 py-3 align-top">
      <p className="font-mono text-xs text-heading">{gap.className}.{gap.methodName}</p>
      <p className="mt-1 text-xs text-body-subtle">{gap.suggestion}</p>
      <p className="mt-1 text-xs text-fg-success-strong">{gap.refinable ? t('Service, Có thể bổ sung', 'Service, Refinable') : t('Có thể bổ sung', 'Refinable')}</p>
    </td>
    <td className="px-4 py-3 align-top font-mono text-xs text-body">{gap.missedLines.join(', ')}</td>
    <td className="px-4 py-3 align-top font-mono text-xs text-body">{gap.missedBranches.join(', ')}</td>
    <td className="px-4 py-3 align-top"><Tag>{formatSemanticLabel(gap.risk, language)}</Tag></td>
  </tr>;
}
