import { SelectMenu } from '../../../shared/components/SelectMenu';
import { IconButton } from '../../../shared/components/IconButton';
import { Tag } from '../../../shared/components/Tag';
import { ErrorState } from '../../../shared/components/ErrorState';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Bot, CheckCircle2, ClipboardList, Loader2, Pencil, Play, PlusCircle, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AiGenerationProgress } from '../../../shared/components/AiGenerationProgress';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ManualEntrySection } from '../../../shared/components/ManualEntrySection';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import { SemanticBadge } from '../../../shared/components/SemanticBadge';
import { useGenerationProgress } from '../../../shared/hooks/useGenerationProgress';
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
import { projectWorkflowPath } from '../../projects/utils/project-service';
import { useSourceUpdateImpact } from '../../projects/hooks/useSourceUpdateImpact';
import { diffRowClass } from '../../projects/diffHighlight';
import { DeletedTag } from '../../../shared/components/DeletedItems';
import { SourceUpdateDeletionHistory } from '../../projects/components/SourceUpdateDeletionHistory';

interface TestPlansPanelProps {
  projectId: number;
  projectStatus: ProjectStatus;
  servicePath?: string;
}

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];

export function TestPlansPanel({ projectId, projectStatus, servicePath }: TestPlansPanelProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: plans = [], isLoading, isFetching, error } = useTestPlans(projectId, servicePath);
  const {
    activeUpdate,
    changesSeen,
    impact,
    methodDiffMap,
    getMethodDiff,
    affectedPlanIds,
    affectedRuleIds,
    addedPlanIds,
    modifiedPlanIds,
    deletedPlanIds,
    addedRuleIds,
    modifiedRuleIds,
    deletedRuleIds,
  } = useSourceUpdateImpact(projectId, 'TEST_PLAN', servicePath, !isLoading && !isFetching && !error && plans.length > 0, plans.length);
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

  const { data: rules = [] } = useBusinessRules(projectId, servicePath);
  const { data: analysis } = useAnalysis(projectId);
  const { data: allCases = [] } = useTestCases(projectId, servicePath);
  const { data: allUnits = [] } = useUnitTests(projectId, servicePath);
  const eligibleRules = rules.filter((rule) => rule.status === 'APPROVED');
  const coveredRuleIds = useMemo(() => {
    const set = new Set<number>();
    plans.forEach((plan) => {
      if (plan.businessRuleId) set.add(plan.businessRuleId);
      plan.coveredRuleIds?.forEach((id) => set.add(id));
    });
    return set;
  }, [plans]);
  const coveredRuleCount = eligibleRules.filter((rule) => coveredRuleIds.has(rule.id)).length;
  const missingRuleCount = eligibleRules.length - coveredRuleCount;

  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis, rules),
    [analysis, rules],
  );

  const createMutation = useCreateTestPlan(projectId, servicePath);
  const generateMutation = useGenerateTestPlans(projectId, servicePath);
  const generationProgress = useGenerationProgress(projectId, 'TEST_PLAN', generateMutation.isPending);
  const generationRunning = generationProgress.projectRunning
    ?? (generationProgress.data?.status === 'QUEUED' || generationProgress.data?.status === 'RUNNING');
  const approveMutation = useApproveTestPlans(projectId, servicePath);
  const updateMutation = useUpdateTestPlan(projectId);
  const deleteMutation = useDeleteTestPlan(projectId);
  const pending = createMutation.isPending || generateMutation.isPending || generationRunning || approveMutation.isPending
    || updateMutation.isPending || deleteMutation.isPending;
  const mutationError = createMutation.error ?? generateMutation.error ?? approveMutation.error
    ?? updateMutation.error ?? deleteMutation.error;
  // Regenerate được ở mọi pha từ BR trở đi; confirm sẽ cảnh báo dữ liệu pha sau
  const PLAN_EDITABLE: ProjectStatus[] = ['BR_PENDING_REVIEW', 'BR_APPROVED', 'PLAN_PENDING_REVIEW', 'PLAN_APPROVED', 'CASE_PENDING_REVIEW', 'CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED', 'COMPLETED'];
  const canGenerate = PLAN_EDITABLE.includes(projectStatus);
  const canEdit = PLAN_EDITABLE.includes(projectStatus);
  const canCreate = canEdit && eligibleRules.some((rule) => rule.id === Number(businessRuleId));
  const isPastPlans = ['PLAN_APPROVED', 'CASE_PENDING_REVIEW', 'CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED', 'COMPLETED'].includes(projectStatus);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate || !title.trim() || !description.trim()) return;
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

  const handleGenerate = (resume = false) => {
    if (!resume && plans.length > 0) {
      setShowRegenerateConfirm(true);
      return;
    }
    generateMutation.mutate(resume);
  };

  const handleStartEdit = (plan: TestPlan) => {
    setEditingPlanId(plan.id);
    setEditTitle(plan.title);
    setEditDescription(plan.description);
    setEditTestType(plan.testType);
  };

  const handleSaveEdit = (plan: TestPlan) => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    // Lưu mà không đổi gì thì chỉ đóng form, không gửi lên để khỏi bị đánh dấu cần duyệt lại
    if (editTitle.trim() === plan.title.trim() && editDescription.trim() === plan.description.trim() && editTestType === plan.testType) {
      setEditingPlanId(null);
      return;
    }
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

  const sortedPlans = useMemo(() => {
    const getPlanDiffPriority = (plan: TestPlan) => {
      const coveredRules = (plan.coveredRuleIds?.length ? plan.coveredRuleIds : [plan.businessRuleId])
        .map((ruleId) => rules.find((rule) => rule.id === ruleId))
        .filter((rule): rule is NonNullable<typeof rule> => rule != null);
      const ruleDiffs = coveredRules.map((rule) => {
        const method = (analysis?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule.methodId);
        const javaClass = (analysis?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule.methodId));
        return method
          ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
             || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
             || methodDiffMap[method.methodName])
          : undefined;
      });
      const hasAdded = addedPlanIds.has(plan.id) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => addedRuleIds.has(r.id));
      if (hasAdded) return 2;
      const hasModified = modifiedPlanIds.has(plan.id) || affectedPlanIds.has(plan.id) || ruleDiffs.includes('MODIFIED') || coveredRules.some((r) => modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id)) || (!isPastPlans && plan.isModified);
      if (hasModified) return 1;
      return 0;
    };

    return [...plans].sort((a, b) => {
      const priorityA = getPlanDiffPriority(a);
      const priorityB = getPlanDiffPriority(b);
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return a.planCode.localeCompare(b.planCode, undefined, { numeric: true });
    });
  }, [plans, rules, analysis, isPastPlans, addedPlanIds, modifiedPlanIds, affectedPlanIds, addedRuleIds, modifiedRuleIds, affectedRuleIds, methodDiffMap, getMethodDiff]);

  return (
    <section className="animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-body-subtle">{t('Sinh Test Plan theo method/feature từ Business Rule đã duyệt.', 'Generate Test Plans by method or feature from approved Business Rules.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
          <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
            {coveredRuleCount > 0 && missingRuleCount > 0 ? (
              <>
                <button
                  className="btn btn-secondary"
                  disabled={pending || !canGenerate || missingRuleCount === 0}
                  onClick={() => handleGenerate(true)}
                  title={t(
                    `Tiếp tục sinh Test Plan cho ${missingRuleCount} Business Rule mới/chưa có plan`,
                    `Continue generating Test Plans for ${missingRuleCount} remaining Business Rules`
                  )}
                >
                  {generateMutation.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  {t(`Tiếp tục sinh (${missingRuleCount} rule mới)`, `Continue (${missingRuleCount} new rules)`)}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={pending || !canGenerate || eligibleRules.length === 0}
                  onClick={() => handleGenerate(false)}
                  title={t('Xóa toàn bộ Test Plan cũ và sinh lại từ đầu', 'Regenerate all test plans from scratch')}
                >
                  <RotateCcw size={14} /> {t('Sinh lại từ đầu', 'Regenerate all')}
                </button>
              </>
            ) : (
              <button
                className="btn btn-secondary"
                disabled={pending || !canGenerate || eligibleRules.length === 0}
                onClick={() => handleGenerate(false)}
                title={coveredRuleCount > 0 ? t('Xóa toàn bộ Test Plan cũ và sinh lại từ đầu', 'Regenerate all test plans from scratch') : undefined}
              >
                {generateMutation.isPending || generationRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Bot size={14} />
                )}
                {t('AI sinh Plan', 'Generate with AI')}
              </button>
            )}
            <AiGenerationProgress
              projectId={projectId}
              active={generateMutation.isPending || generationRunning || generationProgress.showProgress}
              label={t('Tiến trình AI của dự án', 'Project AI progress')}
              progress={generationProgress.projectProgress ?? generationProgress.data}
              onPause={generationProgress.pause}
              onResume={() => handleGenerate(true)}
              onCancel={generationProgress.cancel}
            />
          </div>
          <button
            className="btn btn-brand"
            disabled={pending || plans.length === 0 || projectStatus !== 'PLAN_PENDING_REVIEW'}
            onClick={() => approveMutation.mutate(undefined, {
              onSuccess: () => navigate(projectWorkflowPath(projectId, 'test-cases', servicePath), {
                state: { workflowNotice: t('Đã duyệt Test Plan. Chuyển sang bước Test Case.', 'Test Plans approved. Continue with Test Cases.') },
              }),
            })}
          >
            {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {t('Duyệt tất cả', 'Approve all')}
          </button>
        </div>
      </div>

      {rules.length > 0 && eligibleRules.length === 0 && (
        <InlineAlert tone="warning" dismissible={false}>{t('Hãy duyệt Business Rule trước khi sinh Test Plan.', 'Approve Business Rules before generating Test Plans.')}{' '}
          <Link className="rounded-control font-semibold underline underline-offset-2" to={projectWorkflowPath(projectId, undefined, servicePath)}>{t('Duyệt Business Rule', 'Review Business Rules')}</Link>
        </InlineAlert>
      )}
      {eligibleRules.length > 0 && rules.length > eligibleRules.length && (
        <InlineAlert tone="warning" dismissible={false}>{t(`Còn ${rules.length - eligibleRules.length} Business Rule chờ duyệt lại. Hãy duyệt để sinh Test Plan cho chúng.`, `${rules.length - eligibleRules.length} Business Rule(s) await approval. Approve them to generate their Test Plans.`)}{' '}
          <Link className="rounded-control font-semibold underline underline-offset-2" to={projectWorkflowPath(projectId, undefined, servicePath)}>{t('Duyệt Business Rule', 'Review Business Rules')}</Link>
        </InlineAlert>
      )}

      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4">
        <ManualEntrySection title={t('Thêm Test Plan thủ công', 'Add a Test Plan manually')}>
        <form onSubmit={handleCreate} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="grid gap-3 md:grid-cols-2">
            <SelectMenu
              value={businessRuleId}
              onChange={(selectedValue) => setBusinessRuleId(selectedValue)}
              disabled={pending || eligibleRules.length === 0}
              aria-label={t('Chọn anchor Business Rule', 'Select anchor Business Rule')}
              searchable
              options={[{ value: "", label: String(t('Chọn anchor Business Rule', 'Select anchor Business Rule')) }, ...eligibleRules.map((rule) => (
                ({ value: String(rule.id), label: String(rule.ruleCode) + String(rule.sourceBranchId ? ` | ${rule.sourceBranchId}` : '') + " | " + String(rule.description) })
              ))]}
            />
            <SelectMenu
              value={testType}
              onChange={(selectedValue) => setTestType(selectedValue as TestType)}
              disabled={pending}
              aria-label={'Test type'}
              options={[...TEST_TYPES.map((type) => (
                ({ value: type, label: String(type) })
              ))]}
            />
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
        </ManualEntrySection>

        {mutationError && <InlineAlert tone="danger">{getErrorMessage(mutationError)}</InlineAlert>}

        {isLoading ? (
          <LoadingState label={t('Đang tải Test Plans...', 'Loading Test Plans...')} minHeight="min-h-[140px]" />
        ) : error ? (<ErrorState error={error} title={t('Không tải được Test Plan', 'Unable to load Test Plans')} />) : plans.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('Chưa có Test Plan', 'No Test Plans yet')}
            hint={t('Bấm "AI sinh Plan" hoặc thêm thủ công từ Business Rule đã duyệt.', 'Select "Generate with AI" or add one manually from approved Business Rules.')}
            minHeight="min-h-[180px]"
          />
        ) : (
          <div className="-mx-4 border-t border-border-default">
            {sortedPlans.map((plan) => {
              const editing = editingPlanId === plan.id;
              const coveredRules = (plan.coveredRuleIds?.length ? plan.coveredRuleIds : [plan.businessRuleId])
                .map((ruleId) => rules.find((rule) => rule.id === ruleId))
                .filter((rule): rule is NonNullable<typeof rule> => rule != null);
              const ruleDiffs = coveredRules.map((rule) => {
                const method = (analysis?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule.methodId);
                const javaClass = (analysis?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule.methodId));
                return method
                  ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
                     || methodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
                     || methodDiffMap[method.methodName])
                  : undefined;
              });
              const hasAdded = !changesSeen && (addedPlanIds.has(plan.id) || ruleDiffs.includes('ADDED') || coveredRules.some((r) => addedRuleIds.has(r.id)));
              const hasDeleted = deletedPlanIds.has(plan.id) || ruleDiffs.includes('DELETED') || coveredRules.some((r) => deletedRuleIds.has(r.id));
              const hasModified = !changesSeen && !hasAdded && !hasDeleted && (
                modifiedPlanIds.has(plan.id) || affectedPlanIds.has(plan.id) || ruleDiffs.includes('MODIFIED') || coveredRules.some((r) => modifiedRuleIds.has(r.id) || affectedRuleIds.has(r.id))
                || (!isPastPlans && plan.isModified)
              );

              const cardClass = `border-b border-border-default p-4 last:border-b-0 transition-colors ${
                diffRowClass({ added: hasAdded, modified: hasModified, deleted: hasDeleted }, 'even:bg-neutral-secondary-medium/50 hover:bg-neutral-secondary-medium')}`;

              return (
              <article key={plan.id} className={cardClass}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ClipboardList size={14} className="text-body-subtle" />
                  <span className="font-mono text-xs font-semibold text-heading">{plan.planCode}</span>
                  <Tag>
                    {coveredRules.map((rule) => rule.ruleCode).join(', ') || `BR #${plan.businessRuleId}`}
                  </Tag>
                  <SemanticBadge kind="test-type" value={plan.testType} />
                  <SemanticBadge kind="review-status" value={plan.status} />
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
                  {plan.isModified && !isPastPlans && (
                    <Tag variant="status" tone={'warning'} icon={Clock}>
                      {plan.status === 'APPROVED'
                        ? t('Cần sinh lại Test Case', 'Test Cases need regeneration')
                        : t('Cần duyệt lại', 'Requires approval')}
                    </Tag>
                  )}
                  <span className="ml-auto flex gap-1 font-mono">
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
                        <IconButton icon={X} label={t(`Hủy ${plan.planCode}`, `Cancel ${plan.planCode}`)} disabled={pending} onClick={() => setEditingPlanId(null)} />
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
                    <SelectMenu
                      value={editTestType}
                      onChange={(selectedValue) => setEditTestType(selectedValue as TestType)}
                      aria-label={'Test type'}
                      options={[...TEST_TYPES.map((type) => ({ value: type, label: String(type) }))]}
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-heading">{plan.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-body">{plan.description}</p>
                    <div className="mt-3 space-y-2">
                      {coveredRules.map((rule) => (
                        <div key={rule.id}>
                          <p className="mb-1 font-mono text-xs font-semibold text-heading">
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
      <SourceUpdateDeletionHistory update={activeUpdate} impact={impact} targetType="TEST_PLAN"
        currentIds={plans.map((plan) => plan.id)} servicePath={servicePath} />
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
          generateMutation.mutate(false);
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
