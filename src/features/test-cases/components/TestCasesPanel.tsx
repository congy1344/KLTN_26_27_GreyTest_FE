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
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import type { ProjectStatus } from '../../projects/types';
import { useAnalysis } from '../../projects/hooks/useProjects';
import { buildRuleSourceIndex } from '../../projects/utils/source-trace';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import type { TestPlan } from '../../test-plans/types';
import { useUnitTests } from '../../unit-tests/hooks/useUnitTests';
import { useApproveTestCases, useCreateTestCase, useDeleteTestCase, useGenerateTestCases, useTestCases, useUpdateTestCase } from '../hooks/useTestCases';
import type { Priority, TestCase, TestType } from '../types';
import { useLanguage } from '../../../shared/i18n/language';

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];
const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

export function TestCasesPanel({ projectId, projectStatus: _projectStatus }: { projectId: number; projectStatus?: ProjectStatus }) {
  const navigate = useNavigate();
  const plans = useTestPlans(projectId);
  const rules = useBusinessRules(projectId);
  const cases = useTestCases(projectId);
  const units = useUnitTests(projectId);
  const analysis = useAnalysis(projectId);
  const generate = useGenerateTestCases(projectId);
  const approve = useApproveTestCases(projectId);
  const create = useCreateTestCase(projectId);
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
  const [planToRegenerate, setPlanToRegenerate] = useState<TestPlan | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<TestCase | null>(null);

  const approvedPlans = useMemo(() => (plans.data ?? []).filter((p) => p.status === 'APPROVED'), [plans.data]);
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis.data, rules.data ?? []),
    [analysis.data, rules.data],
  );
  const plansNeedingCases = useMemo(() => approvedPlans.filter((plan) =>
    plan.isModified || !(cases.data ?? []).some((testCase) => testCase.testPlanId === plan.id)),
  [approvedPlans, cases.data]);
  const visible = useMemo(() => planId ? (cases.data ?? []).filter((c) => String(c.testPlanId) === planId) : (cases.data ?? []), [cases.data, planId]);
  const pending = (cases.data ?? []).filter((c) => c.status === 'PENDING_REVIEW').length;
  const approved = (cases.data ?? []).filter((c) => c.status === 'APPROVED').length;
  const error = plans.error ?? cases.error ?? units.error ?? analysis.error
    ?? generate.error ?? approve.error ?? create.error ?? updateCase.error ?? removeCase.error;
  const busy = generate.isPending || approve.isPending || create.isPending || updateCase.isPending || removeCase.isPending;

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
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><h3 className="text-sm font-semibold text-heading">Test Cases</h3><p className="mt-1 text-xs text-body-subtle">{t('AI sinh từ Test Plan đã approve và lưu trực tiếp về backend.', 'AI generates Test Cases from approved Test Plans and persists them in the backend.')}</p></div>
        <div className="flex gap-2">
          {cases.isSuccess && (cases.data ?? []).length === 0 && (
            <button className="btn btn-secondary" disabled={busy || approvedPlans.length === 0} onClick={handleGenerate}>
              {generate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} {t('AI sinh Case', 'Generate with AI')}
            </button>
          )}
          <button
            className="btn btn-brand"
            disabled={busy || pending === 0}
            onClick={() => approve.mutate(undefined, {
              onSuccess: () => navigate(`/projects/${projectId}/unit-tests`, {
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

      {(cases.data ?? []).length > 0 && plansNeedingCases.length > 0 && (
        <div className="mt-4 rounded-base border border-border-warning-subtle bg-warning-soft p-4">
          <h4 className="text-sm font-semibold text-fg-warning">
            {t('Test Plan cần cập nhật Test Case', 'Test Plans requiring updated Test Cases')}
          </h4>
          <p className="mt-1 text-xs text-body-subtle">
            {t('Chỉ Test Case của plan được chọn sẽ bị thay thế; các plan khác được giữ nguyên.', 'Only cases of the selected plan will be replaced; other plans remain unchanged.')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plansNeedingCases.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="btn btn-secondary"
                disabled={busy || !units.isSuccess}
                onClick={() => setPlanToRegenerate(plan)}
              >
                <Bot size={14} />
                {t(`Sinh lại Case · ${plan.planCode}`, `Regenerate Cases · ${plan.planCode}`)}
              </button>
            ))}
          </div>
        </div>
      )}

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
          return (
            <article key={item.id} className="border-t border-border-default px-3 py-3 transition-colors first:border-t-0 hover:bg-neutral-secondary-soft/40">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-heading">{item.caseCode}</span>
                <span className="font-mono text-xs text-body-subtle">
                  {coveredRules.map((rule) => `${rule.ruleCode}${rule.sourceBranchId ? ` [${rule.sourceBranchId}]` : ''}`).join(', ')}
                  {sourcePlan ? ` -> ${sourcePlan.planCode}` : ''}
                </span>
                <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">{item.testType}</span>
                <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">{item.priority}</span>
                {item.isModified && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-fg-warning">{t('Đã sửa', 'Modified')}</span>}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.status === 'APPROVED' ? 'bg-success-soft text-fg-success-strong' : 'bg-warning-soft text-fg-warning'}`}>{item.status === 'PENDING_REVIEW' ? 'DRAFT' : item.status}</span>
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
        open={planToRegenerate != null}
        title={t('Sinh lại Test Case của plan này?', 'Regenerate cases for this plan?')}
        description={planToRegenerate
          ? (() => {
              const targetCases = (cases.data ?? []).filter((item) => item.testPlanId === planToRegenerate.id);
              const targetCaseIds = new Set(targetCases.map((item) => item.id));
              const targetUnits = (units.data ?? []).filter((item) => targetCaseIds.has(item.testCaseId));
              return t(
                `${planToRegenerate.planCode} sẽ thay thế ${targetCases.length} Test Case và xóa ${targetUnits.length} Unit Test liên quan. Dữ liệu của plan khác được giữ nguyên.`,
                `${planToRegenerate.planCode} will replace ${targetCases.length} Test Cases and delete ${targetUnits.length} related Unit Tests. Other plans remain unchanged.`,
              );
            })()
          : ''}
        confirmLabel={t('Sinh lại', 'Regenerate')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={generate.isPending}
        onCancel={() => setPlanToRegenerate(null)}
        onConfirm={() => {
          if (!planToRegenerate) return;
          const targetPlanId = planToRegenerate.id;
          setPlanToRegenerate(null);
          generate.mutate(targetPlanId);
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
