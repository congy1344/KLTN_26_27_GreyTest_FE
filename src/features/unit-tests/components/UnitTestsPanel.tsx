import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, FileCode2, Loader2, ListFilter, Play, RotateCcw, Search, ShieldCheck } from 'lucide-react';
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
import type { UnitTest, UnitTestFile } from '../types';
import { useLanguage } from '../../../shared/i18n/language';
import { useGenerationProgress } from '../../../shared/hooks/useGenerationProgress';
import { displaySourcePath } from '../../../shared/utils/source-path';
import { projectWorkflowPath } from '../../projects/utils/project-service';
import { useSourceUpdateImpact } from '../../projects/hooks/useSourceUpdateImpact';
import type { ProjectStatus } from '../../projects/types';

const PAGE_SIZE = 8;

export function UnitTestsPanel({
  projectId = 0,
  servicePath,
  projectStatus,
}: {
  projectId?: number;
  servicePath?: string;
  projectStatus?: ProjectStatus;
}) {
  const navigate = useNavigate();
  const coverageNavigatedKey = `greytest.unit-tests-coverage-navigated.${projectId}${servicePath ? `.${servicePath}` : ''}`;
  const [coverageNavigated, setCoverageNavigated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(coverageNavigatedKey) === 'true';
  });

  const isCoverageVisited = coverageNavigated || projectStatus === 'COVERAGE_ANALYZED' || projectStatus === 'COMPLETED';
  const {
    methodDiffMap,
    getMethodDiff,
    affectedUnitTestIds,
    affectedCaseIds,
    affectedPlanIds,
    affectedRuleIds,
    addedUnitTestIds,
    modifiedUnitTestIds,
    deletedUnitTestIds,
    addedCaseIds,
    modifiedCaseIds,
    deletedCaseIds,
    addedPlanIds,
    modifiedPlanIds,
    deletedPlanIds,
    addedRuleIds,
    modifiedRuleIds,
    deletedRuleIds,
  } = useSourceUpdateImpact(projectId);
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
  const [userSelectedMethod, setUserSelectedMethod] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadError, setDownloadError] = useState('');
  const { t } = useLanguage();
  const eligibleCases = cases.data ?? [];
  const approvedCases = useMemo(() => (cases.data ?? []).filter((item) => item.status === 'APPROVED'), [cases.data]);
  const approvedCaseById = useMemo(
    () => new Map((cases.data ?? []).map((item) => [item.id, item])),
    [cases.data],
  );
  const generatedCaseIds = useMemo(
    () => new Set((tests.data ?? []).map((item) => item.testCaseId)),
    [tests.data],
  );
  const coveredCount = eligibleCases.filter((item) => generatedCaseIds.has(item.id)).length;
  const missingCount = eligibleCases.length - coveredCount;
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
  const visible = useMemo(() => {
    const list = (tests.data ?? []).filter((item) => {
      if (caseId && String(item.testCaseId) !== caseId) return false;
      if (!normalizedQuery) return true;
      const testCase = approvedCaseById.get(item.testCaseId);
      return [item.testMethodName, item.testClassName, item.packageName, testCase?.caseCode, testCase?.description]
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });

    const getUnitTestDiffPriority = (item: UnitTest) => {
      const testCase = (cases.data ?? []).find((c) => c.id === item.testCaseId);
      const testPlan = (plans.data ?? []).find((p) => p.id === testCase?.testPlanId);
      const ruleIds = testPlan?.coveredRuleIds?.length
        ? testPlan.coveredRuleIds
        : testPlan ? [testPlan.businessRuleId] : [];
      const coveredRules = ruleIds.map((rId) => (rules.data ?? []).find((r) => r.id === rId)).filter(Boolean);
      const ruleDiffs = coveredRules.map((rule) => {
        if (!rule?.methodId) return undefined;
        const method = (analysis.data?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule.methodId);
        const javaClass = (analysis.data?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule.methodId));
        return method
          ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
             || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
             || methodDiffMap[method.methodName])
          : undefined;
      });

      if (isCoverageVisited) return 0;

      const hasAdded = addedUnitTestIds.has(item.id)
        || item.generationType === 'NEW_TEST'
        || (testCase ? addedCaseIds.has(testCase.id) : false)
        || (testPlan ? addedPlanIds.has(testPlan.id) : false)
        || ruleDiffs.includes('ADDED')
        || coveredRules.some((r) => r && addedRuleIds.has(r.id));
      if (hasAdded) return 2;

      const hasModified = modifiedUnitTestIds.has(item.id)
        || item.generationType === 'INCREMENTAL'
        || item.generationType === 'IMPROVE_EXISTING_TEST'
        || ruleDiffs.includes('MODIFIED')
        || affectedUnitTestIds.has(item.id)
        || (testCase ? modifiedCaseIds.has(testCase.id) || affectedCaseIds.has(testCase.id) : false)
        || (testPlan ? modifiedPlanIds.has(testPlan.id) || affectedPlanIds.has(testPlan.id) : false)
        || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)));
      if (hasModified) return 1;

      return 0;
    };

    return list.sort((a, b) => {
      const priorityA = getUnitTestDiffPriority(a);
      const priorityB = getUnitTestDiffPriority(b);
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      const tcA = approvedCaseById.get(a.testCaseId)?.caseCode ?? '';
      const tcB = approvedCaseById.get(b.testCaseId)?.caseCode ?? '';
      if (tcA && tcB && tcA !== tcB) {
        return tcA.localeCompare(tcB, undefined, { numeric: true });
      }
      return a.testMethodName.localeCompare(b.testMethodName);
    });
  }, [
    tests.data,
    caseId,
    normalizedQuery,
    approvedCaseById,
    cases.data,
    plans.data,
    rules.data,
    analysis.data,
    isCoverageVisited,
    addedUnitTestIds,
    modifiedUnitTestIds,
    affectedUnitTestIds,
    addedCaseIds,
    modifiedCaseIds,
    affectedCaseIds,
    addedPlanIds,
    modifiedPlanIds,
    affectedPlanIds,
    addedRuleIds,
    modifiedRuleIds,
    affectedRuleIds,
    methodDiffMap,
    getMethodDiff,
  ]);
  const totalPages = Math.ceil(visible.length / PAGE_SIZE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedVisible = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
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

  const handleGenerate = (incremental: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(coverageNavigatedKey);
      } catch {
        // ignore
      }
    }
    setCoverageNavigated(false);
    generate.mutate(incremental);
  };

  const handleContinueToCoverage = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(coverageNavigatedKey, 'true');
      } catch {
        // ignore
      }
    }
    setCoverageNavigated(true);
    navigate(projectWorkflowPath(projectId, 'coverage', servicePath), {
      state: { workflowNotice: t('Unit Test đã sẵn sàng. Chuyển sang bước Coverage.', 'Unit Tests are ready. Continue with Coverage.') },
    });
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-heading">Unit Tests</h3><p className="mt-1 text-xs text-body-subtle">{t('AI sinh JUnit/Mockito từ Test Case đã approve và lưu về backend.', 'AI generates JUnit/Mockito tests from approved Test Cases and persists them in the backend.')}</p></div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          {coveredCount > 0 && missingCount > 0 ? (
            <>
              <button
                className="btn btn-brand"
                disabled={generate.isPending || generationRunning || missingCount === 0}
                onClick={() => handleGenerate(true)}
                title={t(`Tiếp tục sinh cho ${missingCount} Test Case chưa có unit test`, `Continue generating for ${missingCount} remaining Test Cases`)}
              >
                {generate.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {t(`Tiếp tục sinh (${missingCount} case)`, `Continue (${missingCount} cases)`)}
              </button>
              <button
                className="btn btn-secondary"
                disabled={generate.isPending || generationRunning || eligibleCases.length === 0}
                onClick={() => handleGenerate(false)}
                title={t('Xóa toàn bộ Unit Test cũ và sinh lại từ đầu', 'Regenerate all unit tests from scratch')}
              >
                <RotateCcw size={14} /> {t('Sinh lại từ đầu', 'Regenerate all')}
              </button>
            </>
          ) : (
            <button
              className={coveredCount > 0 && missingCount === 0 ? "btn btn-secondary" : "btn btn-brand"}
              disabled={generate.isPending || generationRunning || eligibleCases.length === 0}
              onClick={() => handleGenerate(false)}
            >
              {generate.isPending || generationRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : coveredCount > 0 ? (
                <RotateCcw size={14} />
              ) : (
                <Bot size={14} />
              )}
              {coveredCount > 0
                ? t('Sinh lại toàn bộ', 'Regenerate all')
                : t('AI sinh Unit Test', 'Generate with AI')}
            </button>
          )}
          <AiGenerationProgress
            projectId={projectId}
            active={generate.isPending || generationRunning || generationProgress.showProgress}
            label={t('Tiến trình AI của dự án', 'Project AI progress')}
            progress={generationProgress.projectProgress ?? generationProgress.data}
            onResume={() => handleGenerate(true)}
          />
          <button
            className="btn btn-brand shrink-0"
            disabled={generate.isPending || generationRunning || !coverageReady}
            onClick={handleContinueToCoverage}
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
          ? <InlineAlert key="coverage-ready" tone="success" autoDismissMs={5000}>{t('Đã kiểm chứng đủ: mỗi Test Case được approve có đúng một Unit Test.', 'Verified: every approved Test Case has exactly one Unit Test.')}</InlineAlert>
          : <InlineAlert key={coverageWarning} tone="warning" autoDismissMs={5000}>{t(`Chưa nên sang Coverage: ${coverageWarning}.`, `Not ready for Coverage: ${coverageWarning}.`)}</InlineAlert>)}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <ListFilter size={16} className="mt-0.5 shrink-0 text-fg-brand-strong" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-heading">{t('Tìm và đối chiếu Unit Test', 'Find and verify Unit Tests')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-body-subtle">{t('ZIP kèm công cụ tạo jacoco.xml. Giải nén đè vào thư mục module Maven hoặc Gradle (chứa pom.xml/build.gradle) để file test vào đúng src/test/java.', 'ZIP includes a jacoco.xml runner. Extract directly into a Maven or Gradle module root so tests land in src/test/java.')}</p>
            </div>
          </div>
          <div className="shrink-0">
            <button className="btn btn-secondary w-full sm:w-auto" disabled={downloading || (tests.data ?? []).length === 0} onClick={handleDownload}>
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {t('Tải tất cả file + Coverage (.zip)', 'Download tests + Coverage (.zip)')}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <label className="relative block">
            <span className="sr-only">{t('Tìm theo case, class hoặc method', 'Search by case, class, or method')}</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle" />
            <input aria-label={t('Tìm Unit Test', 'Search Unit Tests')} className="form-input pl-9" value={query} onChange={(event) => { setQuery(event.target.value); setActiveId(null); setUserSelectedMethod(false); }} placeholder={t('Tìm TC-001, UserServiceTest, method...', 'Search TC-001, UserServiceTest, method...')} />
          </label>
          <select aria-label={t('Lọc Test Case', 'Filter by Test Case')} className="form-input" value={caseId} onChange={(event) => { setCaseId(event.target.value); setActiveId(null); setUserSelectedMethod(false); }}>
            <option value="">{t('Tất cả Test Case đã approve', 'All approved Test Cases')}</option>
            {approvedCases.map((item) => <option key={item.id} value={item.id}>{item.caseCode} - {item.description}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
        <div className="flex flex-col justify-between rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-body-subtle">{t('Danh sách method', 'Method index')}</p>
              <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-xs font-semibold text-heading">{visible.length}</span>
            </div>
            {totalPages > 1 && (
              <span className="text-[11px] font-mono text-body-subtle">
                {t(`Trang ${safePage}/${totalPages}`, `Page ${safePage}/${totalPages}`)}
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2">
          {tests.isLoading ? (
            <LoadingState label={t('Đang tải Unit Test...', 'Loading Unit Tests...')} minHeight="min-h-[160px]" />
          ) : visible.length === 0 ? (
            <EmptyState icon={FileCode2} title={t('Chưa có Unit Test', 'No Unit Tests yet')} hint={t('Approve Test Case rồi bấm "AI sinh Unit Test".', 'Approve Test Cases, then select "Generate with AI".')} minHeight="min-h-[200px]" />
          ) : paginatedVisible.map((item, index) => {
              const overallIndex = (safePage - 1) * PAGE_SIZE + index;
              const testCase = approvedCaseById.get(item.testCaseId);
            const testPlan = testCase ? (plans.data ?? []).find((p) => p.id === testCase.testPlanId) : null;
            const ruleIds = testPlan?.coveredRuleIds?.length
              ? testPlan.coveredRuleIds
              : testPlan ? [testPlan.businessRuleId] : [];
            const coveredRules = ruleIds
              .map((rId) => (rules.data ?? []).find((r) => r.id === rId))
              .filter((r) => r != null);
            const ruleDiffs = coveredRules.map((rule) => {
              const method = (analysis.data?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule?.methodId);
              const javaClass = (analysis.data?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule?.methodId));
              return method
                ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
                   || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
                   || methodDiffMap[method.methodName])
                : undefined;
            });
            const hasAdded = !isCoverageVisited && (addedUnitTestIds.has(item.id) || item.generationType === 'NEW_TEST' || (testCase ? addedCaseIds.has(testCase.id) : false) || (testPlan ? addedPlanIds.has(testPlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id)));
            const hasDeleted = !isCoverageVisited && (deletedUnitTestIds.has(item.id) || (testCase ? deletedCaseIds.has(testCase.id) : false) || (testPlan ? deletedPlanIds.has(testPlan.id) : false) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => r && deletedRuleIds.has(r.id)));
            const hasModified = !isCoverageVisited && !hasAdded && !hasDeleted && (
              modifiedUnitTestIds.has(item.id)
              || item.generationType === 'INCREMENTAL'
              || item.generationType === 'IMPROVE_EXISTING_TEST'
              || ruleDiffs.includes('MODIFIED')
              || affectedUnitTestIds.has(item.id)
              || (testCase ? modifiedCaseIds.has(testCase.id) || affectedCaseIds.has(testCase.id) : false)
              || (testPlan ? modifiedPlanIds.has(testPlan.id) || affectedPlanIds.has(testPlan.id) : false)
              || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
            );

            const diffBorder = hasAdded
              ? 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.04]'
              : hasDeleted
                ? 'border-l-4 border-l-rose-500 bg-rose-500/[0.04]'
                : hasModified
                  ? 'border-l-4 border-l-amber-500 bg-amber-500/[0.04]'
                  : '';

            return (
            <button
              key={item.id}
              type="button"
              aria-label={`${testCase?.caseCode ?? `Case ${item.testCaseId}`} ${item.testMethodName}`}
              aria-current={active?.id === item.id ? 'true' : undefined}
              className={`block w-full border-b border-border-default px-4 py-3 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand ${diffBorder} ${active?.id === item.id ? 'bg-brand-softer' : 'hover:bg-neutral-secondary-soft/40'}`}
              onClick={() => {
                setUserSelectedMethod(true);
                setActiveId(item.id);
              }}
            >
              <span className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tabular-nums text-body-subtle">{String(overallIndex + 1).padStart(2, '0')}</span>
                <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">{testCase?.caseCode ?? `#${item.testCaseId}`}</span>
                {hasAdded && (
                  <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    + MỚI THÊM
                  </span>
                )}
                {hasDeleted && (
                  <span className="inline-flex items-center rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-600 dark:text-rose-400">
                    - ĐÃ XÓA
                  </span>
                )}
                {hasModified && (
                  <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
                    ~ CẬP NHẬT THEO CODE
                  </span>
                )}
                {!isCoverageVisited && item.generationType && (
                  <span className="ml-auto text-[10px] font-semibold uppercase text-body-subtle">{item.generationType.replace(/_/g, ' ')}</span>
                )}
              </span>
              <span className="mt-2 block break-all font-mono text-xs font-semibold text-heading">{item.testMethodName}</span>
              <span className="mt-1 block truncate text-xs text-body-subtle">{item.testClassName}</span>
              {testCase?.description && <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-body-subtle">{testCase.description}</span>}
            </button>
          );})}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="mt-auto flex shrink-0 items-center justify-between border-t border-border-default bg-neutral-primary-soft/90 px-3 py-2 text-xs">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-body hover:bg-neutral-secondary-medium disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label={t('Trang trước', 'Previous page')}
              >
                <ChevronLeft size={14} />
                <span>{t('Trước', 'Prev')}</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isCurrent = pageNum === safePage;
                  if (totalPages > 6 && Math.abs(pageNum - safePage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return <span key={pageNum} className="px-1 text-body-subtle">…</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-6 min-w-6 rounded px-1.5 text-center font-mono text-[11px] transition-colors ${
                        isCurrent
                          ? 'bg-brand-soft text-fg-brand-strong font-bold border border-border-brand-subtle'
                          : 'text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading'
                      }`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-body hover:bg-neutral-secondary-medium disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label={t('Trang sau', 'Next page')}
              >
                <span>{t('Sau', 'Next')}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          {!active ? (
            <div className="flex min-h-[360px] flex-1 items-center justify-center text-sm text-body-subtle">{t('Chọn method để xem file test.', 'Select a method to view its test file.')}</div>
          ) : files.isLoading ? (
            <LoadingState label={t('Đang gộp file test...', 'Merging test files...')} minHeight="min-h-[360px]" />
          ) : activeFile ? (
            <div className="flex flex-1 min-h-0 flex-col space-y-3">
              <div className="shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-body-subtle">{t('Traceability đang kiểm chứng', 'Traceability under review')}</p>
                  {(() => {
                    const activeCase = active ? approvedCaseById.get(active.testCaseId) : null;
                    const activePlan = activeCase ? (plans.data ?? []).find((p) => p.id === activeCase.testPlanId) : null;
                    const ruleIds = activePlan?.coveredRuleIds?.length
                      ? activePlan.coveredRuleIds
                      : activePlan ? [activePlan.businessRuleId] : [];
                    const coveredRules = ruleIds
                      .map((rId) => (rules.data ?? []).find((r) => r.id === rId))
                      .filter((r) => r != null);
                    const ruleDiffs = coveredRules.map((rule) => {
                      const method = (analysis.data?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule?.methodId);
                      const javaClass = (analysis.data?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule?.methodId));
                      return method
                        ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
                           || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
                           || methodDiffMap[method.methodName])
                        : undefined;
                    });
                    const hasAdded = !isCoverageVisited && ((active ? addedUnitTestIds.has(active.id) : false) || active?.generationType === 'NEW_TEST' || (activeCase ? addedCaseIds.has(activeCase.id) : false) || (activePlan ? addedPlanIds.has(activePlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id)));
                    const hasDeleted = !isCoverageVisited && ((active ? deletedUnitTestIds.has(active.id) : false) || (activeCase ? deletedCaseIds.has(activeCase.id) : false) || (activePlan ? deletedPlanIds.has(activePlan.id) : false) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => r && deletedRuleIds.has(r.id)));
                    const hasModified = !isCoverageVisited && !hasAdded && !hasDeleted && (
                      (active ? modifiedUnitTestIds.has(active.id) || affectedUnitTestIds.has(active.id) : false)
                      || active?.generationType === 'INCREMENTAL'
                      || active?.generationType === 'IMPROVE_EXISTING_TEST'
                      || ruleDiffs.includes('MODIFIED')
                      || (activeCase ? modifiedCaseIds.has(activeCase.id) || affectedCaseIds.has(activeCase.id) : false)
                      || (activePlan ? modifiedPlanIds.has(activePlan.id) || affectedPlanIds.has(activePlan.id) : false)
                      || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
                    );
                    if (hasAdded) {
                      return (
                        <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          + MỚI THÊM
                        </span>
                      );
                    }
                    if (hasDeleted) {
                      return (
                        <span className="inline-flex items-center rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          - ĐÃ XÓA
                        </span>
                      );
                    }
                    if (hasModified) {
                      return (
                        <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          ~ CẬP NHẬT THEO CODE
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <p className="mt-1 break-words font-mono text-xs font-semibold text-fg-brand-strong">{activeTrace?.label}</p>
                <p className="mt-1 text-xs text-body-subtle">{approvedCaseById.get(active.testCaseId)?.description}</p>
                <div className="grid gap-2 lg:grid-cols-2">
                  {activeTrace?.sources.map((source, index) => (
                    <SourceTrace key={`${source.filePath}:${source.methodName}:${index}`} value={source} compact />
                  ))}
                </div>
              </div>
              <UnitTestFileView
                file={activeFile}
                highlightMethod={active.testMethodName}
                autoScroll={userSelectedMethod}
                onSelectCaseCode={(code) => {
                  const targetIndex = visible.findIndex(
                    (t) => approvedCaseById.get(t.testCaseId)?.caseCode === code && t.filePath === activeFile.filePath
                  );
                  if (targetIndex >= 0) {
                    const targetPage = Math.floor(targetIndex / PAGE_SIZE) + 1;
                    setCurrentPage(targetPage);
                    setUserSelectedMethod(true);
                    setActiveId(visible[targetIndex].id);
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-1 items-center justify-center text-sm text-body-subtle">{t('Không tìm thấy file test.', 'Test file not found.')}</div>
          )}
        </div>
      </div>
    </section>
  );
}

function UnitTestFileView({
  file,
  highlightMethod,
  autoScroll = false,
  onSelectCaseCode,
}: {
  file: UnitTestFile;
  highlightMethod: string;
  autoScroll?: boolean;
  onSelectCaseCode?: (code: string) => void;
}) {
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
    if (!autoScroll) return;
    highlightedLineRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [file.filePath, highlightedLine, highlightMethod, autoScroll]);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(file.sourceCode);
    setCopied(true);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="shrink-0 mb-3 flex items-start justify-between gap-3">
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
              <button
                key={code}
                type="button"
                onClick={() => onSelectCaseCode?.(code)}
                className="rounded-full bg-brand-softer hover:bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong transition-colors cursor-pointer"
                title={t(`Chuyển tới method của ${code}`, `Jump to ${code} method`)}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-secondary px-3 py-2" onClick={copy}><Copy size={14} />{copied ? t('Đã copy', 'Copied') : 'Copy'}</button>
      </div>
      <div className="shrink-0 mb-2 flex items-center gap-2 text-[11px] text-body-subtle">
        <span className="h-2 w-2 rounded-full bg-brand-strong" />
        {t(`Dòng màu xanh là method của case đang chọn: ${highlightMethod}`, `The highlighted line is the selected case method: ${highlightMethod}`)}
      </div>
      <div className="relative flex-1 min-h-[420px] xl:min-h-0">
        <div aria-label="Generated test code" role="region" tabIndex={0} className="absolute inset-0 overflow-auto rounded-default border border-border-default bg-neutral-primary p-3 font-mono text-xs leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
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
      </div>
    </div>
  );
}
