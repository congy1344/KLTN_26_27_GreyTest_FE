import { SelectMenu } from '../../../shared/components/SelectMenu';
import { Tag } from '../../../shared/components/Tag';
import { ErrorState } from '../../../shared/components/ErrorState';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, Download, FileCode2, Loader2, ListFilter, Play, RotateCcw, Search } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { AiGenerationProgress } from '../../../shared/components/AiGenerationProgress';
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
import { CodeBlock } from '../../../shared/components/CodeBlock';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';
import { useGenerationProgress } from '../../../shared/hooks/useGenerationProgress';
import { displaySourcePath } from '../../../shared/utils/source-path';
import { projectWorkflowPath } from '../../projects/utils/project-service';
import { useSourceUpdateImpact } from '../../projects/hooks/useSourceUpdateImpact';
import { diffRowClass } from '../../projects/diffHighlight';
import { DeletedTag } from '../../../shared/components/DeletedItems';
import { SourceUpdateDeletionHistory } from '../../projects/components/SourceUpdateDeletionHistory';
import { UnitTestTree } from './UnitTestTree';
import type { ProjectStatus } from '../../projects/types';

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

  const tests = useUnitTests(projectId, servicePath);
  const {
    changesSeen,
    activeUpdate,
    impact,
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
  } = useSourceUpdateImpact(projectId, 'UNIT_TEST', servicePath,
    !tests.isLoading && !tests.isFetching && !tests.error && (tests.data?.length ?? 0) > 0, tests.data?.length ?? 0);
  const hideGenerationIndicators = changesSeen || coverageNavigated || projectStatus === 'COVERAGE_ANALYZED' || projectStatus === 'COMPLETED';
  const cases = useTestCases(projectId, servicePath);
  const plans = useTestPlans(projectId, servicePath);
  const rules = useBusinessRules(projectId, servicePath);
  const analysis = useAnalysis(projectId);
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
  const [downloadError, setDownloadError] = useState('');
  const [skippedCases, setSkippedCases] = useState<string[]>([]);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const { t, language } = useLanguage();
  const approvedCases = useMemo(() => (cases.data ?? []).filter((item) => item.status === 'APPROVED'), [cases.data]);
  const eligibleCases = approvedCases;
  const approvedCaseById = useMemo(
    () => new Map(approvedCases.map((item) => [item.id, item])),
    [approvedCases],
  );
  const generatedCaseIds = useMemo(
    () => new Set((tests.data ?? []).map((item) => item.testCaseId)),
    [tests.data],
  );
  const coveredCount = eligibleCases.filter((item) => generatedCaseIds.has(item.id)).length;
  const missingCount = eligibleCases.length - coveredCount;
  const pendingDraftCaseCount = useMemo(() => {
    if (!activeUpdate || activeUpdate.status === 'APPLIED') return 0;
    const ids = new Set<number>();
    for (const item of activeUpdate.items ?? []) {
      if (item.targetType !== 'UNIT_TEST' || item.action === 'REMOVE' || item.action === 'KEEP'
          || item.reviewStatus === 'REJECTED' || !item.afterData) continue;
      try {
        const output = JSON.parse(item.afterData);
        const id = output.case_id ?? output.caseId;
        const source = output.source_code ?? output.sourceCode;
        if (typeof id === 'number' && typeof source === 'string' && source.trim() && approvedCaseById.has(id)) ids.add(id);
      } catch { /* Draft chưa hợp lệ không được coi là UT đã sinh. */ }
    }
    return ids.size;
  }, [activeUpdate, approvedCaseById]);
  const unexpectedCount = Math.max(0, (tests.data ?? []).length - coveredCount);
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

      const hasAdded = addedUnitTestIds.has(item.id)
        || (!hideGenerationIndicators && item.generationType === 'NEW_TEST')
        || (testCase ? addedCaseIds.has(testCase.id) : false)
        || (testPlan ? addedPlanIds.has(testPlan.id) : false)
        || ruleDiffs.includes('ADDED')
        || coveredRules.some((r) => r && addedRuleIds.has(r.id));
      if (hasAdded) return 2;

      const hasModified = modifiedUnitTestIds.has(item.id)
        || (!hideGenerationIndicators && (item.generationType === 'INCREMENTAL' || item.generationType === 'IMPROVE_EXISTING_TEST'))
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
    hideGenerationIndicators,
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
  const fileForTest = (test: UnitTest) => {
    const code = approvedCaseById.get(test.testCaseId)?.caseCode;
    // Backend có thể đổi tên file khi tách fixture; mã case vẫn liên kết đúng method với file xuất.
    const matches = (files.data ?? []).filter((file) => code && file.caseCodes.length > 0
      ? file.caseCodes.includes(code)
      : file.filePath === test.filePath);
    return matches.length === 1 ? matches[0] : undefined;
  };
  const activeFile = active ? fileForTest(active) : undefined;
  // File xuất có thể đổi tên khi tách fixture, nên cây lấy đường dẫn theo đúng file sẽ hiển thị.
  const treeFilePath = useMemo(() => {
    const paths = new Map(visible.map((test) => [test.id, fileForTest(test)?.filePath || test.filePath || `${test.testClassName}.java`]));
    return (test: UnitTest) => paths.get(test.id) ?? `${test.testClassName}.java`;
  }, [visible, files.data, approvedCaseById]);
  const error = cases.error ?? plans.error ?? rules.error ?? analysis.error
    ?? tests.error ?? files.error ?? generate.error;

  const handleDownload = async () => {
    try {
      setDownloadError('');
      setSkippedCases([]);
      setDownloading(true);
      setSkippedCases(await downloadUnitTestsZip(projectId, servicePath));
    } catch (downloadException) {
      setDownloadError(getErrorMessage(downloadException, true));
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerate = (incremental: boolean) => {
    if (pendingDraftCaseCount > 0) return;
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
    <section className="animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1"><p className="text-sm text-body-subtle">{t('Duyệt Test Case rồi sinh và tải file JUnit/Mockito.', 'Approve Test Cases, then generate and download JUnit/Mockito files.')}</p></div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          {coveredCount > 0 && missingCount > 0 && pendingDraftCaseCount === 0 ? (
            <>
              <button
                className="btn btn-secondary"
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
                onClick={() => {
                  if ((tests.data ?? []).length > 0) {
                    setShowRegenerateConfirm(true);
                  } else {
                    handleGenerate(false);
                  }
                }}
                title={t('Xóa toàn bộ Unit Test cũ và sinh lại từ đầu', 'Regenerate all unit tests from scratch')}
              >
                <RotateCcw size={14} /> {t('Sinh lại từ đầu', 'Regenerate all')}
              </button>
            </>
          ) : (
            <button
              className={coveredCount > 0 && missingCount === 0 ? "btn btn-secondary" : "btn btn-secondary"}
              disabled={generate.isPending || generationRunning || eligibleCases.length === 0 || pendingDraftCaseCount > 0}
              onClick={() => {
                if (coveredCount > 0 || (tests.data ?? []).length > 0) {
                  setShowRegenerateConfirm(true);
                } else {
                  handleGenerate(false);
                }
              }}
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
            onPause={generationProgress.pause}
            onResume={pendingDraftCaseCount > 0 ? undefined : () => handleGenerate(true)}
            onCancel={generationProgress.cancel}
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
      {pendingDraftCaseCount > 0 && (
        <InlineAlert tone="warning" dismissible={false}>{t(
          `${pendingDraftCaseCount} Unit Test đã sinh trong bản cập nhật source, đang chờ áp dụng. Mở Cập nhật Source Code để duyệt và áp dụng; không cần sinh lại ở đây.`,
          `${pendingDraftCaseCount} Unit Tests have been generated in the source update and await Apply. Review and apply that update instead of generating again here.`,
        )}</InlineAlert>
      )}
      {(cases.data ?? []).length > 0 && eligibleCases.length === 0 && (
        <InlineAlert tone="warning" dismissible={false}>{t('Hãy duyệt Test Case trước khi sinh Unit Test.', 'Approve Test Cases before generating Unit Tests.')}</InlineAlert>
      )}
      {(approvedCases.length > 0 || (tests.data ?? []).length > 0) && (
        <InlineAlert tone={coverageReady ? 'success' : 'warning'} dismissible={false}>
          <span className="font-mono">{coveredCount}/{approvedCases.length}</span>{' '}
          {coverageReady
            ? t('Test Case đã khớp đủ 1:1: mỗi Test Case được duyệt có đúng một Unit Test.', 'Test Cases match 1:1: every approved Test Case has exactly one Unit Test.')
            : t(`Test Case đã có test. Chưa nên sang Coverage: ${coverageWarning || 'chưa có Test Case được duyệt'}.`, `Test Cases covered. Not ready for Coverage: ${coverageWarning || 'no approved Test Cases'}.`)}
        </InlineAlert>
      )}
      <div className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4">
        {error && !tests.error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}
        {downloadError && <InlineAlert tone="danger">{downloadError}</InlineAlert>}
        {skippedCases.length > 0 && (
          <InlineAlert tone="warning">
            {t(
              `Gói tải về không gồm ${skippedCases.length} Test Case chưa có Unit Test đạt kiểm tra: ${skippedCases.join(', ')}. Dùng Tiếp tục sinh để sinh lại; lý do nằm trong file GREYTEST-SKIPPED-CASES.txt.`,
              `The package leaves out ${skippedCases.length} Test Cases without a passing Unit Test: ${skippedCases.join(', ')}. Use Continue generation to retry; reasons are in GREYTEST-SKIPPED-CASES.txt.`,
            )}
          </InlineAlert>
        )}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <ListFilter size={16} className="mt-0.5 shrink-0 text-fg-brand-strong" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-heading">{t('Tìm và đối chiếu Unit Test', 'Find and verify Unit Tests')}</p>
              {(files.data ?? []).length > 0 && <p className="mt-1 text-xs text-body-subtle">{t('File test đã gộp', 'Merged test files')}: <span className="font-mono">{files.data?.length}</span></p>}
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
          <SelectMenu
            aria-label={t('Lọc Test Case', 'Filter by Test Case')}
            value={caseId}
            onChange={(selectedValue) => { setCaseId(selectedValue); setActiveId(null); setUserSelectedMethod(false); }}
            searchable
            options={[{ value: "", label: String(t('Tất cả Test Case đã duyệt', 'All approved Test Cases')) }, ...approvedCases.map((item) => ({ value: String(item.id), label: String(item.caseCode) + " - " + String(item.description) }))]}
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:items-start">
        <div className="flex flex-col justify-between rounded-base border border-border-default bg-neutral-primary-soft p-4">
          <div>
            <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-body-subtle">{t('Danh sách method', 'Method index')}</p>
              <Tag className="font-mono tabular-nums">{visible.length}</Tag>
            </div>
          </div>
          <div className="mt-3 max-h-[720px] overflow-auto">
          {tests.isLoading ? (
            <LoadingState label={t('Đang tải Unit Test...', 'Loading Unit Tests...')} minHeight="min-h-[160px]" />
          ) : tests.error ? (<ErrorState error={tests.error} title={t('Không tải được Unit Test', 'Unable to load Unit Tests')} />) : visible.length === 0 ? (
            <EmptyState icon={FileCode2} title={t('Chưa có Unit Test', 'No Unit Tests yet')} hint={t('Duyệt Test Case rồi bấm "AI sinh Unit Test".', 'Approve Test Cases, then select "Generate with AI".')} minHeight="min-h-[200px]" />
          ) : (
            <UnitTestTree
              tests={visible}
              activeId={active?.id}
              filtering={Boolean(normalizedQuery || caseId)}
              scrollToActive={userSelectedMethod}
              filePathOf={treeFilePath}
              labelOf={(item) => `${approvedCaseById.get(item.testCaseId)?.caseCode ?? `Case ${item.testCaseId}`} ${item.testMethodName}`}
              onSelect={(id) => {
                setUserSelectedMethod(true);
                setActiveId(id);
              }}
              renderMethod={(item) => {
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
            const hasAdded = !hideGenerationIndicators && (addedUnitTestIds.has(item.id) || (testCase ? addedCaseIds.has(testCase.id) : false) || (testPlan ? addedPlanIds.has(testPlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id)));
            const hasDeleted = deletedUnitTestIds.has(item.id) || (testCase ? deletedCaseIds.has(testCase.id) : false) || (testPlan ? deletedPlanIds.has(testPlan.id) : false) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => r && deletedRuleIds.has(r.id));
            const hasModified = !hideGenerationIndicators && !hasAdded && !hasDeleted && (
              modifiedUnitTestIds.has(item.id)
              || item.generationType === 'INCREMENTAL' || item.generationType === 'IMPROVE_EXISTING_TEST'
              || ruleDiffs.includes('MODIFIED')
              || affectedUnitTestIds.has(item.id)
              || (testCase ? modifiedCaseIds.has(testCase.id) || affectedCaseIds.has(testCase.id) : false)
              || (testPlan ? modifiedPlanIds.has(testPlan.id) || affectedPlanIds.has(testPlan.id) : false)
              || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
            );

            const diffBorder = diffRowClass({ added: hasAdded, modified: hasModified, deleted: hasDeleted });

            return (
            <span className={`block rounded-base px-2.5 py-2 text-left ${diffBorder}`}>
              <span className="flex min-w-0 items-center gap-2">
                <Tag>{testCase?.caseCode ?? `#${item.testCaseId}`}</Tag>
                {hasAdded && (
                  <Tag>
                    {t('+ Mới thêm', '+ Added')}
                  </Tag>
                )}
                {hasDeleted && (
                  <DeletedTag />
                )}
                {hasModified && (
                  <Tag>
                    {t('Có thay đổi liên quan', 'Related changes')}
                  </Tag>
                )}
                {!hideGenerationIndicators && item.generationType && (
                  <Tag className="ml-auto">{formatSemanticLabel(item.generationType, language)}</Tag>
                )}
              </span>
              <span className="mt-1.5 block truncate font-mono text-[13px] font-semibold text-heading" title={item.testMethodName}>{item.testMethodName}</span>
              {testCase?.description && <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-body" title={testCase.description}>{testCase.description}</span>}
            </span>
          );}}
            />
          )}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col rounded-base border border-border-default bg-neutral-primary-soft p-4">
          {!active ? (
            <div className="flex min-h-[360px] flex-1 items-center justify-center text-sm text-body-subtle">{t('Chọn method để xem file test.', 'Select a method to view its test file.')}</div>
          ) : files.isLoading || (files.isFetching && !activeFile) ? (
            <LoadingState label={t('Đang gộp file test...', 'Merging test files...')} minHeight="min-h-[360px]" />
          ) : activeFile ? (
            <div className="flex flex-1 min-h-0 flex-col space-y-3">
              <div className="shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-body-subtle">{t('Traceability đang kiểm chứng', 'Traceability under review')}</p>
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
                    const hasAdded = !hideGenerationIndicators && ((active ? addedUnitTestIds.has(active.id) : false) || (activeCase ? addedCaseIds.has(activeCase.id) : false) || (activePlan ? addedPlanIds.has(activePlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id)));
                    const hasDeleted = (active ? deletedUnitTestIds.has(active.id) : false) || (activeCase ? deletedCaseIds.has(activeCase.id) : false) || (activePlan ? deletedPlanIds.has(activePlan.id) : false) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => r && deletedRuleIds.has(r.id));
                    const hasModified = !hideGenerationIndicators && !hasAdded && !hasDeleted && (
                      (active ? modifiedUnitTestIds.has(active.id) || affectedUnitTestIds.has(active.id) : false)
                      || active?.generationType === 'INCREMENTAL' || active?.generationType === 'IMPROVE_EXISTING_TEST'
                      || ruleDiffs.includes('MODIFIED')
                      || (activeCase ? modifiedCaseIds.has(activeCase.id) || affectedCaseIds.has(activeCase.id) : false)
                      || (activePlan ? modifiedPlanIds.has(activePlan.id) || affectedPlanIds.has(activePlan.id) : false)
                      || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
                    );
                    if (hasAdded) {
                      return (
                        <Tag>
                          {t('+ Mới thêm', '+ Added')}
                        </Tag>
                      );
                    }
                    if (hasDeleted) {
                      return (
                        <DeletedTag />
                      );
                    }
                    if (hasModified) {
                      return (
                        <Tag>
                          {t('Có thay đổi liên quan', 'Related changes')}
                        </Tag>
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
                    (test) => approvedCaseById.get(test.testCaseId)?.caseCode === code && fileForTest(test) === activeFile
                  );
                  if (targetIndex >= 0) {
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
      <SourceUpdateDeletionHistory update={activeUpdate} impact={impact} targetType="UNIT_TEST"
        currentIds={(tests.data ?? []).map((item) => item.id)} servicePath={servicePath} />
      <ConfirmDialog
        open={showRegenerateConfirm}
        title={t('Sinh lại toàn bộ Unit Test?', 'Regenerate all Unit Tests?')}
        description={t(
          'Hệ thống sẽ xóa toàn bộ Unit Test hiện tại và gọi AI sinh lại từ đầu cho các Test Case đã approve. Thao tác này có thể tốn thêm quota.',
          'All current Unit Tests will be deleted and AI will regenerate them from scratch for approved Test Cases. This may use additional quota.'
        )}
        confirmLabel={t('Xác nhận sinh lại', 'Confirm regeneration')}
        cancelLabel={t('Giữ Unit Test hiện tại', 'Keep current tests')}
        pending={generate.isPending}
        onCancel={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false);
          handleGenerate(false);
        }}
      />
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
  const { t } = useLanguage();

  const highlightedLine = useMemo(() => {
    const escapedMethod = highlightMethod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const declaration = new RegExp(`\\bvoid\\s+${escapedMethod}\\s*\\(`).exec(file.sourceCode);
    return declaration ? file.sourceCode.slice(0, declaration.index).split('\n').length - 1 : -1;
  }, [file.sourceCode, highlightMethod]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="shrink-0 mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{file.testClassName}</p>
          <p className="truncate font-mono text-xs text-body-subtle" title={file.filePath}>
            {displaySourcePath(file.filePath)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag className="font-mono tabular-nums">
              {t(`${file.testCount} @Test method`, `${file.testCount} @Test methods`)}
            </Tag>
            {file.caseCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onSelectCaseCode?.(code)}
                className="rounded-control bg-brand-softer hover:bg-brand-soft px-2 py-0.5 text-xs font-semibold text-fg-brand-strong transition-colors cursor-pointer"
                title={t(`Chuyển tới method của ${code}`, `Jump to ${code} method`)}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 mb-2 flex items-center gap-2 text-xs text-body-subtle">

        {t(`Dòng tô nổi là method của case đang chọn: ${highlightMethod}`, `The highlighted line is the selected case method: ${highlightMethod}`)}
      </div>
      <CodeBlock code={file.sourceCode} title={displaySourcePath(file.filePath)} ariaLabel="Generated test code"
        highlight={(line) => line - 1 === highlightedLine} scrollToHighlight={autoScroll}
        bodyClassName="h-[calc(100vh-240px)] min-h-[420px]" />
    </div>
  );
}
