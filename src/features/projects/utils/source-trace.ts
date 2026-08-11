import type { BusinessRule } from '../../business-rules/types';
import type { AnalysisResult, SourceBranchInfo } from '../types';

export function sourceDecisionId(branchId: string | null | undefined) {
  if (!branchId) return null;
  const outcomeSeparator = branchId.indexOf('::');
  return outcomeSeparator < 0
    ? branchId.replace(/-(TRUE|FALSE)$/, '')
    : branchId.slice(0, outcomeSeparator);
}

export interface SourceTraceBranch extends Omit<SourceBranchInfo, 'outcome'> {
  outcome: SourceBranchInfo['outcome'] | null;
}

export interface SourceTrace {
  filePath: string;
  className: string;
  qualifiedName: string;
  methodName: string;
  lineStart: number;
  lineEnd: number;
  branch: SourceTraceBranch | null;
}

export function buildRuleSourceIndex(
  analysis: AnalysisResult | undefined,
  rules: BusinessRule[],
): Map<number, SourceTrace> {
  const methodIndex = new Map<number, Omit<SourceTrace, 'branch'> & { branches: SourceBranchInfo[] }>();
  (analysis?.classes ?? []).forEach((javaClass) => {
    javaClass.methods.forEach((method) => {
      methodIndex.set(method.id, {
        filePath: javaClass.filePath,
        className: javaClass.className,
        qualifiedName: javaClass.qualifiedName,
        methodName: method.methodName,
        lineStart: method.lineStart,
        lineEnd: method.lineEnd,
        branches: method.branches ?? [],
      });
    });
  });
  return new Map(rules.flatMap((rule) => {
    if (rule.methodId == null) return [];
    const source = methodIndex.get(rule.methodId);
    if (!source) return [];
    const { branches, ...method } = source;
    return [[rule.id, {
      ...method,
      branch: branches.find((branch) => branch.branchId === rule.sourceBranchId)
        ?? (() => {
          if (!rule.sourceBranchId) return null;
          const decisionBranch = branches.find((branch) =>
            sourceDecisionId(branch.branchId) === sourceDecisionId(rule.sourceBranchId));
          return decisionBranch
            ? { ...decisionBranch, branchId: rule.sourceBranchId, outcome: null }
            : null;
        })(),
    }] as const];
  }));
}
