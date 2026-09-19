import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, ClipboardCheck, Database, FileText, ListFilter, Loader2, Pencil, PlusCircle, Save, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { MetricCard } from '../../../shared/components/MetricCard';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import { SemanticBadge } from '../../../shared/components/SemanticBadge';
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

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];
const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

export function TestCasesPanel({ projectId, projectStatus: _projectStatus, servicePath }: { projectId: number; projectStatus?: ProjectStatus; servicePath?: string }) {
  const navigate = useNavigate();
  const {
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
  } = useSourceUpdateImpact(projectId);
  const plans = useTestPlans(projectId, servicePath);
  const rules = useBusinessRules(projectId, servicePath);
  const cases = useTestCases(projectId, servicePath);
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
  const { t } = useLanguage();

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
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis.data, rules.data ?? []),
    [analysis.data, rules.data],
  );
  const visible = useMemo(() => {
    const list = planId ? (cases.data ?? []).filter((c) => String(c.testPlanId) === planId) : (cases.data ?? []);
    return [...list].sort((a, b) => a.caseCode.localeCompare(b.caseCode, undefined, { numeric: true }));
  }, [cases.data, planId]);
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
    if (!formPlanId || !formDescription.trim() || !formPreconditions.trim() || !formExpected.trim()) return;
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

  const handleGenerate = () => {
    generate.mutate(undefined);
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-heading">Test Cases</h3><p className="mt-1 text-xs text-body-subtle">{t('AI sinh từ Test Plan đã approve và lưu trực tiếp về backend.', 'AI generates Test Cases from approved Test Plans and persists them in the backend.')}</p></div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          {cases.isSuccess && (cases.data ?? []).length === 0 && (
            <button className="btn btn-secondary" disabled={busy || approvedPlans.length === 0} onClick={handleGenerate}>
              {generate.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} {t('AI sinh Case', 'Generate with AI')}
            </button>
          )}
          <AiGenerationProgress
            active={generate.isPending || generationRunning || generationProgress.showProgress}
            label={t('Tiến trình AI của dự án', 'Project AI progress')}
            progress={generationProgress.projectProgress ?? generationProgress.data}
          />
          <button
            className="btn btn-brand"
            disabled={busy || pending === 0}
            onClick={() => approve.mutate(undefined, {
              onSuccess: () => navigate(projectWorkflowPath(projectId, 'unit-tests', servicePath), {
                state: { workflowNotice: t('Đã duyệt Test Case. Chuyển sang bước Unit Test.', 'Test Cases approved. Continue with Unit Tests.') },
              }),
            })}
          >
            <CheckCircle2 size={14} /> Approve
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard icon={ClipboardCheck} label={t('Test Plan đã approve', 'Approved Plans')} value={approvedPlans.length} />
        <MetricCard icon={FileText} label={t('Test Case pending', 'Pending Cases')} value={pending} />
        <MetricCard icon={Database} label={t('Test Case đã approve', 'Approved Cases')} value={approved} />
      </div>

      <div id="manual-case-form" className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        <div className="flex items-center gap-3"><PlusCircle size={16} className="text-fg-brand-strong" /><span className="text-sm font-semibold text-heading">{t('Thêm Test Case thủ công', 'Add a Test Case manually')}</span></div>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <select className="form-input" aria-label={t('Chọn Test Plan', 'Select Test Plan')} value={formPlanId} onChange={(e) => setFormPlanId(e.target.value)} disabled={busy || approvedPlans.length === 0}>
              <option value="">{t('Chọn Test Plan', 'Select Test Plan')}</option>
              {approvedPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planCode} - {plan.title}</option>)}
            </select>
            <select className="form-input" aria-label="Test type" value={formType} onChange={(e) => setFormType(e.target.value as TestType)} disabled={busy}>
              {TEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select className="form-input" aria-label="Priority" value={formPriority} onChange={(e) => setFormPriority(e.target.value as Priority)} disabled={busy}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input className="form-input" placeholder={t('Mô tả scenario', 'Scenario description')} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} disabled={busy} />
          <div className="grid gap-3 md:grid-cols-2">
            <textarea className="form-input min-h-[72px] resize-y" placeholder={t('Preconditions (setup, mock...)', 'Preconditions (setup, mocks...)')} value={formPreconditions} onChange={(e) => setFormPreconditions(e.target.value)} disabled={busy} />
            <textarea className="form-input min-h-[72px] resize-y" placeholder={t('Expected result', 'Expected result')} value={formExpected} onChange={(e) => setFormExpected(e.target.value)} disabled={busy} />
          </div>
          <textarea className="form-input min-h-[56px] resize-y font-mono text-xs" placeholder={t('Test data JSON (tùy chọn), vd: {"input": {"name": "A"}}', 'Test data JSON (optional), e.g. {"input": {"name": "A"}}')} value={formTestData} onChange={(e) => setFormTestData(e.target.value)} disabled={busy} />
          {formError && <InlineAlert tone="danger">{formError}</InlineAlert>}
          <button className="btn btn-secondary w-fit" disabled={busy || !formPlanId || !formDescription.trim() || !formPreconditions.trim() || !formExpected.trim()}>
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
            {t('Thêm Case', 'Add Case')}
          </button>
        </form>
      </div>

      <div className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        {error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}
        <div className="flex items-center gap-3"><ListFilter size={16} className="text-fg-brand-strong" /><span className="text-sm font-semibold text-heading">{t('Lọc danh sách theo Test Plan', 'Filter list by Test Plan')}</span></div>
        <select aria-label={t('Lọc Test Plan', 'Filter by Test Plan')} className="form-input mt-4" value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={plans.isLoading}>
          <option value="">{t('Tất cả Test Plan đã approve', 'All approved Test Plans')}</option>
          {approvedPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planCode} - {plan.title}</option>)}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
        {cases.isLoading ? <LoadingState label={t('Đang tải Test Case...', 'Loading Test Cases...')} minHeight="min-h-[160px]" /> : visible.length === 0 ? <EmptyState icon={FileText} title={t('Chưa có Test Case', 'No Test Cases yet')} hint={t('Bấm "AI sinh Case" hoặc thêm thủ công ở form phía trên.', 'Select "Generate with AI" or add one manually using the form above.')} minHeight="min-h-[200px]" /> : visible.map((item) => {
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
          const hasAdded = addedCaseIds.has(item.id) || (sourcePlan ? addedPlanIds.has(sourcePlan.id) : false) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => r && addedRuleIds.has(r.id));
          const hasDeleted = deletedCaseIds.has(item.id) || (sourcePlan ? deletedPlanIds.has(sourcePlan.id) : false) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => r && deletedRuleIds.has(r.id));
          const hasModified = !hasAdded && !hasDeleted && (
            modifiedCaseIds.has(item.id)
            || affectedCaseIds.has(item.id)
            || (sourcePlan ? modifiedPlanIds.has(sourcePlan.id) || affectedPlanIds.has(sourcePlan.id) : false)
            || ruleDiffs.includes('MODIFIED')
            || coveredRules.some((r) => r && (modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)))
            || item.isModified
          );

          const cardClass = hasAdded
            ? 'rounded-default border-2 border-emerald-500/60 bg-emerald-500/[0.04] p-3 my-1.5 shadow-xs transition-colors'
            : hasDeleted
              ? 'rounded-default border-2 border-rose-500/60 bg-rose-500/[0.04] p-3 my-1.5 shadow-xs transition-colors'
              : (hasModified || item.isModified)
                ? 'rounded-default border-2 border-amber-500/60 bg-amber-500/[0.04] p-3 my-1.5 shadow-xs transition-colors'
                : 'border-t border-border-default px-3 py-3 transition-colors first:border-t-0 hover:bg-neutral-secondary-soft/40';

          return (
            <article key={item.id} className={cardClass}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-heading">{item.caseCode}</span>
                <span className="font-mono text-xs text-body-subtle">
                  {coveredRules.map((rule) => `${rule.ruleCode}${rule.sourceBranchId ? ` [${rule.sourceBranchId}]` : ''}`).join(', ')}
                  {sourcePlan ? ` -> ${sourcePlan.planCode}` : ''}
                </span>
                <SemanticBadge kind="test-type" value={item.testType} />
                <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">{item.priority}</span>
                {hasAdded && (
                  <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    + MỚI THÊM
                  </span>
                )}
                {hasDeleted && (
                  <span className="inline-flex items-center rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    - ĐÃ XÓA
                  </span>
                )}
                {(hasModified || item.isModified) && (
                  <span className="inline-flex items-center rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    ~ CẬP NHẬT THEO CODE
                  </span>
                )}
                {item.isModified && !hasModified && (
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-fg-warning">
                    {t('Đã sửa', 'Modified')}
                  </span>
                )}
                <SemanticBadge kind="review-status" value={item.status} label={item.status === 'PENDING_REVIEW' ? 'DRAFT' : undefined} />
                <span className="ml-auto flex gap-1">
                  {editing ? (
                    <>
                      <button type="button" className="btn btn-secondary px-3 py-2" aria-label={t(`Lưu ${item.caseCode}`, `Save ${item.caseCode}`)} disabled={busy || !editDescription.trim() || !editPreconditions.trim() || !editExpected.trim()} onClick={() => handleSaveEdit(item)}><Save size={14} /></button>
                      <button type="button" className="btn btn-secondary px-3 py-2" aria-label={t(`Hủy ${item.caseCode}`, `Cancel ${item.caseCode}`)} disabled={busy} onClick={() => setEditingId(null)}><X size={14} /></button>
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
                    <select className="form-input" value={editType} onChange={(e) => setEditType(e.target.value as TestType)}>
                      {TEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <select className="form-input" value={editPriority} onChange={(e) => setEditPriority(e.target.value as Priority)}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
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
