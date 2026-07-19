import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  ListFilter,
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import type { TestPlan, TestType } from '../../test-plans/types';

const TEST_TYPES: TestType[] = ['HAPPY_PATH', 'BOUNDARY', 'EXCEPTION', 'EDGE'];
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

type Priority = (typeof PRIORITIES)[number];
type CaseStatus = 'DRAFT' | 'APPROVED';

interface DraftTestCase {
  id: number;
  testId: string;
  planId: number;
  planCode: string;
  testType: TestType;
  description: string;
  preconditions: string;
  testData: string;
  expectedResult: string;
  priority: Priority;
  traceSource: string;
  status: CaseStatus;
}

export function TestCasesPanel({ projectId }: { projectId: number }) {
  const { data: plans = [], isLoading, error } = useTestPlans(projectId);
  const approvedPlans = useMemo(() => plans.filter((plan) => plan.status === 'APPROVED'), [plans]);
  const [planId, setPlanId] = useState('');
  const [cases, setCases] = useState<DraftTestCase[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DraftTestCase | null>(null);
  const nextCaseIdRef = useRef(1);

  const selectedPlan = approvedPlans.find((plan) => String(plan.id) === planId);
  const visibleCases = useMemo(
    () => (selectedPlan ? cases.filter((item) => item.planId === selectedPlan.id) : cases),
    [cases, selectedPlan],
  );
  const draftCount = cases.filter((item) => item.status === 'DRAFT').length;
  const approvedCount = cases.filter((item) => item.status === 'APPROVED').length;
  const visibleDraftCount = visibleCases.filter((item) => item.status === 'DRAFT').length;
  const planReady = approvedPlans.length > 0;
  const generationScope = selectedPlan ? selectedPlan.planCode : `${approvedPlans.length} plan đã duyệt`;

  useEffect(() => {
    setPlanId('');
    setCases([]);
    setEditingId(null);
    setEditForm(null);
    nextCaseIdRef.current = 1;
  }, [projectId]);

  const handleGenerate = () => {
    const generationPlans = selectedPlan ? [selectedPlan] : approvedPlans;
    if (generationPlans.length === 0) return;

    setCases((current) => {
      const additions = generationPlans.map((plan) => {
        const nextCaseId = nextCaseIdRef.current;
        nextCaseIdRef.current += 1;
        return buildDraftCase(plan, buildSuggestedCase(plan, nextCaseId), nextCaseId);
      });
      return [...current, ...additions];
    });
  };

  const handleApprove = () => {
    const targetPlanId = selectedPlan?.id;
    setCases((current) => current.map((item) => (
      !targetPlanId || item.planId === targetPlanId ? { ...item, status: 'APPROVED' } : item
    )));
  };

  const handleSaveEdit = () => {
    if (!editForm || !editForm.description.trim() || !editForm.expectedResult.trim()) return;
    setCases((current) => current.map((item) => (
      item.id === editForm.id ? { ...editForm, status: item.status } : item
    )));
    setEditingId(null);
    setEditForm(null);
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Test Cases</h3>
          <p className="mt-1 text-xs text-body-subtle">Review output AI theo Test Plan đã duyệt trước khi sinh Unit Test.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" disabled={!planReady || isLoading} onClick={handleGenerate}>
            <Bot size={14} />
            AI sinh Case
          </button>
          <button className="btn btn-brand" disabled={visibleDraftCount === 0} onClick={handleApprove}>
            <CheckCircle2 size={14} />
            Approve
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric icon={ClipboardCheck} label="Approved Plans" value={approvedPlans.length} tone="brand" />
        <Metric icon={FileText} label="Draft Cases" value={draftCount} />
        <Metric icon={Database} label="Approved Cases" value={approvedCount} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,1.05fr)]">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          {error && (
            <div className="mb-4 rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong">
              {getErrorMessage(error)}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-default bg-brand-softer text-fg-brand-strong">
                <ListFilter size={16} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-heading">Phạm vi sinh case</p>
                <p className="mt-0.5 truncate text-xs text-body-subtle">{generationScope}</p>
              </div>
            </div>
          </div>

          <select
            aria-label="Loc Test Plan"
            className="form-input mt-4"
            value={planId}
            onChange={(event) => {
              setPlanId(event.target.value);
              setEditingId(null);
              setEditForm(null);
            }}
            disabled={!planReady || isLoading}
          >
            <option value="">Tất cả Test Plan đã duyệt</option>
            {approvedPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.planCode} - {plan.title}
              </option>
            ))}
          </select>

          <div className="mt-4 grid gap-2 text-sm">
            <ContextRow label="Selected Plan" value={selectedPlan?.planCode ?? 'Tất cả'} />
            <ContextRow label="Type" value={selectedPlan?.testType ?? 'Mixed'} />
            <ContextRow label="Business Rule" value={selectedPlan ? `BR #${selectedPlan.businessRuleId}` : 'Theo từng plan'} />
            <ContextRow label="Cases in scope" value={String(visibleCases.length)} />
          </div>
        </div>

        <aside className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle">
              <ClipboardCheck size={15} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-heading">Review checklist</p>
              <p className="mt-0.5 truncate text-xs text-body-subtle">Đủ trường để trace sang Unit Test.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {['Description', 'Preconditions', 'Test data', 'Expected result', 'Priority', 'Trace source'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-default bg-neutral-secondary-soft px-3 py-2 text-sm text-body">
                <CheckCircle2 size={13} className="text-fg-success-strong" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="mt-4 overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
        <div className="hidden bg-neutral-secondary-soft px-3 py-2 text-[11px] font-semibold uppercase text-body-subtle md:grid md:grid-cols-[96px_120px_minmax(0,1fr)_96px_132px]">
          <span>Case</span>
          <span>Plan</span>
          <span>Description</span>
          <span>Priority</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <p className="px-3 py-4 text-sm text-body-subtle">Đang tải Test Plan...</p>
        ) : visibleCases.length === 0 ? (
          <p className="px-3 py-4 text-sm text-body-subtle">
            {approvedPlans.length === 0 ? 'Chưa có Test Plan đã duyệt.' : 'Chưa có Test Case trong phạm vi này.'}
          </p>
        ) : (
          visibleCases.map((item) => (
            <article key={item.id} className="border-t border-border-default px-3 py-3 first:border-t-0 md:first:border-t">
              {editingId === item.id && editForm ? (
                <EditCaseForm
                  item={editForm}
                  onChange={setEditForm}
                  onCancel={() => {
                    setEditingId(null);
                    setEditForm(null);
                  }}
                  onSave={handleSaveEdit}
                />
              ) : (
                <CaseRow
                  item={item}
                  onDelete={() => setCases((current) => current.filter((caseItem) => caseItem.id !== item.id))}
                  onEdit={() => {
                    setEditingId(item.id);
                    setEditForm(item);
                  }}
                />
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function buildDraftCase(
  plan: TestPlan,
  input: Omit<DraftTestCase, 'id' | 'testId' | 'planId' | 'planCode' | 'status'>,
  nextCaseId: number,
): DraftTestCase {
  return {
    ...input,
    id: nextCaseId,
    testId: `TC-${String(nextCaseId).padStart(3, '0')}`,
    planId: plan.id,
    planCode: plan.planCode,
    status: 'DRAFT',
  };
}

function buildSuggestedCase(plan: TestPlan, nextIndex: number): Omit<DraftTestCase, 'id' | 'testId' | 'planId' | 'planCode' | 'status'> {
  return {
    testType: plan.testType,
    priority: plan.testType === 'EXCEPTION' ? 'HIGH' : 'MEDIUM',
    description: `${plan.title} - scenario ${nextIndex}`,
    preconditions: 'Business Rule và Test Plan đã được duyệt.',
    testData: plan.testType === 'EXCEPTION' ? '{"invalidInput": true}' : '{"validInput": true}',
    expectedResult: 'Kết quả thỏa mãn mục tiêu của Test Plan.',
    traceSource: `BR #${plan.businessRuleId} -> ${plan.planCode}`,
  };
}

function Metric({ icon: Icon, label, value, tone }: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: 'brand';
}) {
  return (
    <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-default ${
        tone === 'brand' ? 'bg-brand-softer text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body-subtle'
      }`}>
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <p className="text-xs font-semibold uppercase text-body-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold text-heading">{value}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 rounded-default bg-neutral-secondary-soft px-3 py-2">
      <dt className="text-body-subtle">{label}</dt>
      <dd className="truncate font-medium text-heading">{value}</dd>
    </div>
  );
}

function CaseRow({ item, onDelete, onEdit }: { item: DraftTestCase; onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-[96px_120px_minmax(0,1fr)_96px_132px] md:items-center">
      <span className="font-mono text-xs font-semibold text-heading">{item.testId}</span>
      <span className="font-mono text-xs font-semibold text-body-subtle">{item.planCode}</span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-heading">{item.description}</span>
        <span className="mt-1 block truncate text-xs text-body-subtle">{item.expectedResult}</span>
      </span>
      <span className="text-xs font-semibold text-body">{item.priority}</span>
      <span className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          item.status === 'APPROVED'
            ? 'bg-success-soft text-fg-success-strong'
            : 'bg-warning-soft text-fg-warning'
        }`}>
          {item.status}
        </span>
        <span className="flex shrink-0 gap-1">
          <button type="button" className="btn btn-secondary px-2 py-2" aria-label={`Sua ${item.testId}`} onClick={onEdit}>
            <Pencil size={13} />
          </button>
          <button type="button" className="btn-ghost-danger px-2 py-2" aria-label={`Xoa ${item.testId}`} onClick={onDelete}>
            <Trash2 size={13} />
          </button>
        </span>
      </span>
    </div>
  );
}

function EditCaseForm({ item, onCancel, onChange, onSave }: {
  item: DraftTestCase;
  onCancel: () => void;
  onChange: (item: DraftTestCase) => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      <input
        aria-label="Edit description"
        className="form-input lg:col-span-2"
        value={item.description}
        onChange={(event) => onChange({ ...item, description: event.target.value })}
      />
      <select
        aria-label="Edit test type"
        className="form-input"
        value={item.testType}
        onChange={(event) => onChange({ ...item, testType: event.target.value as TestType })}
      >
        {TEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
      </select>
      <select
        aria-label="Edit priority"
        className="form-input"
        value={item.priority}
        onChange={(event) => onChange({ ...item, priority: event.target.value as Priority })}
      >
        {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
      <textarea
        aria-label="Edit preconditions"
        className="form-input min-h-[72px] resize-y"
        value={item.preconditions}
        onChange={(event) => onChange({ ...item, preconditions: event.target.value })}
      />
      <textarea
        aria-label="Edit test data"
        className="form-input min-h-[72px] resize-y"
        value={item.testData}
        onChange={(event) => onChange({ ...item, testData: event.target.value })}
      />
      <textarea
        aria-label="Edit expected result"
        className="form-input min-h-[72px] resize-y lg:col-span-2"
        value={item.expectedResult}
        onChange={(event) => onChange({ ...item, expectedResult: event.target.value })}
      />
      <input
        aria-label="Edit trace source"
        className="form-input lg:col-span-2"
        value={item.traceSource}
        onChange={(event) => onChange({ ...item, traceSource: event.target.value })}
      />
      <div className="flex gap-2 lg:col-span-2">
        <button
          type="button"
          aria-label="Luu thay doi"
          className="btn btn-brand"
          disabled={!item.description.trim() || !item.expectedResult.trim()}
          onClick={onSave}
        >
          <Save size={14} />
          Lưu
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          <X size={14} />
          Hủy
        </button>
      </div>
    </div>
  );
}
