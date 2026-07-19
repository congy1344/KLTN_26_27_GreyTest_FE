import { FormEvent, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useAnalysis } from '../../projects/hooks/useProjects';
import {
  useAcceptBusinessRuleSuggestion,
  useApproveBusinessRules,
  useBusinessRules,
  useCreateBusinessRules,
  useDeleteBusinessRule,
  useGenerateBusinessRules,
  useReviewBusinessRules,
  useUpdateBusinessRule,
} from '../hooks/useBusinessRules';
import type { BusinessRule, BusinessRuleReview } from '../types';
import { splitBusinessRuleText } from '../utils/business-rule-text';

interface BusinessRulesPanelProps {
  projectId: number;
}

export function BusinessRulesPanel({ projectId }: BusinessRulesPanelProps) {
  const [description, setDescription] = useState('');
  const [methodId, setMethodId] = useState('');
  const [reviewResult, setReviewResult] = useState<BusinessRuleReview | null>(null);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<number>>(new Set());
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [collapsedAll, setCollapsedAll] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const { data: rules = [], isLoading, error } = useBusinessRules(projectId);
  const { data: analysis } = useAnalysis(projectId);
  const serviceMethods = analysis?.classes
    .filter((javaClass) => javaClass.classType === 'SERVICE')
    .flatMap((javaClass) => javaClass.methods.map((method) => ({
      id: method.id,
      label: `${javaClass.className}.${method.methodName}`,
    }))) ?? [];
  const createMutation = useCreateBusinessRules(projectId);
  const generateMutation = useGenerateBusinessRules(projectId);
  const reviewMutation = useReviewBusinessRules(projectId);
  const approveMutation = useApproveBusinessRules(projectId);
  const updateMutation = useUpdateBusinessRule(projectId);
  const acceptSuggestionMutation = useAcceptBusinessRuleSuggestion(projectId);
  const deleteMutation = useDeleteBusinessRule(projectId);
  const pending =
    createMutation.isPending ||
    generateMutation.isPending ||
    reviewMutation.isPending ||
    approveMutation.isPending ||
    updateMutation.isPending ||
    acceptSuggestionMutation.isPending ||
    deleteMutation.isPending;
  const mutationError =
    createMutation.error ??
    generateMutation.error ??
    reviewMutation.error ??
    approveMutation.error ??
    updateMutation.error ??
    acceptSuggestionMutation.error ??
    deleteMutation.error;

  const draftRules = splitBusinessRuleText(description);
  const dirtyRuleCount = rules.filter((rule) => rule.isModified).length;
  const reviewByRuleId = useMemo(() => {
    return new Map(reviewResult?.reviewedRules.map((review) => [review.ruleId, review]) ?? []);
  }, [reviewResult]);
  const unresolvedSuggestionCount = rules.filter((rule) => {
    const reviewSuggestion = reviewByRuleId.get(rule.id)?.suggestedDescription;
    return (rule.suggestedDescription?.trim() || reviewSuggestion?.trim())
      && !dismissedSuggestionIds.has(rule.id);
  }).length;

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (draftRules.length === 0 || !methodId) return;
    createMutation.mutate({ methodId: Number(methodId), descriptions: draftRules }, {
      onSuccess: () => setDescription(''),
    });
  };

  const handleReview = () => {
    reviewMutation.mutate(undefined, {
      onSuccess: (result) => {
        setReviewResult(result);
        setDismissedSuggestionIds(new Set());
        setCollapsedAll(false);
      },
    });
  };

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: (generated) => {
        setGenerationMessage(generated.length === 0
          ? 'Khong con Service method chua co Business Rule.'
          : `AI da sinh ${generated.length} Business Rule moi.`);
      },
    });
  };

  const handleStartEdit = (rule: BusinessRule) => {
    setEditingRuleId(rule.id);
    setEditDescription(rule.description);
  };

  const handleSaveEdit = (rule: BusinessRule) => {
    if (!editDescription.trim()) return;
    updateMutation.mutate(
      { rule, description: editDescription },
      {
        onSuccess: () => {
          setEditingRuleId(null);
          setEditDescription('');
          setDismissedSuggestionIds((current) => new Set(current).add(rule.id));
        },
      },
    );
  };

  const handleDelete = (rule: BusinessRule) => {
    if (!window.confirm(`Xoa ${rule.ruleCode}?`)) return;
    deleteMutation.mutate(rule.id);
  };

  const handleUseSuggestion = (rule: BusinessRule) => {
    acceptSuggestionMutation.mutate(
      rule.id,
      {
        onSuccess: () => {
          setDismissedSuggestionIds((current) => new Set(current).add(rule.id));
        },
      },
    );
  };

  const handleKeepMine = (ruleId: number) => {
    setDismissedSuggestionIds((current) => new Set(current).add(ruleId));
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Business Rules</h3>
          <p className="mt-1 text-xs text-body-subtle">
            AI sinh BR tu source code; AI review chi bat khi ban them hoac sua rule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" disabled={pending} onClick={handleGenerate}>
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            AI sinh BR
          </button>
          <button className="btn btn-secondary" disabled={pending || dirtyRuleCount === 0} onClick={handleReview}>
            {reviewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI review thay doi{dirtyRuleCount > 0 ? ` (${dirtyRuleCount})` : ''}
          </button>
          <button
            className="btn btn-secondary"
            disabled={rules.length === 0}
            onClick={() => setCollapsedAll((value) => !value)}
          >
            {collapsedAll ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {collapsedAll ? 'Mo tat ca' : 'Thu gon'}
          </button>
          <button
            className="btn btn-brand"
            disabled={pending || rules.length === 0 || dirtyRuleCount > 0 || unresolvedSuggestionCount > 0}
            onClick={() => approveMutation.mutate()}
            title={dirtyRuleCount > 0
              ? 'Can AI review cac rule ban da them hoac sua truoc'
              : unresolvedSuggestionCount > 0
                ? 'Can chon giu rule goc hoac dung goi y AI truoc'
                : undefined}
          >
            {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve tat ca
          </button>
        </div>
      </div>

      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        {generationMessage && (
          <div className="mb-4 rounded-default border border-border-brand-subtle bg-brand-softer p-3 text-xs font-medium text-fg-brand-strong">
            {generationMessage}
          </div>
        )}
        {collapsedAll ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-heading">{rules.length} Business Rules dang duoc thu gon</p>
              <p className="mt-1 text-xs text-body-subtle">
                Mo tat ca de sua, xoa, review hoac chon goi y AI.
              </p>
            </div>
            {unresolvedSuggestionCount > 0 && (
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-fg-warning">
                {unresolvedSuggestionCount} goi y chua chon
              </span>
            )}
            {dirtyRuleCount > 0 && (
              <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-fg-warning">
                {dirtyRuleCount} rule can AI review
              </span>
            )}
          </div>
        ) : (
          <>
        <form onSubmit={handleCreate} className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <select className="form-input" value={methodId} onChange={(event) => setMethodId(event.target.value)}>
              <option value="">Chon Service method</option>
              {serviceMethods.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
            </select>
            <textarea
              className="form-input min-h-[112px] resize-y"
              placeholder={'Moi endpoint REST phai co it nhat mot test case.\nNeu email da ton tai thi tra ve HTTP 409.'}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <button className="btn btn-secondary self-start" disabled={pending || !methodId || draftRules.length === 0}>
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquarePlus size={14} />}
            {draftRules.length > 1 ? `Them ${draftRules.length} BR` : 'Them BR'}
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

        {reviewResult && (
          <div className="mb-4 rounded-default border border-border-brand-subtle bg-brand-softer p-3 text-xs font-medium text-fg-brand-strong">
            AI da review {reviewResult.reviewedRules.length} BR
            {reviewResult.suggestedRules.length > 0 ? ` va them ${reviewResult.suggestedRules.length} BR goi y.` : '.'}
            {unresolvedSuggestionCount > 0 ? ` Con ${unresolvedSuggestionCount} goi y can chon.` : ''}
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-body-subtle">Dang tai Business Rules...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-body-subtle">
            Chua co Business Rule. Hay dung AI sinh tu static analysis hoac nhap rule thu cong de AI review.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const review = reviewByRuleId.get(rule.id);
              const suggestedDescription = rule.suggestedDescription?.trim()
                || review?.suggestedDescription?.trim();
              const showSuggestion = suggestedDescription && !dismissedSuggestionIds.has(rule.id);
              const editing = editingRuleId === rule.id;

              return (
                <article key={rule.id} className="rounded-default border border-border-default bg-neutral-secondary-soft p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-heading">{rule.ruleCode}</span>
                        <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                          {rule.source}
                        </span>
                        <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">
                          {rule.status}
                        </span>
                      </div>
                      {editing ? (
                        <textarea
                          className="form-input min-h-[86px] resize-y"
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed text-heading">{rule.description}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary px-3 py-2"
                            title="Luu"
                            aria-label="Luu"
                            disabled={pending || !editDescription.trim()}
                            onClick={() => handleSaveEdit(rule)}
                          >
                            {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary px-3 py-2"
                            title="Huy"
                            aria-label="Huy"
                            disabled={pending}
                            onClick={() => setEditingRuleId(null)}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary px-3 py-2"
                            title="Sua rule"
                            aria-label="Sua rule"
                            disabled={pending}
                            onClick={() => handleStartEdit(rule)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost-danger px-3 py-2"
                            title="Xoa rule"
                            aria-label="Xoa rule"
                            disabled={pending}
                            onClick={() => handleDelete(rule)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {rule.reviewNote && (
                    <p className="mt-2 text-xs leading-relaxed text-body-subtle">{rule.reviewNote}</p>
                  )}

                  {(review || showSuggestion) && (
                    <div className="mt-3 rounded-default border border-border-warning-subtle bg-warning-soft p-3 text-xs text-fg-warning">
                      {review && <p className="font-semibold">{review.verdict}: {review.reason}</p>}
                      {showSuggestion && (
                        <div className="mt-2 space-y-2">
                          <p className="leading-relaxed text-heading">{suggestedDescription}</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-secondary px-3 py-2 text-xs"
                              disabled={pending}
                              onClick={() => handleKeepMine(rule.id)}
                            >
                              <Check size={13} />
                              Giu cua toi
                            </button>
                            <button
                              type="button"
                              className="btn btn-brand px-3 py-2 text-xs"
                              disabled={pending}
                              onClick={() => handleUseSuggestion(rule)}
                            >
                              <Sparkles size={13} />
                              Dung goi y AI
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>
    </section>
  );
}
