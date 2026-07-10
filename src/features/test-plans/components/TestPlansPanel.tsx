import { FormEvent, useState } from 'react';
import { Bot, CheckCircle2, ClipboardList, Loader2, Pencil, PlusCircle, Save, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import type { ProjectStatus } from '../../projects/types';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import {
  useApproveTestPlans,
  useCreateTestPlan,
  useDeleteTestPlan,
  useGenerateTestPlans,
  useTestPlans,
  useUpdateTestPlan,
} from '../hooks/useTestPlans';
import type { TestPlan, TestType } from '../types';

interface TestPlansPanelProps {
  projectId: number;
  projectStatus: ProjectStatus;
}

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];

export function TestPlansPanel({ projectId, projectStatus }: TestPlansPanelProps) {
  const [businessRuleId, setBusinessRuleId] = useState('');
  const [testType, setTestType] = useState<TestType>('HAPPY_PATH');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTestType, setEditTestType] = useState<TestType>('HAPPY_PATH');

  const { data: plans = [], isLoading, error } = useTestPlans(projectId);
  const { data: rules = [] } = useBusinessRules(projectId);
  const approvedRules = rules.filter((rule) => rule.status === 'APPROVED');

  const createMutation = useCreateTestPlan(projectId);
  const generateMutation = useGenerateTestPlans(projectId);
  const approveMutation = useApproveTestPlans(projectId);
  const updateMutation = useUpdateTestPlan(projectId);
  const deleteMutation = useDeleteTestPlan(projectId);
  const pending = createMutation.isPending || generateMutation.isPending || approveMutation.isPending
    || updateMutation.isPending || deleteMutation.isPending;
  const mutationError = createMutation.error ?? generateMutation.error ?? approveMutation.error
    ?? updateMutation.error ?? deleteMutation.error;
  const canGenerate = projectStatus === 'BR_APPROVED' || projectStatus === 'PLAN_PENDING_REVIEW';
  const canEdit = ['BR_APPROVED', 'PLAN_PENDING_REVIEW', 'PLAN_APPROVED'].includes(projectStatus);
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
    if (plans.length > 0 && !window.confirm('Sinh lai se thay the toan bo Test Plan hien tai. Tiep tuc?')) return;
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
    if (window.confirm(`Xoa ${plan.planCode}?`)) deleteMutation.mutate(plan.id);
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Test Plans</h3>
          <p className="mt-1 text-xs text-body-subtle">Sinh Test Plan từ Business Rule đã duyệt.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-secondary"
            disabled={pending || !canGenerate || approvedRules.length === 0}
            onClick={handleGenerate}
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            AI sinh Plan
          </button>
          <button
            className="btn btn-brand"
            disabled={pending || plans.length === 0 || projectStatus !== 'PLAN_PENDING_REVIEW'}
            onClick={() => approveMutation.mutate()}
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
              <option value="">Chọn Business Rule</option>
              {approvedRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.ruleCode}
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
              placeholder="Tiêu đề Test Plan"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={pending}
            />
            <textarea
              className="form-input min-h-[88px] resize-y md:col-span-2"
              placeholder="Mục tiêu kiểm thử"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={pending}
            />
          </div>
          <button className="btn btn-secondary self-start" disabled={pending || !canCreate || !title.trim() || !description.trim()}>
            <PlusCircle size={14} />
            Thêm Plan
          </button>
        </form>

        {mutationError && (
          <div className="mb-4 rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong">
            {getErrorMessage(mutationError)}
          </div>
        )}

        {error && (
          <div className="rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong">
            {getErrorMessage(error)}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-body-subtle">Đang tải Test Plans...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-body-subtle">Chưa có Test Plan.</p>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => {
              const editing = editingPlanId === plan.id;
              return (
              <article key={plan.id} className="rounded-default border border-border-default bg-neutral-secondary-soft p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <ClipboardList size={14} className="text-body-subtle" />
                  <span className="font-mono text-xs font-semibold text-heading">{plan.planCode}</span>
                  <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                    BR #{plan.businessRuleId}
                  </span>
                  <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                    {plan.testType}
                  </span>
                  <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">
                    {plan.status}
                  </span>
                  <span className="ml-auto flex gap-1">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary px-3 py-2"
                          aria-label={`Luu ${plan.planCode}`}
                          disabled={pending || !editTitle.trim() || !editDescription.trim()}
                          onClick={() => handleSaveEdit(plan)}
                        >
                          <Save size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary px-3 py-2"
                          aria-label={`Huy ${plan.planCode}`}
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
                          aria-label={`Sua ${plan.planCode}`}
                          disabled={pending || !canEdit}
                          onClick={() => handleStartEdit(plan)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost-danger px-3 py-2"
                          aria-label={`Xoa ${plan.planCode}`}
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
                  </>
                )}
              </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
