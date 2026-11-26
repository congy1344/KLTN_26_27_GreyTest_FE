import { SelectMenu } from '../../../shared/components/SelectMenu';
import { IconButton } from '../../../shared/components/IconButton';
import { Tag } from '../../../shared/components/Tag';
import { ErrorState } from '../../../shared/components/ErrorState';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  FileCode2,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Play,
  Save,
  CheckCheck,
  Trash2,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ManualEntrySection } from '../../../shared/components/ManualEntrySection';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { useTraceability } from '../../traceability/hooks/useTraceability';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { formatSemanticLabel, SemanticBadge } from '../../../shared/components/SemanticBadge';
import { AiGenerationProgress } from '../../../shared/components/AiGenerationProgress';
import { useAnalysis } from '../../projects/hooks/useProjects';
import type { ProjectStatus, SourceBranchInfo } from '../../projects/types';
import { buildRuleSourceIndex, sourceDecisionId } from '../../projects/utils/source-trace';
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
import { cleanAiText, formatBusinessRuleReviewNote, splitBusinessRuleText } from '../utils/business-rule-text';
import { useLanguage } from '../../../shared/i18n/language';
import { CodeBlock } from '../../../shared/components/CodeBlock';
import { displaySourcePath } from '../../../shared/utils/source-path';
import { useGenerationProgress } from '../../../shared/hooks/useGenerationProgress';
import { belongsToService, projectWorkflowPath } from '../../projects/utils/project-service';
import { useSourceUpdateImpact } from '../../projects/hooks/useSourceUpdateImpact';
import { diffRowClass } from '../../projects/diffHighlight';
import { SourceUpdateDeletionHistory } from '../../projects/components/SourceUpdateDeletionHistory';
import { DeletedItemCard, DeletedItemsSection, DeletedTag } from '../../../shared/components/DeletedItems';

interface BusinessRulesPanelProps {
  projectId: number;
  servicePath?: string;
  methodDiffMap?: Record<string, 'ADDED' | 'MODIFIED' | 'DELETED'>;
  affectedRuleIds?: Set<number>;
  projectStatus?: ProjectStatus;
}


function sourceDecisions(branches: SourceBranchInfo[]) {
  const seen = new Set<string>();
  return branches.filter((branch) => branch.kind !== 'STATEMENT').flatMap((branch) => {
    const decisionId = sourceDecisionId(branch.branchId);
    if (!decisionId || seen.has(decisionId)) return [];
    seen.add(decisionId);
    return [{ ...branch, decisionId }];
  });
}

export function BusinessRulesPanel({ projectId, servicePath, methodDiffMap, affectedRuleIds, projectStatus }: BusinessRulesPanelProps) {
  const navigate = useNavigate();
  const isPastRules = Boolean(projectStatus && ['BR_APPROVED', 'PLAN_PENDING_REVIEW', 'PLAN_APPROVED', 'CASE_PENDING_REVIEW', 'CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED', 'COMPLETED'].includes(projectStatus));
  const { t, language } = useLanguage();
  const { data: rules = [], isLoading, isFetching, error } = useBusinessRules(projectId, servicePath);
  const analysisQuery = useAnalysis(projectId);
  const { data: analysis } = analysisQuery;
  const impactData = useSourceUpdateImpact(projectId, 'BUSINESS_RULE', servicePath,
    !isLoading && !isFetching && !error && rules.length > 0
      && !analysisQuery.isLoading && !analysisQuery.isFetching && !analysisQuery.error && Boolean(analysis), rules.length);
  const effectiveMethodDiffMap = impactData.changesSeen ? {} : methodDiffMap ?? impactData.methodDiffMap;
  const effectiveAffectedRuleIds = impactData.changesSeen ? new Set<number>() : affectedRuleIds ?? impactData.affectedRuleIds;
  const getMethodDiff = impactData.getMethodDiff;
  const deletedMethods = impactData.deletedMethods;
  const addedRuleIds = impactData.addedRuleIds;
  const modifiedRuleIds = impactData.modifiedRuleIds;
  const deletedRuleIds = impactData.deletedRuleIds;
  const [description, setDescription] = useState('');
  const [methodId, setMethodId] = useState('');
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [reviewResult, setReviewResult] = useState<BusinessRuleReview | null>(null);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<number>>(new Set());
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [changeToConfirm, setChangeToConfirm] = useState<{ rule: BusinessRule; change: () => void } | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<BusinessRule | null>(null);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const traceability = useTraceability(projectId, servicePath);
  const plansQuery = useTestPlans(projectId, servicePath);
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis, rules),
    [analysis, rules],
  );
  const serviceGroups = useMemo(() => {
    const rulesByMethod = new Map<number, BusinessRule[]>();
    rules.forEach((rule) => {
      if (rule.methodId == null) return;
      rulesByMethod.set(rule.methodId, [...(rulesByMethod.get(rule.methodId) ?? []), rule]);
    });
    return [...(analysis?.classes ?? [])]
      .filter((javaClass) => javaClass.classType === 'SERVICE' && belongsToService(javaClass.filePath, servicePath))
      .sort((left, right) => {
        const classHasDiff = (c: typeof left) => c.methods.some((m) => {
          const diff = getMethodDiff(c.qualifiedName, m.methodName, m.parameters)
            || effectiveMethodDiffMap[`${c.qualifiedName}#${m.methodName}`]
            || effectiveMethodDiffMap[m.methodName];
          return diff === 'ADDED' || diff === 'MODIFIED';
        });
        const leftHasDiff = classHasDiff(left);
        const rightHasDiff = classHasDiff(right);
        if (leftHasDiff !== rightHasDiff) return leftHasDiff ? -1 : 1;
        return left.filePath.localeCompare(right.filePath)
          || left.qualifiedName.localeCompare(right.qualifiedName);
      })
      .map((javaClass) => ({
        ...javaClass,
        methods: [...javaClass.methods]
          .sort((left, right) => {
            const leftDiff = getMethodDiff(javaClass.qualifiedName, left.methodName, left.parameters)
              || effectiveMethodDiffMap[`${javaClass.qualifiedName}#${left.methodName}`]
              || effectiveMethodDiffMap[left.methodName];
            const rightDiff = getMethodDiff(javaClass.qualifiedName, right.methodName, right.parameters)
              || effectiveMethodDiffMap[`${javaClass.qualifiedName}#${right.methodName}`]
              || effectiveMethodDiffMap[right.methodName];
            const isDiffPriority = (diff?: string) => diff === 'ADDED' ? 2 : diff === 'MODIFIED' ? 1 : 0;
            if (isDiffPriority(leftDiff) !== isDiffPriority(rightDiff)) {
              return isDiffPriority(rightDiff) - isDiffPriority(leftDiff);
            }
            return left.lineStart - right.lineStart || left.id - right.id;
          })
          .map((method) => {
            const methodRules = [...(rulesByMethod.get(method.id) ?? [])].sort((left, right) => {
              const leftAdded = addedRuleIds.has(left.id);
              const rightAdded = addedRuleIds.has(right.id);
              if (leftAdded !== rightAdded) return leftAdded ? -1 : 1;
              const leftMod = modifiedRuleIds.has(left.id) || effectiveAffectedRuleIds.has(left.id);
              const rightMod = modifiedRuleIds.has(right.id) || effectiveAffectedRuleIds.has(right.id);
              if (leftMod !== rightMod) return leftMod ? -1 : 1;
              return left.ruleCode.localeCompare(right.ruleCode, undefined, { numeric: true });
            });
            return { ...method, rules: methodRules };
          }),
      }));
  }, [analysis, rules, servicePath, sourceTraceByRule, addedRuleIds, modifiedRuleIds, effectiveAffectedRuleIds, effectiveMethodDiffMap, getMethodDiff]);
  const serviceMethods = useMemo(() => serviceGroups.flatMap((javaClass) =>
    javaClass.methods.map((method) => ({
      id: method.id,
      filePath: javaClass.filePath,
      className: javaClass.className,
      label: `${displaySourcePath(javaClass.filePath)} | ${javaClass.className}.${method.methodName} (L${method.lineStart})`,
    }))), [serviceGroups]);

  const selectedMethod = serviceGroups
    .flatMap((javaClass) => javaClass.methods)
    .find((method) => method.id === Number(methodId));
  const selectedBranches = selectedMethod?.branches ?? [];
  const selectedDecisions = sourceDecisions(selectedBranches);
  const knownMethodIds = useMemo(
    () => new Set(serviceMethods.map((method) => method.id)),
    [serviceMethods],
  );
  const orphanRules = useMemo(() => {
    return rules
      .filter((rule) => rule.methodId == null || !knownMethodIds.has(rule.methodId))
      .sort((left, right) => left.ruleCode.localeCompare(right.ruleCode, undefined, { numeric: true }));
  }, [rules, knownMethodIds]);
  const displayClasses = [...serviceGroups, ...(analysis?.classes ?? []).filter((javaClass) => !serviceGroups.some((service) => service.id === javaClass.id))];
  const ruleGroups = displayClasses.map((javaClass) => {
    const service = serviceGroups.find((candidate) => candidate.id === javaClass.id);
    return {
      ...javaClass,
      methods: javaClass.methods.map((method) => ({ ...method,
        rules: service?.methods.find((candidate) => candidate.id === method.id)?.rules ?? rules.filter((rule) => rule.methodId === method.id),
      })).filter((method) => method.rules.length > 0),
    };
  }).filter((javaClass) => javaClass.methods.length > 0);
  const mappedIds = new Set(ruleGroups.flatMap((javaClass) => javaClass.methods.map((method) => method.id)));
  const unmappedRules = orphanRules.filter((rule) => rule.methodId == null || !mappedIds.has(rule.methodId));
  const firstRule = ruleGroups.flatMap((javaClass) => javaClass.methods.flatMap((method) => method.rules))[0] ?? unmappedRules[0];
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) ?? firstRule;

  const uncoveredDecisionCount = serviceGroups.reduce((total, javaClass) => total
    + javaClass.methods.reduce((methodTotal, method) => {
      const covered = new Set(method.rules
        .map((rule) => sourceDecisionId(rule.sourceBranchId))
        .filter(Boolean));
      return methodTotal + sourceDecisions(method.branches ?? [])
        .filter((decision) => !covered.has(decision.decisionId)).length;
    }, 0), 0);
  // Cùng điều kiện với backend: method có quyết định thì phải đủ quyết định, không có thì cần ít nhất một rule.
  const uncoveredPlainMethodCount = serviceGroups.reduce((total, javaClass) => total
    + javaClass.methods.filter((method) => sourceDecisions(method.branches ?? []).length === 0 && method.rules.length === 0).length, 0);
  const createMutation = useCreateBusinessRules(projectId, servicePath);
  const generateMutation = useGenerateBusinessRules(projectId, servicePath);
  const generationProgress = useGenerationProgress(projectId, 'BUSINESS_RULE', generateMutation.isPending);
  const generationRunning = generationProgress.projectRunning
    ?? (generationProgress.data?.status === 'QUEUED' || generationProgress.data?.status === 'RUNNING');
  const reviewMutation = useReviewBusinessRules(projectId, servicePath);
  const approveMutation = useApproveBusinessRules(projectId, servicePath);
  const updateMutation = useUpdateBusinessRule(projectId);
  const acceptSuggestionMutation = useAcceptBusinessRuleSuggestion(projectId);
  const deleteMutation = useDeleteBusinessRule(projectId);
  const pending =
    createMutation.isPending ||
    (generateMutation.isPending || generationRunning) ||
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
  const invalidDecisionRuleCount = Boolean(sourceBranchId) && draftRules.length !== 1;
  const dirtyRuleCount = rules.filter((rule) => rule.isModified).length;
  const reviewByRuleId = useMemo(() => {
    return new Map(reviewResult?.reviewedRules.map((review) => [review.ruleId, review]) ?? []);
  }, [reviewResult]);
  const unresolvedSuggestionCount = rules.filter((rule) => {
    const review = reviewByRuleId.get(rule.id);
    return review?.verdict !== 'SOURCE_MISMATCH' && !rule.reviewNote?.startsWith('SOURCE_MISMATCH:')
      && (rule.suggestedDescription?.trim() || review?.suggestedDescription?.trim())
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

  const handleGenerate = (resume = true) => {
    generateMutation.mutate(resume, {
      onSuccess: (accepted) => {
        setGenerationMessage(accepted.message);
      },
    });
  };

  const handleStartEdit = (rule: BusinessRule) => {
    setEditingRuleId(rule.id);
    setEditDescription(cleanAiText(rule.description));
  };

  const plansCovering = (rule: BusinessRule) => (plansQuery.data ?? []).filter((plan) =>
    plan.businessRuleId === rule.id || plan.coveredRuleIds?.includes(rule.id));

  // Đổi nội dung BR sẽ xóa Plan phủ nó cùng Case và Unit Test liên quan, nên hỏi trước khi làm.
  const runAfterConfirm = (rule: BusinessRule, change: () => void) => {
    if (plansCovering(rule).length > 0) setChangeToConfirm({ rule, change });
    else change();
  };

  const handleSaveEdit = (rule: BusinessRule) => {
    if (!editDescription.trim()) return;
    if (editDescription.trim() === cleanAiText(rule.description).trim()) {
      setEditingRuleId(null);
      setEditDescription('');
      return;
    }
    runAfterConfirm(rule, () => updateMutation.mutate(
      { rule, description: editDescription },
      {
        onSuccess: () => {
          setEditingRuleId(null);
          setEditDescription('');
          setDismissedSuggestionIds((current) => new Set(current).add(rule.id));
        },
      },
    ));
  };

  const handleDelete = (rule: BusinessRule) => {
    setRuleToDelete(rule);
  };

  const handleUseSuggestion = (rule: BusinessRule) => {
    runAfterConfirm(rule, () => acceptSuggestionMutation.mutate(
      rule.id,
      {
        onSuccess: () => {
          setDismissedSuggestionIds((current) => new Set(current).add(rule.id));
        },
      },
    ));
  };

  const handleKeepMine = (ruleId: number) => {
    setDismissedSuggestionIds((current) => new Set(current).add(ruleId));
  };

  const renderRule = (rule: BusinessRule, detail = false) => {
    const review = reviewByRuleId.get(rule.id);
    const sourceMismatch = review?.verdict === 'SOURCE_MISMATCH'
      || rule.reviewNote?.startsWith('SOURCE_MISMATCH:');
    const reviewNote = formatBusinessRuleReviewNote(
      review ? `${review.verdict}: ${review.reason}` : rule.reviewNote,
      language,
    );
    const suggestedDescription = rule.suggestedDescription?.trim()
      || review?.suggestedDescription?.trim();
    const showSuggestion = !sourceMismatch && suggestedDescription && !dismissedSuggestionIds.has(rule.id);
    const editing = editingRuleId === rule.id;
    const sourceTrace = sourceTraceByRule.get(rule.id);
    const sourceLineStart = sourceTrace?.branch?.lineStart ?? sourceTrace?.lineStart;
    const sourceLineEnd = sourceTrace?.branch?.lineEnd ?? sourceTrace?.lineEnd;

    const method = (analysis?.classes ?? []).flatMap((c) => c.methods).find((m) => m.id === rule.methodId);
    const javaClass = (analysis?.classes ?? []).find((c) => c.methods.some((m) => m.id === rule.methodId));
    const diffType = method
      ? (getMethodDiff(javaClass?.qualifiedName, method.methodName, method.parameters)
         || effectiveMethodDiffMap[`${javaClass?.qualifiedName}#${method.methodName}`]
         || effectiveMethodDiffMap[method.methodName])
      : undefined;
    const isAdded = !impactData.changesSeen && (addedRuleIds.has(rule.id) || diffType === 'ADDED');
    const isDeleted = deletedRuleIds.has(rule.id) || diffType === 'DELETED';
    const sourceChanged = !impactData.changesSeen && (modifiedRuleIds.has(rule.id) || effectiveAffectedRuleIds.has(rule.id) || diffType === 'MODIFIED');
    const isModified = !impactData.changesSeen && !isAdded && !isDeleted && (
      sourceChanged || (!isPastRules && rule.isModified)
    );

    const rows = [...(traceability.data?.rows ?? []), ...(traceability.data?.uncoveredRules ?? [])].filter((row) => row.ruleId === rule.id);
    const plans = [...new Map(rows.filter((row) => row.planId != null && row.planCode).map((row) => [row.planId, row])).values()];
    const cases = [...new Map(rows.filter((row) => row.caseId != null && row.caseCode).map((row) => [row.caseId, row])).values()];
    const tests = [...new Map(rows.filter((row) => row.unitTestId != null).map((row) => [row.unitTestId, row])).values()];
    const badges = (<span className="flex flex-wrap items-center gap-2">
              <Tag>
                {formatSemanticLabel(rule.source, language)}
              </Tag>
              <SemanticBadge kind="review-status" value={rule.status} />
              {isAdded && (
                <Tag>
                  {t('+ Mới thêm', '+ Added')}
                </Tag>
              )}
              {isDeleted && (
                <DeletedTag />
              )}
              {isModified && (
                <Tag>
                  {sourceChanged
                    ? t('Code liên quan đã thay đổi', 'Related code changed')
                    : t('Đã chỉnh sửa', 'Edited')}
                </Tag>
              )}
            </span>);
    if (!detail) return (
      <button key={rule.id} type="button" onClick={() => setSelectedRuleId(rule.id)}
        className={`flex w-full items-start gap-3.5 border-t border-border-default px-4 py-3.5 text-left text-sm text-heading transition-colors ${selectedRule?.id === rule.id ? 'bg-brand-softer'
          : diffRowClass({ added: isAdded, modified: sourceChanged && !isAdded && !isDeleted, deleted: isDeleted }, 'bg-neutral-primary-soft hover:bg-neutral-secondary-soft')}`}
        style={selectedRule?.id === rule.id ? { boxShadow: 'inset 3px 0 0 var(--brand)' } : undefined}>
        <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-body">{rule.ruleCode}</span>
        <span className="min-w-0 flex-1">
          <span className="block leading-relaxed">{cleanAiText(rule.description)}</span>
          {traceability.data && <span className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-xs text-body-subtle">
            {plans.map((row) => <span key={row.planId} className="inline-flex items-center gap-1.5"><span>{row.planCode}</span><ArrowRight size={12} aria-hidden="true" /></span>)}
            {cases.map((row) => <span key={row.caseId} className="inline-flex items-center gap-1.5"><span>{row.caseCode}</span><ArrowRight size={12} aria-hidden="true" /></span>)}
            <Tag variant="status" tone={tests.length ? 'success' : 'warning'} icon={tests.length ? Check : Clock}>
              {tests.length ? t('Có Unit Test', 'Has Unit Test') : t('Chưa có Unit Test', 'No Unit Test yet')}
            </Tag>
          </span>}
          <span className="mt-2 block">{badges}</span>
        </span>
      </button>
    );
    const branch = method?.branches?.find((candidate) => candidate.branchId === rule.sourceBranchId);
    const chain = [
      { key: 'rule', code: rule.ruleCode, text: 'Business Rule' },
      ...plans.map((row) => ({ key: `plan-${row.planId}`, code: row.planCode, text: row.planTitle })),
      ...cases.map((row) => ({ key: `case-${row.caseId}`, code: row.caseCode, text: row.caseDescription })),
      ...tests.map((row) => ({ key: `unit-${row.unitTestId}`, code: row.unitTestName ?? 'Unit Test', text: t('Có Unit Test', 'Has Unit Test') })),
    ];
    return (
      <article key={rule.id} className="p-4">
        <div className="mb-4 border-b border-border-default pb-4">
          <p className="font-mono text-xs text-fg-brand-strong">{rule.ruleCode}</p>
          {method && javaClass && <p className="mt-1 break-all font-mono text-xs text-body-subtle">{javaClass.className}.{method.methodName}</p>}
          <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-heading">{cleanAiText(rule.description)}</h2>
        </div>
        <h3 className="mb-2 text-xs font-semibold text-body-subtle">{t('Chuỗi truy vết', 'Traceability chain')}</h3>
        <ol className="mb-4">
          {chain.map((item, index) => <li key={item.key} className="flex items-stretch gap-3">
            <span className="flex w-3 shrink-0 flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-control bg-brand" />
              {index < chain.length - 1 && <span className="w-px flex-1 bg-border-default-strong" />}
            </span>
            <span className="min-w-0 pb-3"><span className="break-all font-mono text-xs text-heading">{item.code}</span>
              {item.text && <span className="block text-sm text-body">{item.text}</span>}
            </span>
          </li>)}
        </ol>
        {method?.sourceCode && <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold text-body-subtle">{t('Mã nguồn liên quan', 'Related source code')}</h3>
          <CodeBlock code={method.sourceCode} startLine={method.lineStart}
            title={javaClass ? `${javaClass.className}.${method.methodName}` : method.methodName}
            meta={branch ? `${branch.branchId} L${branch.lineStart}-${branch.lineEnd}` : `L${method.lineStart}-${method.lineEnd}`}
            highlight={branch ? (line) => line >= branch.lineStart && line <= branch.lineEnd : undefined}
            scrollToHighlight={Boolean(branch)} bodyClassName="max-h-[520px]" />
        </div>}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">

            {editing ? (
              <textarea
                className="form-input min-h-[86px] resize-y"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            ) : (
              null
            )}
            {sourceLineStart != null && sourceLineEnd != null && (
              <p className="mt-2 font-mono text-xs font-semibold text-body-subtle">
                {t(`Dòng nguồn L${sourceLineStart}-${sourceLineEnd}`, `Source lines L${sourceLineStart}-${sourceLineEnd}`)}
              </p>
            )}
          </div>


        </div>

        {reviewNote && !review && (
          <p className="mt-2 text-xs leading-relaxed text-body-subtle">
            {reviewNote}
          </p>
        )}

        {(review || showSuggestion) && (
          <div className="mt-3 rounded-base border border-border-warning-subtle bg-warning-soft p-3 text-xs text-fg-warning">
            {review && reviewNote && <p className="font-semibold">{reviewNote}</p>}
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
                    className="btn btn-secondary px-3 py-2 text-xs"
                    disabled={pending}
                    onClick={() => handleUseSuggestion(rule)}
                  >
                    <CheckCheck size={13} />
                    {t('Dùng gợi ý AI', 'Use AI suggestion')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border-default pt-4">
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
                <IconButton icon={X} label={t('Hủy', 'Cancel')} title={t('Hủy', 'Cancel')} disabled={pending} onClick={() => setEditingRuleId(null)} />
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
      </article>
    );
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-heading font-display">Business Rules</h2>
          <p className="mt-1 text-xs text-body-subtle">
            {t('AI rà soát là bước tư vấn tùy chọn. Bạn có thể tự kiểm tra và duyệt trực tiếp.', 'AI review is optional advice. You can verify and approve directly.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {rules.length === 0 ? (
              <button className="btn btn-secondary" disabled={pending} onClick={() => handleGenerate(true)}>
                {generateMutation.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                {t('AI sinh BR', 'Generate BRs with AI')}
              </button>
            ) : (
              <>
                {/* Cùng điều kiện với backend: còn method chưa có BR hoặc đang sinh thì vẫn cho tiếp tục. */}
                {(uncoveredDecisionCount > 0 || uncoveredPlainMethodCount > 0
                  || generateMutation.isPending || generationRunning) && (
                  <button
                    className="btn btn-secondary"
                    disabled={pending}
                    onClick={() => handleGenerate(true)}
                    title={t(
                      uncoveredDecisionCount > 0
                        ? `Tiếp tục sinh Business Rule cho ${uncoveredDecisionCount} nhánh/quyết định còn thiếu`
                        : 'Tiếp tục sinh Business Rule từ tiến trình trước',
                      uncoveredDecisionCount > 0
                        ? `Continue generating Business Rules for ${uncoveredDecisionCount} remaining branches/decisions`
                        : 'Resume Business Rule generation from previous progress'
                    )}
                  >
                    {generateMutation.isPending || generationRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {t(
                      uncoveredDecisionCount > 0 ? `Tiếp tục sinh (${uncoveredDecisionCount} nhánh còn thiếu)` : 'Tiếp tục sinh',
                      uncoveredDecisionCount > 0 ? `Continue (${uncoveredDecisionCount} missing)` : 'Resume generation'
                    )}
                  </button>
                )}
                {!isPastRules && (
                  <button className="btn btn-secondary" disabled={pending} onClick={() => setRegenerateConfirmOpen(true)}>
                    {t('Sinh lại BR', 'Regenerate BRs')}
                  </button>
                )}
              </>
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
          <button className="btn btn-secondary" disabled={pending || dirtyRuleCount === 0} onClick={handleReview}>
            {reviewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            {t('AI rà soát thay đổi', 'AI review changes')}{dirtyRuleCount > 0 ? ` (${dirtyRuleCount})` : ''}
          </button>
          <button
            className="btn btn-brand"
            disabled={pending || rules.length === 0 || uncoveredDecisionCount > 0}
            onClick={() => approveMutation.mutate(undefined, {
              onSuccess: () => navigate(projectWorkflowPath(projectId, 'test-plans', servicePath), {
                state: { workflowNotice: t('Đã duyệt Business Rule. Chuyển sang bước Test Plan.', 'Business Rules approved. Continue with Test Plans.') },
              }),
            })}
            title={uncoveredDecisionCount > 0
              ? t(`Còn ${uncoveredDecisionCount} quyết định source chưa có BR`, `${uncoveredDecisionCount} source decisions are not mapped to BRs`)
              : undefined}
          >
            {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {t('Duyệt tất cả', 'Approve all')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {generationMessage && (
          <div className="mb-4 rounded-base border border-border-brand-subtle bg-brand-softer p-3 text-xs font-medium text-fg-brand-strong">
            {generationMessage}
          </div>
        )}
        <ManualEntrySection title={t('Thêm Business Rule thủ công', 'Add a Business Rule manually')}>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-3">
            <SelectMenu
              value={methodId}
              onChange={(selectedValue) => {
                setMethodId(selectedValue);
                setSourceBranchId('');
              }}
              aria-label={t('Chọn Service method', 'Select a Service method')}
              searchable
              options={[{ value: "", label: String(t('Chọn Service method', 'Select a Service method')) }, ...serviceMethods.map((method) => (
                ({ value: String(method.id), label: String(method.label), title: method.filePath })
              ))]}
            />
            {selectedDecisions.length > 0 && (
              <SelectMenu
                value={sourceBranchId}
                onChange={(selectedValue) => setSourceBranchId(selectedValue)}
                aria-label={t('Chọn quyết định source', 'Select a source decision')}
                searchable
                options={[{ value: "", label: String(t('Chọn quyết định source', 'Select a source decision')) }, ...selectedDecisions.map((decision) => (
                  ({ value: decision.decisionId, label: String(decision.decisionId) + ": " + String(decision.kind.toLowerCase()) + " (" + String(decision.condition) + ")" })
                ))]}
              />
            )}
            <textarea
              className="form-input min-h-[112px] resize-y"
              placeholder={t('Mỗi REST endpoint phải có ít nhất một Test Case.\nNếu email đã tồn tại thì trả về HTTP 409.', 'Every REST endpoint must have at least one Test Case.\nReturn HTTP 409 when the email already exists.')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            {invalidDecisionRuleCount && (
              <p className="text-xs font-medium text-fg-warning">
                {t('M\u1ed7i quy\u1ebft \u0111\u1ecbnh source ch\u1ec9 \u0111\u01b0\u1ee3c li\u00ean k\u1ebft v\u1edbi m\u1ed9t Business Rule.', 'Each source decision can only be linked to one Business Rule.')}
              </p>
            )}
          </div>
          <button className="btn btn-secondary self-start" disabled={pending || !methodId || draftRules.length === 0
              || (selectedDecisions.length > 0 && !sourceBranchId) || invalidDecisionRuleCount}>
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquarePlus size={14} />}
            {draftRules.length > 1 ? t(`Thêm ${draftRules.length} BR`, `Add ${draftRules.length} BRs`) : t('Thêm BR', 'Add BR')}
          </button>
        </form>
        </ManualEntrySection>

        {mutationError && <InlineAlert tone="danger">{getErrorMessage(mutationError)}</InlineAlert>}

        {reviewResult && (
          <div className="mb-4 rounded-base border border-border-brand-subtle bg-brand-softer p-3 text-xs font-medium text-fg-brand-strong">
            {t(`AI đã rà soát ${reviewResult.reviewedRules.length} BR`, `AI reviewed ${reviewResult.reviewedRules.length} BRs`)}
            {unresolvedSuggestionCount > 0 ? ` Con ${unresolvedSuggestionCount} goi y can chon.` : ''}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4" role="status"><span className="sr-only">{t("Đang tải Business Rules...", "Loading Business Rules...")}</span>{[0, 1, 2].map((key) => <div key={key} className="animate-pulse rounded-base border border-border-default p-4"><div className="mb-4 h-4 w-1/3 bg-neutral-secondary-medium" /><div className="h-16 bg-neutral-secondary-soft" /></div>)}</div>
        ) : error ? (<ErrorState error={error} title={t('Không tải được Business Rule', 'Unable to load Business Rules')} />) : rules.length === 0 ? (
          <EmptyState
            icon={FileCode2}
            title={t('Chưa có Business Rule', 'No Business Rules yet')}
            hint={t('Dùng AI sinh từ static analysis hoặc nhập rule thủ công để AI rà soát.', 'Generate them from static analysis or add rules manually for AI review.')}
            minHeight="min-h-[180px]"
          />
        ) : (
          <div className={`grid items-start gap-5 ${selectedRule ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]' : ''}`}>
            <section aria-label={t('Danh sách Business Rule', 'Business Rule list')} className="min-w-0 space-y-4">
              {ruleGroups.map((javaClass) => <div key={javaClass.id}>
                <h3 className="mb-2 break-all font-mono text-xs font-semibold text-body" title={javaClass.filePath}>{javaClass.className}</h3>
                <div className="space-y-4">{javaClass.methods.map((method) => <div key={method.id} className="overflow-hidden rounded-base border border-border-default">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-secondary-soft px-4 py-2.5">
                    <p className="break-all font-mono text-xs font-medium text-heading">{javaClass.className}.<span className="text-fg-brand-strong">{method.methodName}</span></p>
                    <span className="font-mono text-xs text-body-subtle">{method.rules.length} {t('rule', 'rules')}</span>
                  </div>
                  {method.rules.map((rule) => renderRule(rule))}
                </div>)}</div>
              </div>)}
              {unmappedRules.length > 0 && <div className="overflow-hidden rounded-base border border-border-default">
                <h3 className="bg-neutral-secondary-soft px-4 py-2.5 text-xs font-semibold text-body">{t('Chưa gắn method', 'Unassigned method')}</h3>
                {unmappedRules.map((rule) => renderRule(rule))}
              </div>}
              {deletedMethods.length > 0 && <DeletedItemsSection title={t('Method đã xóa', 'Deleted methods')} count={deletedMethods.length}>
                {deletedMethods.map((method) => <DeletedItemCard key={method.methodKey} code={method.signature}
                  reason={method.reason || t('Phương thức này đã bị xóa trong phiên bản source code mới nhất.', 'This method was removed in the latest source code.')} />)}
              </DeletedItemsSection>}
              <SourceUpdateDeletionHistory update={impactData.activeUpdate} impact={impactData.impact} targetType="BUSINESS_RULE"
                currentIds={rules.map((rule) => rule.id)} servicePath={servicePath ?? undefined} />
            </section>
            {selectedRule && <aside aria-label="Chi tiết Business Rule" className="min-w-0 rounded-base border border-border-default bg-neutral-primary-soft lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              {renderRule(selectedRule, true)}
            </aside>}
          </div>

        )}
      </div>
      <ConfirmDialog
        open={regenerateConfirmOpen}
        title={t('Sinh lại Business Rule?', 'Regenerate Business Rules?')}
        description={t(
          'AI sẽ phân tích lại các method trong service đang chọn. BR do AI sinh chưa sửa có thể được cập nhật; BR đã thêm hoặc sửa thủ công được giữ nguyên. Thao tác này có thể tốn thêm quota.',
          'AI will reanalyze methods in the selected service. Untouched AI rules may be updated; manually added or edited rules are preserved. This may use additional quota.'
        )}
        confirmLabel={t('Xác nhận sinh lại', 'Confirm regeneration')}
        cancelLabel={t('Giữ BR hiện tại', 'Keep current BRs')}
        pending={generateMutation.isPending}
        onCancel={() => setRegenerateConfirmOpen(false)}
        onConfirm={() => { setRegenerateConfirmOpen(false); handleGenerate(false); }}
      />
      <ConfirmDialog
        open={changeToConfirm != null}
        title={t('Lưu thay đổi Business Rule?', 'Save the Business Rule change?')}
        description={changeToConfirm
          ? t(
              `${changeToConfirm.rule.ruleCode} đang có ${plansCovering(changeToConfirm.rule).length} Test Plan phủ. Các Test Plan này cùng Test Case và Unit Test của chúng sẽ bị xóa để sinh lại bằng "Tiếp tục sinh" ở từng bước. Các phần khác giữ nguyên.`,
              `${changeToConfirm.rule.ruleCode} is covered by ${plansCovering(changeToConfirm.rule).length} Test Plan(s). They and their Test Cases and Unit Tests will be deleted so "Continue" can regenerate them at each step. Everything else stays.`,
            )
          : ''}
        confirmLabel={t('Lưu và xóa phần liên quan', 'Save and delete related items')}
        cancelLabel={t('Tiếp tục sửa', 'Keep editing')}
        pending={updateMutation.isPending || acceptSuggestionMutation.isPending}
        onCancel={() => setChangeToConfirm(null)}
        onConfirm={() => { changeToConfirm?.change(); setChangeToConfirm(null); }}
      />
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
