import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, ClipboardList, Loader2, Pencil, PlusCircle, Save, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import type { ProjectStatus } from '../../projects/types';
import { useAnalysis } from '../../projects/hooks/useProjects';
import { buildRuleSourceIndex } from '../../projects/utils/source-trace';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import { useTestCases } from '../../test-cases/hooks/useTestCases';
import { useUnitTests } from '../../unit-tests/hooks/useUnitTests';
import {
  useApproveTestPlans,
  useCreateTestPlan,
  useDeleteTestPlan,
  useGenerateTestPlans,
  useTestPlans,
  useUpdateTestPlan,
} from '../hooks/useTestPlans';
import type { TestPlan, TestType } from '../types';
import { useLanguage } from '../../../shared/i18n/language';

interface TestPlansPanelProps {
  projectId: number;
  projectStatus: ProjectStatus;
}

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];

export function TestPlansPanel({ projectId, projectStatus }: TestPlansPanelProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [businessRuleId, setBusinessRuleId] = useState('');
  const [testType, setTestType] = useState<TestType>('HAPPY_PATH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTestType, setEditTestType] = useState<TestType>('HAPPY_PATH');
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<TestPlan | null>(null);

  const { data: plans = [], isLoading, error } = useTestPlans(projectId);
  const { data: rules = [] } = useBusinessRules(projectId);
  const { data: analysis } = useAnalysis(projectId);
  const { data: allCases = [] } = useTestCases(projectId);
  const { data: allUnits = [] } = useUnitTests(projectId);
  const approvedRules = rules.filter((rule) => rule.status === 'APPROVED');
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis, rules),
    [analysis, rules],
  );

  const createMutation = useCreateTestPlan(projectId);
  const generateMutation = useGenerateTestPlans(projectId);
  const approveMutation = useApproveTestPlans(projectId);
  const updateMutation = useUpdateTestPlan(projectId);
  const deleteMutation = useDeleteTestPlan(projectId);
  const pending = createMutation.isPending || generateMutation.isPending || approveMutation.isPending
    || updateMutation.isPending || deleteMutation.isPending;
  const mutationError = createMutation.error ?? generateMutation.error ?? approveMutation.error
    ?? updateMutation.error ?? deleteMutation.error;
  // Regenerate được ở mọi pha từ BR_APPROVED trở đi (khớp guard backend); confirm sẽ cảnh báo dữ liệu pha sau
  const PLAN_EDITABLE: ProjectStatus[] = ['BR_APPROVED', 'PLAN_PENDING_REVIEW', 'PLAN_APPROVED', 'CASE_PENDING_REVIEW', 'CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED', 'COMPLETED'];
  const canGenerate = PLAN_EDITABLE.includes(projectStatus);
  const canEdit = PLAN_EDITABLE.includes(projectStatus);
  const canCreate = canEdit && approvedRules.length > 0 && Boolean(businessRuleId);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !businessRuleId) return;
    createMutation.mutate(
      {
        businessRuleId: Number(businessRuleId),
        title: title.trim(),
        description: description.trim(),
        testType,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
        },
      },
    );
  };

  const handleGenerate = () => {
    if (plans.length > 0) {
      setShowRegenerateConfirm(true);
      return;
    }
    generateMutation.mutate();
  };

  const handleStartEdit = (plan: TestPlan) => {
    setEditingPlanId(plan.id);
    setEditTitle(plan.title);
    setEditDescription(plan.description);
    setEditTestType(plan.testType);
  };

  const handleSaveEdit = (plan: TestPlan) => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    updateMutation.mutate({
      planId: plan.id,
      input: {
        businessRuleId: plan.businessRuleId,
        title: editTitle.trim(),
        description: editDescription.trim(),
        testType: editTestType,
      },
    }, { onSuccess: () => setEditingPlanId(null) });
  };

  const handleDelete = (plan: TestPlan) => {
    setPlanToDelete(plan);
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Test Plans</h3>
          <p className="mt-1 text-xs text-body-subtle">{t('Sinh Test Plan theo method/feature từ Business Rule đã approve.', 'Generate Test Plans by method or feature from approved Business Rules.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary"
            disabled={pending || !canGenerate || approvedRules.length === 0}
            onClick={handleGenerate}
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            {t('AI sinh Plan', 'Generate with AI')}
          </button>
          <button
            className="btn btn-brand"
            disabled={pending || plans.length === 0 || projectStatus !== 'PLAN_PENDING_REVIEW'}
            onClick={() => approveMutation.mutate(undefined, {
              onSuccess: () => navigate(`/projects/${projectId}/test-cases`, {
                state: { workflowNotice: t('Đã duyệt Test Plan. Chuyển sang bước Test Case.', 'Test Plans approved. Continue with Test Cases.') },
              }),
            })}
          >
            {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve
          </button>
        </div>
      </div>

      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        <form onSubmit={handleCreate} className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="form-input"
              value={businessRuleId}
              onChange={(event) => setBusinessRuleId(event.target.value)}
              disabled={pending || approvedRules.length === 0}
            >
              <option value="">{t('Chọn anchor Business Rule', 'Select anchor Business Rule')}</option>
              {approvedRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.ruleCode}{rule.sourceBranchId ? ` | ${rule.sourceBranchId}` : ''} | {rule.description}
                </option>
              ))}
            </select>
            <select
              className="form-input"
              value={testType}
              onChange={(event) => setTestType(event.target.value as TestType)}
              disabled={pending}
            >
              {TEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              className="form-input md:col-span-2"
              placeholder={t('Tiêu đề Test Plan', 'Test Plan title')}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={pending}
            />
            <textarea
              className="form-input min-h-[88px] resize-y md:col-span-2"
              placeholder={t('Mục tiêu test', 'Test objective')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={pending}
            />
          </div>
          <button className="btn btn-secondary self-start" disabled={pending || !canCreate || !title.trim() || !description.trim()}>
            <PlusCircle size={14} />
            {t('Thêm Plan', 'Add Plan')}
          </button>
        </form>

        {mutationError && <InlineAlert tone="danger">{getErrorMessage(mutationError)}</InlineAlert>}
        {error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}

        {isLoading ? (
          <LoadingState label={t('Đang tải Test Plans...', 'Loading Test Plans...')} minHeight="min-h-[140px]" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('Chưa có Test Plan', 'No Test Plans yet')}
            hint={t('Bấm "AI sinh Plan" hoặc thêm thủ công từ Business Rule đã approve.', 'Select "Generate with AI" or add one manually from approved Business Rules.')}
            minHeight="min-h-[180px]"
          />
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => {
              const editing = editingPlanId === plan.id;
              const coveredRules = (plan.coveredRuleIds?.length ? plan.coveredRuleIds : [plan.businessRuleId])
                .map((ruleId) => rules.find((rule) => rule.id === ruleId))
                .filter((rule): rule is NonNullable<typeof rule> => rule != null);
              return (
              <article key={plan.id} className="rounded-default border border-border-default bg-neutral-secondary-soft p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ClipboardList size={14} className="text-body-subtle" />
                  <span className="font-mono text-xs font-semibold text-heading">{plan.planCode}</span>
                  <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                    {coveredRules.map((rule) => rule.ruleCode).join(', ') || `BR #${plan.businessRuleId}`}
                  </span>
                  <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                    {plan.testType}
                  </span>
                  <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">
                    {plan.status}
                  </span>
                  {plan.isModified && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-fg-warning">
                      {plan.status === 'APPROVED'
                        ? t('Cần sinh lại Test Case', 'Test Cases need regeneration')
                        : t('Cần approve lại', 'Requires approval')}
                    </span>
                  )}
                  <span className="ml-auto flex gap-1">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary px-3 py-2"
                          aria-label={t(`Lưu ${plan.planCode}`, `Save ${plan.planCode}`)}
                          disabled={pending || !editTitle.trim() || !editDescription.trim()}
                          onClick={() => handleSaveEdit(plan)}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary px-3 py-2"
                          aria-label={t(`Hủy ${plan.planCode}`, `Cancel ${plan.planCode}`)}
                          disabled={pending}
                          onClick={() => setEditingPlanId(null)}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary px-3 py-2"
                          aria-label={t(`Sửa ${plan.planCode}`, `Edit ${plan.planCode}`)}
                          disabled={pending || !canEdit}
                          onClick={() => handleStartEdit(plan)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost-danger px-3 py-2"
                          aria-label={t(`Xóa ${plan.planCode}`, `Delete ${plan.planCode}`)}
                          disabled={pending || !canEdit}
                          onClick={() => handleDelete(plan)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <input className="form-input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                    <textarea
                      className="form-input min-h-[80px] resize-y"
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                    />
                    <select
                      className="form-input"
                      value={editTestType}
                      onChange={(event) => setEditTestType(event.target.value as TestType)}
                    >
                      {TEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-semibold text-heading">{plan.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-body">{plan.description}</p>
                    <div className="mt-3 space-y-2">
                      {coveredRules.map((rule) => (
                        <div key={rule.id}>
                          <p className="mb-1 font-mono text-[11px] font-semibold text-fg-brand-strong">
                            {rule.ruleCode}{rule.sourceBranchId ? ` | ${rule.sourceBranchId}` : ''}
                          </p>
                          <SourceTrace value={sourceTraceByRule.get(rule.id)} compact />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={showRegenerateConfirm}
        title={t('Sinh lại toàn bộ Test Plan?', 'Regenerate all Test Plans?')}
        description={t(
          `Hệ thống sẽ thay thế ${plans.length} Test Plan hiện có và xóa ${allCases.length} Test Case, ${allUnits.length} Unit Test liên quan.`,
          `The system will replace ${plans.length} existing Test Plans and delete ${allCases.length} related Test Cases and ${allUnits.length} Unit Tests.`,
        )}
        confirmLabel={t('Sinh lại', 'Regenerate')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={generateMutation.isPending}
        onCancel={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false);
          generateMutation.mutate();
        }}
      />
      <ConfirmDialog
        open={planToDelete != null}
        title={t('Xóa Test Plan?', 'Delete Test Plan?')}
        description={planToDelete
          ? (() => {
              const planCases = allCases.filter((item) => item.testPlanId === planToDelete.id).length;
              return t(
                `${planToDelete.planCode} sẽ bị xóa cùng ${planCases} Test Case và các Unit Test liên quan.`,
                `${planToDelete.planCode} will be deleted with ${planCases} Test Cases and their related Unit Tests.`,
              );
            })()
          : ''}
        confirmLabel={t('Xóa plan', 'Delete plan')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={deleteMutation.isPending}
        onCancel={() => setPlanToDelete(null)}
        onConfirm={() => {
          if (!planToDelete) return;
          const planId = planToDelete.id;
          setPlanToDelete(null);
          deleteMutation.mutate(planId);
        }}
      />
    </section>
  );
}
