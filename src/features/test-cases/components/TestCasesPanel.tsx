import { SelectMenu } from '../../../shared/components/SelectMenu';
import { IconButton } from '../../../shared/components/IconButton';
import { Tag } from '../../../shared/components/Tag';
import { ErrorState } from '../../../shared/components/ErrorState';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, FileText, ListFilter, Loader2, Pencil, Play, PlusCircle, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ManualEntrySection } from '../../../shared/components/ManualEntrySection';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import { formatSemanticLabel, SemanticBadge } from '../../../shared/components/SemanticBadge';
import { AiGenerationProgress } from '../../../shared/components/AiGenerationProgress';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import type { ProjectStatus } from '../../projects/types';
import { useAnalysis } from '../../projects/hooks/useProjects';
import { buildRuleSourceIndex } from '../../projects/utils/source-trace';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import { useUnitTests } from '../../unit-tests/hooks/useUnitTests';
import { useApproveTestCases, useCreateTestCase, useDeleteTestCase, useGenerateTestCases, useTestCases, useUpdateTestCase } from '../hooks/useTestCases';
import type { Priority, TestCase, TestType } from '../types';
import { useLanguage } from '../../../shared/i18n/language';
import { projectWorkflowPath } from '../../projects/utils/project-service';
import { useGenerationProgress } from '../../../shared/hooks/useGenerationProgress';
import { useSourceUpdateImpact } from '../../projects/hooks/useSourceUpdateImpact';
import { SourceUpdateDeletionHistory } from '../../projects/components/SourceUpdateDeletionHistory';

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];
const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

export function TestCasesPanel({ projectId, projectStatus, servicePath }: { projectId: number; projectStatus?: ProjectStatus; servicePath?: string }) {
  const navigate = useNavigate();
  const cases = useTestCases(projectId, servicePath);
  const isPastCases = Boolean(projectStatus && ['CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED', 'COMPLETED'].includes(projectStatus));
  const {
    activeUpdate,
    changesSeen,
    impact,
    methodDiffMap,
    getMethodDiff,
    affectedCaseIds,
    affectedPlanIds,
    affectedRuleIds,
    addedCaseIds,
    modifiedCaseIds,
    deletedCaseIds,
    addedPlanIds,
    modifiedPlanIds,
    deletedPlanIds,
    addedRuleIds,
    modifiedRuleIds,
    deletedRuleIds,
  } = useSourceUpdateImpact(projectId, 'TEST_CASE', servicePath,
    !cases.isLoading && !cases.isFetching && !cases.error && (cases.data?.length ?? 0) > 0);
  const plans = useTestPlans(projectId, servicePath);
  const rules = useBusinessRules(projectId, servicePath);
  const units = useUnitTests(projectId, servicePath);
  const analysis = useAnalysis(projectId);
  const generate = useGenerateTestCases(projectId, servicePath);
  const generationProgress = useGenerationProgress(projectId, 'TEST_CASE', generate.isPending);
  const generationRunning = generationProgress.projectRunning
    ?? (generationProgress.data?.status === 'QUEUED' || generationProgress.data?.status === 'RUNNING');
  const approve = useApproveTestCases(projectId, servicePath);
  const create = useCreateTestCase(projectId, servicePath);
  const updateCase = useUpdateTestCase(projectId);
  const removeCase = useDeleteTestCase(projectId);
  const [planId, setPlanId] = useState('');
  const { t, language } = useLanguage();

  // Form nhập case thủ công
  const [formPlanId, setFormPlanId] = useState('');
  const [formType, setFormType] = useState<TestType>('HAPPY_PATH');
  const [formPriority, setFormPriority] = useState<Priority>('MEDIUM');
  const [formDescription, setFormDescription] = useState('');
  const [formPreconditions, setFormPreconditions] = useState('');
  const [formExpected, setFormExpected] = useState('');
  const [formTestData, setFormTestData] = useState('');
  const [formError, setFormError] = useState('');

  // Sửa inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editType, setEditType] = useState<TestType>('HAPPY_PATH');
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM');
  const [editDescription, setEditDescription] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const [caseToDelete, setCaseToDelete] = useState<TestCase | null>(null);

  const approvedPlans = useMemo(() => (plans.data ?? []).filter((p) => p.status === 'APPROVED'), [plans.data]);
  const eligiblePlans = approvedPlans;
  const canCreateFromPlan = eligiblePlans.some((plan) => plan.id === Number(formPlanId));
  const plansWithCases = useMemo(() => {
    const set = new Set<number>();
    (cases.data ?? []).forEach((c) => set.add(c.testPlanId));
    return set;
  }, [cases.data]);
  const coveredPlanCount = eligiblePlans.filter((p) => plansWithCases.has(p.id)).length;
  const missingPlanCount = eligiblePlans.length - coveredPlanCount;
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis.data, rules.data ?? []),
    [analysis.data, rules.data],
  );
  const visible = useMemo(() => {
    const list = planId ? (cases.data ?? []).filter((c) => String(c.testPlanId) === planId) : (cases.data ?? []);
    const getCaseDiffPriority = (item: TestCase) => {
      const sourcePlan = (plans.data ?? []).find((plan) => plan.id === item.testPlanId);
      const coveredRules = (sourcePlan?.coveredRuleIds?.length
        ? sourcePlan.coveredRuleIds
        : sourcePlan ? [sourcePlan.businessRuleId] : [])
        .map((ruleId) => (rules.data ?? []).find((rule) => rule.id === ruleId))
        .filter((rule) => rule != null);
      const ruleDiffs = coveredRules.map((rule) => {
        const method = (analysis.data?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule?.methodId);
        const javaClass = (analysis.data?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule?.methodId));
        return method
          ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
             || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
             || methodDiffMap[method.methodName])
          : undefined;
      });
      const hasAdded = addedCaseIds.has(item.id) || (sourcePlan ? addedPlanIds.has(sourcePlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id));
      if (hasAdded) return 2;
      const hasModified = modifiedCaseIds.has(item.id)
        || affectedCaseIds.has(item.id)
        || (sourcePlan ? modifiedPlanIds.has(sourcePlan.id) || affectedPlanIds.has(sourcePlan.id) : false)
        || ruleDiffs.includes('MODIFIED')
        || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
        || (!isPastCases && item.isModified);
      if (hasModified) return 1;
      return 0;
    };

    return [...list].sort((a, b) => {
      const priorityA = getCaseDiffPriority(a);
      const priorityB = getCaseDiffPriority(b);
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return a.caseCode.localeCompare(b.caseCode, undefined, { numeric: true });
    });
  }, [cases.data, planId, plans.data, rules.data, analysis.data, isPastCases, addedCaseIds, modifiedCaseIds, affectedCaseIds, addedPlanIds, modifiedPlanIds, affectedPlanIds, addedRuleIds, modifiedRuleIds, affectedRuleIds, methodDiffMap, getMethodDiff]);
  const pending = (cases.data ?? []).filter((c) => c.status === 'PENDING_REVIEW').length;
  const approved = (cases.data ?? []).filter((c) => c.status === 'APPROVED').length;
  const error = plans.error ?? cases.error ?? units.error ?? analysis.error
    ?? generate.error ?? approve.error ?? create.error ?? updateCase.error ?? removeCase.error;
  const busy = generate.isPending || generationRunning || approve.isPending || create.isPending || updateCase.isPending || removeCase.isPending;

  // traceSource tự sinh theo format "BR-xxx -> TP-xxx" từ plan được chọn
  const traceSourceFor = (testPlanId: number) => {
    const plan = (plans.data ?? []).find((p) => p.id === testPlanId);
    if (!plan) return '';
    const ruleIds = plan.coveredRuleIds?.length ? plan.coveredRuleIds : [plan.businessRuleId];
    const ruleLabels = ruleIds.map((ruleId) => {
      const rule = (rules.data ?? []).find((item) => item.id === ruleId);
      if (!rule) return `BR#${ruleId}`;
      return `${rule.ruleCode}${rule.sourceBranchId ? ` [${rule.sourceBranchId}]` : ''}`;
    });
    return `${ruleLabels.join(', ')} -> ${plan.planCode}`;
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreateFromPlan || !formDescription.trim() || !formPreconditions.trim() || !formExpected.trim()) return;
    let testData: Record<string, unknown> = {};
    if (formTestData.trim()) {
      try {
        testData = JSON.parse(formTestData);
      } catch {
        setFormError(t('Test data phải là JSON hợp lệ (hoặc để trống).', 'Test data must be valid JSON (or empty).'));
        return;
      }
    }
    setFormError('');
    create.mutate(
      {
        testPlanId: Number(formPlanId),
        testType: formType,
        priority: formPriority,
        description: formDescription.trim(),
        preconditions: formPreconditions.trim(),
        expectedResult: formExpected.trim(),
        testData,
        traceSource: traceSourceFor(Number(formPlanId)),
      },
      { onSuccess: () => { setFormDescription(''); setFormPreconditions(''); setFormExpected(''); setFormTestData(''); } },
    );
  };

  const handleStartEdit = (item: TestCase) => {
    setEditingId(item.id);
    setEditType(item.testType);
    setEditPriority(item.priority);
    setEditDescription(item.description);
    setEditPreconditions(item.preconditions ?? '');
    setEditExpected(item.expectedResult);
  };

  const handleSaveEdit = (item: TestCase) => {
    if (!editDescription.trim() || !editPreconditions.trim() || !editExpected.trim()) return;
    updateCase.mutate({
      caseId: item.id,
      input: {
        testType: editType,
        priority: editPriority,
        description: editDescription.trim(),
        preconditions: editPreconditions.trim(),
        expectedResult: editExpected.trim(),
        testData: item.testData ?? {},
        traceSource: item.traceSource,
      },
    }, { onSuccess: () => setEditingId(null) });
  };

  const handleDelete = (item: TestCase) => {
    setCaseToDelete(item);
  };

  const handleGenerate = (resume = false) => {
    if (!resume && (cases.data ?? []).length > 0) {
      setShowRegenerateConfirm(true);
      return;
    }
    generate.mutate(resume);
  };

  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1"><p className="text-sm text-body-subtle">{t('Chọn Test Plan đã duyệt để sinh, kiểm tra và duyệt Test Case.', 'Choose an approved Test Plan to generate, review and approve Test Cases.')}</p></div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          {coveredPlanCount > 0 && missingPlanCount > 0 ? (
            <>
              <button
                className="btn btn-secondary"
                disabled={busy || missingPlanCount === 0}
                onClick={() => handleGenerate(true)}
                title={t(
                  `Tiếp tục sinh Test Case cho ${missingPlanCount} Test Plan mới/chưa có case`,
                  `Continue generating Test Cases for ${missingPlanCount} remaining Test Plans`
                )}
              >
                {generate.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {t(`Tiếp tục sinh (${missingPlanCount} plan mới)`, `Continue (${missingPlanCount} new plans)`)}
              </button>
              <button
                className="btn btn-secondary"
                disabled={busy || eligiblePlans.length === 0}
                onClick={() => handleGenerate(false)}
                title={t('Xóa toàn bộ Test Case cũ và sinh lại từ đầu', 'Regenerate all test cases from scratch')}
              >
                <RotateCcw size={14} /> {t('Sinh lại từ đầu', 'Regenerate all')}
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              disabled={busy || eligiblePlans.length === 0}
              onClick={() => handleGenerate(false)}
              title={coveredPlanCount > 0 ? t('Xóa toàn bộ Test Case cũ và sinh lại từ đầu', 'Regenerate all test cases from scratch') : undefined}
            >
              {generate.isPending || generationRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Bot size={14} />
              )}
              {t('AI sinh Case', 'Generate with AI')}
            </button>
          )}
          <AiGenerationProgress
            projectId={projectId}
            active={generate.isPending || generationRunning || generationProgress.showProgress}
            label={t('Tiến trình AI của dự án', 'Project AI progress')}
            progress={generationProgress.projectProgress ?? generationProgress.data}
            onPause={generationProgress.pause}
            onResume={() => handleGenerate(true)}
            onCancel={generationProgress.cancel}
          />
          <button
            className="btn btn-brand"
            disabled={busy || (cases.data ?? []).length === 0}
            onClick={() => {
              const targetUrl = projectWorkflowPath(projectId, 'unit-tests', servicePath);
              if (pending > 0) {
                approve.mutate(undefined, {
                  onSuccess: () => navigate(targetUrl, {
                    state: { workflowNotice: t('Đã duyệt Test Case. Chuyển sang bước Unit Test.', 'Test Cases approved. Continue with Unit Tests.') },
                  }),
                });
              } else {
                navigate(targetUrl, {
                  state: { workflowNotice: t('Chuyển sang bước Unit Test.', 'Continue to Unit Tests.') },
                });
              }
            }}
          >
            {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {pending > 0 ? t('Duyệt tất cả', 'Approve all') : t('Tiếp tục sang Unit Test', 'Continue to Unit Tests')}
          </button>
        </div>
      </div>
      {(plans.data ?? []).length > 0 && eligiblePlans.length === 0 && (
        <InlineAlert tone="warning" dismissible={false}>
          {t('Hãy duyệt Test Plan trước khi sinh Test Case.', 'Approve Test Plans before generating Test Cases.')}{' '}
          <Link className="rounded-control font-semibold underline underline-offset-2" to={projectWorkflowPath(projectId, 'test-plans', servicePath)}>{t('Duyệt Test Plan', 'Review Test Plans')}</Link>
        </InlineAlert>
      )}
      <div className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4 pb-0">
        <ManualEntrySection title={t('Thêm Test Case thủ công', 'Add a Test Case manually')}>
        <form onSubmit={handleCreate} className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <SelectMenu
              aria-label={t('Chọn Test Plan', 'Select Test Plan')}
              value={formPlanId}
              onChange={(selectedValue) => setFormPlanId(selectedValue)}
              disabled={busy || eligiblePlans.length === 0}
              searchable
              options={[{ value: "", label: String(t('Chọn Test Plan', 'Select Test Plan')) }, ...eligiblePlans.map((plan) => ({ value: String(plan.id), label: String(plan.planCode) + " - " + String(plan.title) }))]}
            />
            <SelectMenu
              aria-label="Test type"
              value={formType}
              onChange={(selectedValue) => setFormType(selectedValue as TestType)}
              disabled={busy}
              options={[...TEST_TYPES.map((type) => ({ value: type, label: String(type) }))]}
            />
            <SelectMenu
              aria-label="Priority"
              value={formPriority}
              onChange={(selectedValue) => setFormPriority(selectedValue as Priority)}
              disabled={busy}
              options={[...PRIORITIES.map((p) => ({ value: p, label: String(p) }))]}
            />
          </div>
          <input className="form-input" placeholder={t('Mô tả scenario', 'Scenario description')} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} disabled={busy} />
          <div className="grid gap-3 md:grid-cols-2">
            <textarea className="form-input min-h-[72px] resize-y" placeholder={t('Preconditions (setup, mock...)', 'Preconditions (setup, mocks...)')} value={formPreconditions} onChange={(e) => setFormPreconditions(e.target.value)} disabled={busy} />
            <textarea className="form-input min-h-[72px] resize-y" placeholder={t('Expected result', 'Expected result')} value={formExpected} onChange={(e) => setFormExpected(e.target.value)} disabled={busy} />
          </div>
          <textarea className="form-input min-h-[56px] resize-y font-mono text-xs" placeholder={t('Test data JSON (tùy chọn), vd: {"input": {"name": "A"}}', 'Test data JSON (optional), e.g. {"input": {"name": "A"}}')} value={formTestData} onChange={(e) => setFormTestData(e.target.value)} disabled={busy} />
          {formError && <InlineAlert tone="danger">{formError}</InlineAlert>}
          <button className="btn btn-secondary w-fit" disabled={busy || !canCreateFromPlan || !formDescription.trim() || !formPreconditions.trim() || !formExpected.trim()}>
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
            {t('Thêm Case', 'Add Case')}
          </button>
        </form>
        </ManualEntrySection>
      </div>

      <div className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4">
        {error && !cases.error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}
        <div className="flex items-center gap-3"><ListFilter size={16} className="text-fg-brand-strong" /><span className="text-sm font-semibold text-heading">{t('Lọc danh sách theo Test Plan', 'Filter list by Test Plan')}</span></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-body">
          <Tag className="font-mono tabular-nums">{t('Test Plan đã duyệt', 'Approved Plans')}: <span className="font-mono tabular-nums">{approvedPlans.length}</span></Tag>
          <Tag className="font-mono tabular-nums">{t('Test Case chờ duyệt', 'Pending Cases')}: <span className="font-mono tabular-nums">{pending}</span></Tag>
          <Tag className="font-mono tabular-nums">{t('Test Case đã duyệt', 'Approved Cases')}: <span className="font-mono tabular-nums">{approved}</span></Tag>
        </div>
        <SelectMenu
          aria-label={t('Lọc Test Plan', 'Filter by Test Plan')}
          className="mt-4"
          value={planId}
          onChange={(selectedValue) => setPlanId(selectedValue)}
          disabled={plans.isLoading}
          searchable
          options={[{ value: "", label: String(t('Tất cả Test Plan đã duyệt', 'All approved Test Plans')) }, ...approvedPlans.map((plan) => ({ value: String(plan.id), label: String(plan.planCode) + " - " + String(plan.title) }))]}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft">
        {cases.isLoading ? <LoadingState label={t('Đang tải Test Case...', 'Loading Test Cases...')} minHeight="min-h-[160px]" /> : cases.error ? <ErrorState error={cases.error} title={t('Không tải được Test Case', 'Unable to load Test Cases')} /> : visible.length === 0 ? <EmptyState icon={FileText} title={t('Chưa có Test Case', 'No Test Cases yet')} hint={t('Bấm "AI sinh Case" hoặc thêm thủ công ở form phía trên.', 'Select "Generate with AI" or add one manually using the form above.')} minHeight="min-h-[200px]" /> : visible.map((item) => {
          const editing = editingId === item.id;
          const sourcePlan = (plans.data ?? []).find((plan) => plan.id === item.testPlanId);
          const coveredRules = (sourcePlan?.coveredRuleIds?.length
            ? sourcePlan.coveredRuleIds
            : sourcePlan ? [sourcePlan.businessRuleId] : [])
            .map((ruleId) => (rules.data ?? []).find((rule) => rule.id === ruleId))
            .filter((rule) => rule != null);
          const ruleDiffs = coveredRules.map((rule) => {
            const method = (analysis.data?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule?.methodId);
            const javaClass = (analysis.data?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule?.methodId));
            return method
              ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
                 || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
                 || methodDiffMap[method.methodName])
              : undefined;
          });
          const hasAdded = !changesSeen && (addedCaseIds.has(item.id) || (sourcePlan ? addedPlanIds.has(sourcePlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id)));
          const hasDeleted = deletedCaseIds.has(item.id) || (sourcePlan ? deletedPlanIds.has(sourcePlan.id) : false) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => r && deletedRuleIds.has(r.id));
          const hasModified = !changesSeen && !hasAdded && !hasDeleted && (
            modifiedCaseIds.has(item.id)
            || affectedCaseIds.has(item.id)
            || (sourcePlan ? modifiedPlanIds.has(sourcePlan.id) || affectedPlanIds.has(sourcePlan.id) : false)
            || ruleDiffs.includes('MODIFIED')
            || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
            || (!isPastCases && item.isModified)
          );

          const cardClass = `border-b border-border-default p-4 last:border-b-0 transition-colors ${hasAdded
            ? 'border-l-4 border-l-success bg-success/[0.04]'
            : hasDeleted
              ? 'border-l-4 border-l-danger bg-danger/[0.04]'
              : hasModified
                ? 'border-l-4 border-l-warning bg-warning/[0.04]'
                : 'hover:bg-neutral-secondary-soft'}`;

          return (
            <article key={item.id} className={cardClass}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-heading">{item.caseCode}</span>
                <span className="font-mono text-xs text-body-subtle">
                  {coveredRules.map((rule) => `${rule.ruleCode}${rule.sourceBranchId ? ` [${rule.sourceBranchId}]` : ''}`).join(', ')}
                  {sourcePlan ? ` -> ${sourcePlan.planCode}` : ''}
                </span>
                <SemanticBadge kind="test-type" value={item.testType} />
                <Tag>{formatSemanticLabel(item.priority, language)}</Tag>
                {hasAdded && (
                  <Tag>
                    {t('+ Mới thêm', '+ Added')}
                  </Tag>
                )}
                {hasDeleted && (
                  <Tag>
                    {t('- Đã xóa', '- Deleted')}
                  </Tag>
                )}
                {hasModified && (
                  <Tag>
                    {t('Có thay đổi liên quan', 'Related changes')}
                  </Tag>
                )}
                {item.isModified && !isPastCases && !hasModified && (
                  <Tag>
                    {t('Đã sửa', 'Modified')}
                  </Tag>
                )}
                <SemanticBadge kind="review-status" value={item.status} label={item.status === 'PENDING_REVIEW' ? t('Bản nháp', 'Draft') : undefined} />
                <span className="ml-auto flex gap-1 font-mono">
                  {editing ? (
                    <>
                      <button type="button" className="btn btn-secondary px-3 py-2" aria-label={t(`Lưu ${item.caseCode}`, `Save ${item.caseCode}`)} disabled={busy || !editDescription.trim() || !editPreconditions.trim() || !editExpected.trim()} onClick={() => handleSaveEdit(item)}><Save size={14} /></button>
                      <IconButton icon={X} label={t(`Hủy ${item.caseCode}`, `Cancel ${item.caseCode}`)} disabled={busy} onClick={() => setEditingId(null)} />
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-secondary px-3 py-2" aria-label={t(`Sửa ${item.caseCode}`, `Edit ${item.caseCode}`)} disabled={busy} onClick={() => handleStartEdit(item)}><Pencil size={14} /></button>
                      <button type="button" className="btn-ghost-danger px-3 py-2" aria-label={t(`Xóa ${item.caseCode}`, `Delete ${item.caseCode}`)} disabled={busy} onClick={() => handleDelete(item)}><Trash2 size={14} /></button>
                    </>
                  )}
                </span>
              </div>
              {editing ? (
                <div className="mt-2 space-y-2">
                  <input className="form-input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  <div className="grid gap-2 md:grid-cols-2">
                    <textarea className="form-input min-h-[64px] resize-y" value={editPreconditions} onChange={(e) => setEditPreconditions(e.target.value)} />
                    <textarea className="form-input min-h-[64px] resize-y" value={editExpected} onChange={(e) => setEditExpected(e.target.value)} />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <SelectMenu
                      value={editType}
                      onChange={(selectedValue) => setEditType(selectedValue as TestType)}
                      aria-label={'Test type'}
                      options={[...TEST_TYPES.map((type) => ({ value: type, label: String(type) }))]}
                    />
                    <SelectMenu
                      value={editPriority}
                      onChange={(selectedValue) => setEditPriority(selectedValue as Priority)}
                      aria-label={'Priority'}
                      options={[...PRIORITIES.map((p) => ({ value: p, label: String(p) }))]}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 min-w-0">
                  <p className="text-sm font-medium text-heading">{item.description}</p>
                  <p className="mt-1 text-xs text-body-subtle">{item.expectedResult}</p>
                  <div className="mt-2 grid gap-2 lg:grid-cols-2">
                    {coveredRules.map((rule) => (
                      <SourceTrace key={rule.id} value={sourceTraceByRule.get(rule.id)} compact />
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <SourceUpdateDeletionHistory update={activeUpdate} impact={impact} targetType="TEST_CASE"
        currentIds={(cases.data ?? []).map((item) => item.id)} servicePath={servicePath} />
      <ConfirmDialog
        open={showRegenerateConfirm}
        title={t('Sinh lại Test Case?', 'Regenerate Test Cases?')}
        description={t(
          'Thao tác này sẽ xoá toàn bộ Test Case và Unit Test hiện có của project và gọi AI sinh lại từ đầu. Bạn có chắc chắn muốn tiếp tục?',
          'This will delete all existing Test Cases and Unit Tests for this project and regenerate them with AI. Are you sure you want to continue?'
        )}
        confirmLabel={t('Sinh lại', 'Regenerate')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={generate.isPending}
        onCancel={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false);
          generate.mutate(false);
        }}
      />
      <ConfirmDialog
        open={caseToDelete != null}
        title={t('Xóa Test Case?', 'Delete Test Case?')}
        description={caseToDelete
          ? t(
              `${caseToDelete.caseCode} và Unit Test liên quan sẽ bị xóa.`,
              `${caseToDelete.caseCode} and its related Unit Test will be deleted.`,
            )
          : ''}
        confirmLabel={t('Xóa case', 'Delete case')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={removeCase.isPending}
        onCancel={() => setCaseToDelete(null)}
        onConfirm={() => {
          if (!caseToDelete) return;
          const caseId = caseToDelete.id;
          setCaseToDelete(null);
          removeCase.mutate(caseId);
        }}
      />
    </section>
  );
}
