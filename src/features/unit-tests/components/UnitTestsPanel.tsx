import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, Copy, Download, FileCode2, Loader2, ListFilter, Search, ShieldCheck } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AiGenerationProgress } from '../../../shared/components/AiGenerationProgress';
import { MetricCard } from '../../../shared/components/MetricCard';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import { useTestCases } from '../../test-cases/hooks/useTestCases';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import { useAnalysis } from '../../projects/hooks/useProjects';
import { buildRuleSourceIndex } from '../../projects/utils/source-trace';
import { downloadUnitTestsZip } from '../api/unit-test-api';
import { useGenerateUnitTests, useUnitTestFiles, useUnitTests } from '../hooks/useUnitTests';
import type { UnitTestFile } from '../types';
import { useLanguage } from '../../../shared/i18n/language';
import { useGenerationProgress } from '../../../shared/hooks/useGenerationProgress';
import { displaySourcePath } from '../../../shared/utils/source-path';
import { projectWorkflowPath } from '../../projects/utils/project-service';

export function UnitTestsPanel({ projectId = 0, servicePath }: { projectId?: number; servicePath?: string }) {
  const navigate = useNavigate();
  const cases = useTestCases(projectId, servicePath);
  const plans = useTestPlans(projectId, servicePath);
  const rules = useBusinessRules(projectId, servicePath);
  const analysis = useAnalysis(projectId);
  const tests = useUnitTests(projectId, servicePath);
  const files = useUnitTestFiles(projectId, servicePath);
  const generate = useGenerateUnitTests(projectId, servicePath);
  const generationProgress = useGenerationProgress(projectId, 'UNIT_TEST', generate.isPending);
  const generationRunning = generationProgress.projectRunning
    ?? (generationProgress.data?.status === 'QUEUED' || generationProgress.data?.status === 'RUNNING');
  const [caseId, setCaseId] = useState('');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const { t } = useLanguage();
  const approvedCases = useMemo(() => (cases.data ?? []).filter((item) => item.status === 'APPROVED'), [cases.data]);
  const approvedCaseById = useMemo(
    () => new Map(approvedCases.map((item) => [item.id, item])),
    [approvedCases],
  );
  const generatedCaseIds = useMemo(
    () => new Set((tests.data ?? []).map((item) => item.testCaseId)),
    [tests.data],
  );
  const coveredCount = approvedCases.filter((item) => generatedCaseIds.has(item.id)).length;
  const missingCount = approvedCases.length - coveredCount;
  const unexpectedCount = Math.max(0, (tests.data ?? []).length - coveredCount);
  const coverageHint = approvedCases.length === 0
    ? t('Chưa có Test Case được approve', 'No approved Test Cases')
    : [
      missingCount > 0 ? t(`Thiếu ${missingCount} case`, `${missingCount} cases missing`) : '',
      unexpectedCount > 0 ? t(`Trùng/thừa ${unexpectedCount} test`, `${unexpectedCount} duplicate/extra tests`) : '',
    ].filter(Boolean).join(' · ') || t('Đã khớp đủ 1:1', 'Exact 1:1 match');
  const coverageWarning = [
    missingCount > 0 ? t(`thiếu ${missingCount} case`, `${missingCount} cases missing`) : '',
    unexpectedCount > 0 ? t(`trùng/thừa ${unexpectedCount} test`, `${unexpectedCount} duplicate/extra tests`) : '',
  ].filter(Boolean).join(', ');
  const coverageReady = approvedCases.length > 0 && missingCount === 0 && unexpectedCount === 0;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(() => (tests.data ?? []).filter((item) => {
    if (caseId && String(item.testCaseId) !== caseId) return false;
    if (!normalizedQuery) return true;
    const testCase = approvedCaseById.get(item.testCaseId);
    return [item.testMethodName, item.testClassName, item.packageName, testCase?.caseCode, testCase?.description]
      .some((value) => value?.toLowerCase().includes(normalizedQuery));
  }), [tests.data, caseId, normalizedQuery, approvedCaseById]);
  const active = visible.find((item) => item.id === activeId) ?? visible[0];
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis.data, rules.data ?? []),
    [analysis.data, rules.data],
  );
  const traceForCase = (testCaseId: number) => {
    const testCase = (cases.data ?? []).find((item) => item.id === testCaseId);
    const plan = (plans.data ?? []).find((item) => item.id === testCase?.testPlanId);
    const ruleIds = plan?.coveredRuleIds?.length
      ? plan.coveredRuleIds
      : plan ? [plan.businessRuleId] : [];
    const sourceRules = ruleIds
      .map((ruleId) => (rules.data ?? []).find((rule) => rule.id === ruleId))
      .filter((rule) => rule != null);
    return {
      label: [
        ...sourceRules.map((rule) => `${rule.ruleCode}${rule.sourceBranchId ? ` [${rule.sourceBranchId}]` : ''}`),
        plan?.planCode,
        testCase?.caseCode,
      ].filter(Boolean).join(' -> '),
      sources: sourceRules.map((rule) => sourceTraceByRule.get(rule.id)).filter((source) => source != null),
    };
  };
  const activeTrace = active ? traceForCase(active.testCaseId) : null;
  // Mỗi record là 1 @Test method; file hiển thị là bản đã gộp các method cùng class
  const activeFile = active ? (files.data ?? []).find((file) => file.filePath === active.filePath) : undefined;
  const error = cases.error ?? plans.error ?? rules.error ?? analysis.error
    ?? tests.error ?? files.error ?? generate.error;

  const handleDownload = async () => {
    try {
      setDownloadError('');
      setDownloading(true);
      await downloadUnitTestsZip(projectId, servicePath);
    } catch (downloadException) {
      setDownloadError(getErrorMessage(downloadException, true));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-heading">Unit Tests</h3><p className="mt-1 text-xs text-body-subtle">{t('AI sinh JUnit/Mockito từ Test Case đã approve và lưu về backend.', 'AI generates JUnit/Mockito tests from approved Test Cases and persists them in the backend.')}</p></div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          <button className="btn btn-brand" disabled={generate.isPending || generationRunning || approvedCases.length === 0} onClick={() => generate.mutate()}>
            {generate.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} {t('AI sinh Unit Test', 'Generate with AI')}
          </button>
          <AiGenerationProgress
            active={generate.isPending || generationRunning || generationProgress.showProgress}
            label={t('Tiến trình AI của dự án', 'Project AI progress')}
            progress={generationProgress.projectProgress ?? generationProgress.data}
          />
          <button
            className="btn btn-brand shrink-0"
            disabled={generate.isPending || generationRunning || !coverageReady}
            onClick={() => navigate(projectWorkflowPath(projectId, 'coverage', servicePath), {
              state: { workflowNotice: t('Unit Test đã sẵn sàng. Chuyển sang bước Coverage.', 'Unit Tests are ready. Continue with Coverage.') },
            })}
          >
            {t('Tiếp tục đến Coverage', 'Continue to Coverage')} <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CheckCircle2} label={t('Test Case đã approve', 'Approved Cases')} value={approvedCases.length} />
        <MetricCard icon={FileCode2} label={t('Test file', 'Test Files')} value={(files.data ?? []).length} />
        <MetricCard icon={ShieldCheck} label={t('Unit test đã sinh', 'Generated Tests')} value={(tests.data ?? []).length} />
        <MetricCard icon={ShieldCheck} label={t('Case đã có test', 'Cases Covered')} value={`${coveredCount}/${approvedCases.length}`} tone={coverageReady ? 'brand' : 'neutral'} hint={coverageHint} />
      </div>
      <div className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        {error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}
        {downloadError && <InlineAlert tone="danger">{downloadError}</InlineAlert>}
        {(tests.data ?? []).length > 0 && (coverageReady
          ? <InlineAlert tone="success">{t('Đã kiểm chứng đủ: mỗi Test Case được approve có đúng một Unit Test.', 'Verified: every approved Test Case has exactly one Unit Test.')}</InlineAlert>
          : <InlineAlert tone="warning">{t(`Chưa nên sang Coverage: ${coverageWarning}.`, `Not ready for Coverage: ${coverageWarning}.`)}</InlineAlert>)}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ListFilter size={16} className="mt-0.5 text-fg-brand-strong" />
            <div>
              <p className="text-sm font-semibold text-heading">{t('Tìm và đối chiếu Unit Test', 'Find and verify Unit Tests')}</p>
              <p className="mt-0.5 text-xs text-body-subtle">{t('ZIP kèm công cụ tạo jacoco.xml. Giải nén đè vào thư mục module Maven hoặc Gradle (chứa pom.xml/build.gradle) để file test vào đúng src/test/java.', 'ZIP includes a jacoco.xml runner. Extract directly into a Maven or Gradle module root so tests land in src/test/java.')}</p>
            </div>
          </div>
          <div className="flex min-w-0 max-w-full">
            <button className="btn btn-secondary shrink-0" disabled={downloading || (tests.data ?? []).length === 0} onClick={handleDownload}>
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {t('Tải tất cả file + Coverage (.zip)', 'Download tests + Coverage (.zip)')}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <label className="relative block">
            <span className="sr-only">{t('Tìm theo case, class hoặc method', 'Search by case, class, or method')}</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle" />
            <input aria-label={t('Tìm Unit Test', 'Search Unit Tests')} className="form-input pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setActiveId(null); }} placeholder={t('Tìm TC-001, UserServiceTest, method...', 'Search TC-001, UserServiceTest, method...')} />
          </label>
          <select aria-label={t('Lọc Test Case', 'Filter by Test Case')} className="form-input" value={caseId} onChange={(event) => { setCaseId(event.target.value); setActiveId(null); }}>
            <option value="">{t('Tất cả Test Case đã approve', 'All approved Test Cases')}</option>
            {approvedCases.map((item) => <option key={item.id} value={item.id}>{item.caseCode} - {item.description}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft shadow-sm xl:sticky xl:top-4">
          <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-body-subtle">{t('Danh sách method', 'Method index')}</p>
            <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-xs font-semibold text-heading">{visible.length}</span>
          </div>
          {tests.isLoading ? (
            <LoadingState label={t('Đang tải Unit Test...', 'Loading Unit Tests...')} minHeight="min-h-[160px]" />
          ) : visible.length === 0 ? (
            <EmptyState icon={FileCode2} title={t('Chưa có Unit Test', 'No Unit Tests yet')} hint={t('Approve Test Case rồi bấm "AI sinh Unit Test".', 'Approve Test Cases, then select "Generate with AI".')} minHeight="min-h-[200px]" />
          ) : visible.map((item, index) => {
            const testCase = approvedCaseById.get(item.testCaseId);
            return (
            <button
              key={item.id}
              type="button"
              aria-label={`${testCase?.caseCode ?? `Case ${item.testCaseId}`} ${item.testMethodName}`}
              aria-current={active?.id === item.id ? 'true' : undefined}
              className={`block w-full border-b border-border-default px-4 py-3 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${active?.id === item.id ? 'bg-brand-softer' : 'hover:bg-neutral-secondary-soft/40'}`}
              onClick={() => setActiveId(item.id)}
            >
              <span className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tabular-nums text-body-subtle">{String(index + 1).padStart(2, '0')}</span>
                <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">{testCase?.caseCode ?? `#${item.testCaseId}`}</span>
                <span className="ml-auto text-[10px] font-semibold uppercase text-body-subtle">{item.generationType?.replace(/_/g, ' ')}</span>
              </span>
              <span className="mt-2 block break-all font-mono text-xs font-semibold text-heading">{item.testMethodName}</span>
              <span className="mt-1 block truncate text-xs text-body-subtle">{item.testClassName}</span>
              {testCase?.description && <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-body-subtle">{testCase.description}</span>}
            </button>
          );})}
        </div>
        <div className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          {!active ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-body-subtle">{t('Chọn method để xem file test.', 'Select a method to view its test file.')}</div>
          ) : files.isLoading ? (
            <LoadingState label={t('Đang gộp file test...', 'Merging test files...')} minHeight="min-h-[360px]" />
          ) : activeFile ? (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-body-subtle">{t('Traceability đang kiểm chứng', 'Traceability under review')}</p>
                <p className="mt-1 break-words font-mono text-xs font-semibold text-fg-brand-strong">{activeTrace?.label}</p>
                <p className="mt-1 text-xs text-body-subtle">{approvedCaseById.get(active.testCaseId)?.description}</p>
                <div className="grid gap-2 lg:grid-cols-2">
                  {activeTrace?.sources.map((source, index) => (
                    <SourceTrace key={`${source.filePath}:${source.methodName}:${index}`} value={source} compact />
                  ))}
                </div>
              </div>
              <UnitTestFileView file={activeFile} highlightMethod={active.testMethodName} />
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-body-subtle">{t('Không tìm thấy file test.', 'Test file not found.')}</div>
          )}
        </div>
      </div>
    </section>
  );
}

function UnitTestFileView({ file, highlightMethod }: { file: UnitTestFile; highlightMethod: string }) {
  const [copied, setCopied] = useState(false);
  const highlightedLineRef = useRef<HTMLLIElement>(null);
  const { t } = useLanguage();

  // Tự ẩn trạng thái "Đã copy" sau 2 giây
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const codeLines = file.sourceCode.split('\n');
  const highlightedLine = useMemo(() => {
    const escapedMethod = highlightMethod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const declaration = new RegExp(`\\bvoid\\s+${escapedMethod}\\s*\\(`).exec(file.sourceCode);
    return declaration ? file.sourceCode.slice(0, declaration.index).split('\n').length - 1 : -1;
  }, [file.sourceCode, highlightMethod]);

  useEffect(() => {
    highlightedLineRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [file.filePath, highlightedLine, highlightMethod]);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(file.sourceCode);
    setCopied(true);
  };

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{file.testClassName}</p>
          <p className="truncate font-mono text-xs text-body-subtle" title={file.filePath}>
            {displaySourcePath(file.filePath)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
              {t(`${file.testCount} @Test method`, `${file.testCount} @Test methods`)}
            </span>
            {file.caseCodes.map((code) => (
              <span key={code} className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">{code}</span>
            ))}
          </div>
        </div>
        <button className="btn btn-secondary px-3 py-2" onClick={copy}><Copy size={14} />{copied ? t('Đã copy', 'Copied') : 'Copy'}</button>
      </div>
      <div className="mb-2 flex items-center gap-2 text-[11px] text-body-subtle">
        <span className="h-2 w-2 rounded-full bg-brand-strong" />
        {t(`Dòng màu xanh là method của case đang chọn: ${highlightMethod}`, `The highlighted line is the selected case method: ${highlightMethod}`)}
      </div>
      <div aria-label="Generated test code" role="region" tabIndex={0} className="max-h-[620px] min-h-[360px] overflow-auto rounded-default border border-border-default bg-neutral-primary p-3 font-mono text-xs leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        <ol className="min-w-max">
          {codeLines.map((line, index) => (
            <li
              key={`${index}-${line}`}
              aria-current={index === highlightedLine ? 'true' : undefined}
              ref={index === highlightedLine ? highlightedLineRef : undefined}
              className={`grid grid-cols-[3rem_minmax(0,1fr)] rounded-sm px-2 ${index === highlightedLine ? 'bg-brand-softer text-heading' : 'text-body'}`}
            >
              <span aria-hidden="true" className="select-none border-r border-border-default pr-3 text-right tabular-nums text-body-subtle">{index + 1}</span>
              <code className="whitespace-pre pl-4">{line || ' '}</code>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
