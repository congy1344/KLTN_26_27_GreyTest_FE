import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Check,
  CheckCircle2,
  FileCode2,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import { useAnalysis } from '../../projects/hooks/useProjects';
import { buildRuleSourceIndex } from '../../projects/utils/source-trace';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
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
import { useLanguage } from '../../../shared/i18n/language';

interface BusinessRulesPanelProps {
  projectId: number;
}

export function BusinessRulesPanel({ projectId }: BusinessRulesPanelProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [description, setDescription] = useState('');
  const [methodId, setMethodId] = useState('');
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [reviewResult, setReviewResult] = useState<BusinessRuleReview | null>(null);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<number>>(new Set());
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<BusinessRule | null>(null);

  const { data: rules = [], isLoading, error } = useBusinessRules(projectId);
  const { data: analysis } = useAnalysis(projectId);
  const plansQuery = useTestPlans(projectId);
  const serviceGroups = useMemo(() => {
    const rulesByMethod = new Map<number, BusinessRule[]>();
    rules.forEach((rule) => {
      if (rule.methodId == null) return;
      rulesByMethod.set(rule.methodId, [...(rulesByMethod.get(rule.methodId) ?? []), rule]);
    });
    return [...(analysis?.classes ?? [])]
      .filter((javaClass) => javaClass.classType === 'SERVICE')
      .sort((left, right) => left.filePath.localeCompare(right.filePath)
        || left.qualifiedName.localeCompare(right.qualifiedName))
      .map((javaClass) => ({
        ...javaClass,
        methods: [...javaClass.methods]
          .sort((left, right) => left.lineStart - right.lineStart || left.id - right.id)
          .map((method) => ({ ...method, rules: rulesByMethod.get(method.id) ?? [] })),
      }));
  }, [analysis, rules]);
  const fileGroups = useMemo(() => {
    const groups = new Map<string, { filePath: string; services: typeof serviceGroups }>();
    serviceGroups.forEach((service) => {
      const group = groups.get(service.filePath) ?? { filePath: service.filePath, services: [] };
      group.services.push(service);
      groups.set(service.filePath, group);
    });
    return [...groups.values()];
  }, [serviceGroups]);
  const serviceMethods = useMemo(() => serviceGroups.flatMap((javaClass) =>
    javaClass.methods.map((method) => ({
      id: method.id,
      label: `${javaClass.filePath} | ${javaClass.className}.${method.methodName} (L${method.lineStart})`,
    }))), [serviceGroups]);
  const selectedMethod = serviceGroups
    .flatMap((javaClass) => javaClass.methods)
    .find((method) => method.id === Number(methodId));
  const selectedBranches = selectedMethod?.branches ?? [];
  const knownMethodIds = useMemo(
    () => new Set(serviceMethods.map((method) => method.id)),
    [serviceMethods],
  );
  const orphanRules = rules.filter((rule) => rule.methodId == null || !knownMethodIds.has(rule.methodId));
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis, rules),
    [analysis, rules],
  );
  const uncoveredBranchCount = serviceGroups.reduce((total, javaClass) => total
    + javaClass.methods.reduce((methodTotal, method) => {
      const covered = new Set(method.rules.map((rule) => rule.sourceBranchId).filter(Boolean));
      return methodTotal + (method.branches ?? []).filter((branch) => !covered.has(branch.branchId)).length;
    }, 0), 0);
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
    createMutation.mutate({
      methodId: Number(methodId),
      descriptions: draftRules,
      sourceBranchId: sourceBranchId || null,
    }, {
      onSuccess: () => setDescription(''),
    });
  };

  const handleReview = () => {
    reviewMutation.mutate(undefined, {
      onSuccess: (result) => {
        setReviewResult(result);
        setDismissedSuggestionIds(new Set());
      },
    });
  };

  const handleGenerate = () => {
    generateMutation.mutate(undefined, {
      onSuccess: (generated) => {
        setGenerationMessage(generated.length === 0
          ? t('Không phát hiện Business Rule mới từ source. Các method chưa có BR vẫn được hiển thị để kiểm tra.', 'No new Business Rules were evidenced by the source. Methods without BRs remain visible for review.')
          : t(`AI đã sinh ${generated.length} Business Rule mới.`, `AI generated ${generated.length} new Business Rules.`));
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
    setRuleToDelete(rule);
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

  const renderRule = (rule: BusinessRule) => {
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
            <div className="mt-2">
              <SourceTrace value={sourceTraceByRule.get(rule.id)} compact />
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary px-3 py-2"
                  title={t('Lưu', 'Save')}
                  aria-label={t('Lưu', 'Save')}
                  disabled={pending || !editDescription.trim()}
                  onClick={() => handleSaveEdit(rule)}
                >
                  {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary px-3 py-2"
                  title={t('Hủy', 'Cancel')}
                  aria-label={t('Hủy', 'Cancel')}
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
                  title={t('Sửa rule', 'Edit rule')}
                  aria-label={t('Sửa rule', 'Edit rule')}
                  disabled={pending}
                  onClick={() => handleStartEdit(rule)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="btn-ghost-danger px-3 py-2"
                  title={t('Xóa rule', 'Delete rule')}
                  aria-label={t('Xóa rule', 'Delete rule')}
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
                    {t('Giữ của tôi', 'Keep mine')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-brand px-3 py-2 text-xs"
                    disabled={pending}
                    onClick={() => handleUseSuggestion(rule)}
                  >
                    <Sparkles size={13} />
                    {t('Dùng gợi ý AI', 'Use AI suggestion')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Business Rules</h3>
          <p className="mt-1 text-xs text-body-subtle">
            {t('AI review là bước tư vấn tùy chọn. Bạn có thể tự kiểm tra và approve trực tiếp.', 'AI review is optional advice. You can verify and approve directly.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" disabled={pending} onClick={handleGenerate}>
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
            {t('AI sinh BR', 'Generate BRs with AI')}
          </button>
          <button className="btn btn-secondary" disabled={pending || dirtyRuleCount === 0} onClick={handleReview}>
            {reviewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {t('AI review thay đổi', 'AI review changes')}{dirtyRuleCount > 0 ? ` (${dirtyRuleCount})` : ''}
          </button>
          <button
            className="btn btn-brand"
            disabled={pending || rules.length === 0 || uncoveredBranchCount > 0}
            onClick={() => approveMutation.mutate(undefined, {
              onSuccess: () => navigate(`/projects/${projectId}/test-plans`, {
                state: { workflowNotice: t('Đã duyệt Business Rule. Chuyển sang bước Test Plan.', 'Business Rules approved. Continue with Test Plans.') },
              }),
            })}
            title={uncoveredBranchCount > 0
              ? t(`Còn ${uncoveredBranchCount} nhánh source chưa có BR`, `${uncoveredBranchCount} source branches are not mapped to BRs`)
              : undefined}
          >
            {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {t('Approve tất cả', 'Approve all')}
          </button>
        </div>
      </div>

      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        {generationMessage && (
          <div className="mb-4 rounded-default border border-border-brand-subtle bg-brand-softer p-3 text-xs font-medium text-fg-brand-strong">
            {generationMessage}
          </div>
        )}
        <form onSubmit={handleCreate} className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <select
              className="form-input"
              value={methodId}
              onChange={(event) => {
                setMethodId(event.target.value);
                setSourceBranchId('');
              }}
            >
              <option value="">{t('Chọn Service method', 'Select a Service method')}</option>
              {serviceMethods.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
            </select>
            {selectedBranches.length > 0 && (
              <select
                className="form-input"
                value={sourceBranchId}
                onChange={(event) => setSourceBranchId(event.target.value)}
              >
                <option value="">{t('Chọn nhánh source', 'Select a source branch')}</option>
                {selectedBranches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.branchId}: if ({branch.condition}) = {branch.outcome}
                  </option>
                ))}
              </select>
            )}
            <textarea
              className="form-input min-h-[112px] resize-y"
              placeholder={t('Mỗi REST endpoint phải có ít nhất một Test Case.\nNếu email đã tồn tại thì trả về HTTP 409.', 'Every REST endpoint must have at least one Test Case.\nReturn HTTP 409 when the email already exists.')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <button className="btn btn-secondary self-start" disabled={pending || !methodId || draftRules.length === 0
              || (selectedBranches.length > 0 && !sourceBranchId)}>
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquarePlus size={14} />}
            {draftRules.length > 1 ? t(`Thêm ${draftRules.length} BR`, `Add ${draftRules.length} BRs`) : t('Thêm BR', 'Add BR')}
          </button>
        </form>

        {mutationError && <InlineAlert tone="danger">{getErrorMessage(mutationError)}</InlineAlert>}
        {error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}

        {reviewResult && (
          <div className="mb-4 rounded-default border border-border-brand-subtle bg-brand-softer p-3 text-xs font-medium text-fg-brand-strong">
            {t(`AI đã review ${reviewResult.reviewedRules.length} BR`, `AI reviewed ${reviewResult.reviewedRules.length} BRs`)}
            {unresolvedSuggestionCount > 0 ? ` Con ${unresolvedSuggestionCount} goi y can chon.` : ''}
          </div>
        )}

        {isLoading ? (
          <LoadingState label={t('Đang tải Business Rules...', 'Loading Business Rules...')} minHeight="min-h-[140px]" />
        ) : serviceGroups.length === 0 && rules.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t('Chưa có Business Rule', 'No Business Rules yet')}
            hint={t('Dùng AI sinh từ static analysis hoặc nhập rule thủ công để AI review.', 'Generate them from static analysis or add rules manually for AI review.')}
            minHeight="min-h-[180px]"
          />
        ) : (
          <div className="space-y-4">
            {fileGroups.map((fileGroup) => (
              <details
                key={fileGroup.filePath}
                open
                className="overflow-hidden rounded-default border border-border-default bg-neutral-primary"
              >
                <summary className="cursor-pointer px-4 py-3 marker:text-fg-brand-strong">
                  <div className="ml-2 inline-flex min-w-0 max-w-[calc(100%-1rem)] items-start gap-3 align-top">
                    <FileCode2 size={16} className="mt-0.5 shrink-0 text-fg-brand-strong" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-fg-brand-strong">File</span>
                      <p className="break-all font-mono text-xs font-semibold text-heading">{fileGroup.filePath}</p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                      {fileGroup.services.reduce((total, service) =>
                        total + service.methods.reduce((serviceTotal, method) => serviceTotal + method.rules.length, 0), 0)} BR
                    </span>
                  </div>
                </summary>

                <div className="border-t border-border-default px-3 py-3 sm:px-4">
                  {fileGroup.services.map((javaClass) => (
                  <details key={javaClass.id} open>
                    <summary className="cursor-pointer py-2 marker:text-body-subtle">
                      <div className="ml-2 inline-flex min-w-0 max-w-[calc(100%-1rem)] items-start gap-3 align-top">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-brand-softer font-mono text-[10px] font-bold text-fg-brand-strong">
                          S
                        </span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold text-body-subtle">Service</span>
                          <h4 className="text-sm font-semibold text-heading">{javaClass.className}</h4>
                          <p className="break-all text-xs text-body-subtle">{javaClass.qualifiedName}</p>
                        </div>
                      </div>
                    </summary>

                    <div className="ml-3 border-l border-border-default pl-3 sm:ml-5 sm:pl-5">
                      {javaClass.methods.map((method) => (
                        <details key={method.id} open className="border-b border-border-default last:border-b-0">
                          <summary className="cursor-pointer py-3 marker:text-body-subtle">
                            <div className="ml-2 inline-flex min-w-0 max-w-[calc(100%-1rem)] items-start gap-3 align-top">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-neutral-secondary-medium font-mono text-[10px] font-bold text-body-subtle">
                                M
                              </span>
                              <div className="min-w-0">
                                <span className="text-[10px] font-semibold text-body-subtle">Method</span>
                                <p className="break-words font-mono text-xs font-semibold text-heading">
                                  {method.methodName}({method.parameters.map((parameter) => `${parameter.type} ${parameter.name}`).join(', ')})
                                </p>
                                <p className="mt-1 text-[11px] text-body-subtle">
                                  {method.returnType} | Lines {method.lineStart}-{method.lineEnd}
                                </p>
                              </div>
                              <span className="ml-auto shrink-0 rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
                                {t(`${method.rules.length} BR`, `${method.rules.length} BR${method.rules.length === 1 ? '' : 's'}`)}
                              </span>
                            </div>
                          </summary>

                          <div className="ml-3 border-l border-border-brand-subtle pb-4 pl-3 sm:ml-5 sm:pl-5">
                            {(method.branches ?? []).length > 0 && (
                              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-heading">
                                  {t('Bao phủ nhánh source', 'Source branch coverage')}:
                                  {' '}
                                  {new Set(method.rules.map((rule) => rule.sourceBranchId).filter(Boolean)).size}/{method.branches!.length}
                                </span>
                                {method.branches!.map((branch) => {
                                  const covered = method.rules.some((rule) => rule.sourceBranchId === branch.branchId);
                                  return (
                                    <span
                                      key={branch.branchId}
                                      title={`if (${branch.condition})`}
                                      className={`font-mono text-[11px] font-semibold ${covered ? 'text-fg-success-strong' : 'text-fg-warning'}`}
                                    >
                                      {branch.branchId} {covered ? '✓' : t('thiếu', 'missing')}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {method.rules.length === 0 ? (
                              <div className="rounded-default border border-dashed border-border-default px-3 py-3 text-xs text-body-subtle">
                                {t('Chưa phát hiện Business Rule có đủ căn cứ từ source của method này.', 'No Business Rule has enough direct evidence in this method source yet.')}
                              </div>
                            ) : (
                              <div className="space-y-2">{method.rules.map(renderRule)}</div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                  ))}
                </div>
              </details>
            ))}
            {orphanRules.length > 0 && (
              <section className="rounded-default border border-border-warning-subtle bg-warning-soft p-3">
                <h4 className="text-xs font-semibold text-fg-warning">
                  {t('BR chưa liên kết được với Service method', 'BRs not linked to a Service method')}
                </h4>
                <div className="mt-2 space-y-2">{orphanRules.map(renderRule)}</div>
              </section>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={ruleToDelete != null}
        title={t('Xóa Business Rule?', 'Delete Business Rule?')}
        description={ruleToDelete
          ? (() => {
              const anchoredPlans = (plansQuery.data ?? [])
                .filter((plan) => plan.businessRuleId === ruleToDelete.id).length;
              return anchoredPlans > 0
                ? t(
                    `${ruleToDelete.ruleCode} đang liên kết với ${anchoredPlans} Test Plan. Các Test Case và Unit Test liên quan cũng sẽ bị xóa.`,
                    `${ruleToDelete.ruleCode} is linked to ${anchoredPlans} Test Plan(s). Related Test Cases and Unit Tests will also be deleted.`,
                  )
                : t(`${ruleToDelete.ruleCode} sẽ bị xóa khỏi project.`, `${ruleToDelete.ruleCode} will be removed from the project.`);
            })()
          : ''}
        confirmLabel={t('Xóa rule', 'Delete rule')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={deleteMutation.isPending}
        onCancel={() => setRuleToDelete(null)}
        onConfirm={() => {
          if (!ruleToDelete) return;
          const ruleId = ruleToDelete.id;
          setRuleToDelete(null);
          deleteMutation.mutate(ruleId);
        }}
      />
    </section>
  );
}
