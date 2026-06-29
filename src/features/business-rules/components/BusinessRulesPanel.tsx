import { FormEvent, useState } from 'react';
import { Bot, CheckCircle2, Loader2, MessageSquarePlus, Sparkles } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import {
  useApproveBusinessRules,
  useBusinessRules,
  useCreateBusinessRule,
  useGenerateBusinessRules,
  useReviewBusinessRules,
} from '../hooks/useBusinessRules';

interface BusinessRulesPanelProps {
  projectId: number;
}

export function BusinessRulesPanel({ projectId }: BusinessRulesPanelProps) {
  const [description, setDescription] = useState('');
  const { data: rules = [], isLoading, error } = useBusinessRules(projectId);
  const createMutation = useCreateBusinessRule(projectId);
  const generateMutation = useGenerateBusinessRules(projectId);
  const reviewMutation = useReviewBusinessRules(projectId);
  const approveMutation = useApproveBusinessRules(projectId);
  const pending = createMutation.isPending || generateMutation.isPending || reviewMutation.isPending || approveMutation.isPending;
  const mutationError = createMutation.error ?? generateMutation.error ?? reviewMutation.error ?? approveMutation.error;

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim()) return;
    createMutation.mutate(description, {
      onSuccess: () => setDescription(''),
    });
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Business Rules</h3>
          <p className="mt-1 text-xs text-body-subtle">
            Chon AI auto sinh BR hoac nhap BR thu cong roi cho AI review va goi y bo sung.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" disabled={pending} onClick={() => generateMutation.mutate()}>
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            AI sinh BR
          </button>
          <button className="btn btn-secondary" disabled={pending} onClick={() => reviewMutation.mutate()}>
            {reviewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI review
          </button>
          <button className="btn btn-brand" disabled={pending || rules.length === 0} onClick={() => approveMutation.mutate()}>
            {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve
          </button>
        </div>
      </div>

      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        <form onSubmit={handleCreate} className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <textarea
            className="form-input min-h-[92px] resize-y"
            placeholder="Nhap business rule hien co cua ban..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <button className="btn btn-secondary self-start" disabled={pending || !description.trim()}>
            <MessageSquarePlus size={14} />
            Them BR
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
          <p className="text-sm text-body-subtle">Dang tai Business Rules...</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-body-subtle">
            Chua co Business Rule. Hay dung AI sinh tu static analysis hoac nhap rule thu cong de AI review.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <article key={rule.id} className="rounded-default border border-border-default bg-neutral-secondary-soft p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-heading">{rule.ruleCode}</span>
                  <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                    {rule.source}
                  </span>
                  <span className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">
                    {rule.status}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-heading">{rule.description}</p>
                {rule.reviewNote && (
                  <p className="mt-2 text-xs leading-relaxed text-body-subtle">{rule.reviewNote}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
