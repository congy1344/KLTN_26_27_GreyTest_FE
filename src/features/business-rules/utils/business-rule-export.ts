import type { AnalysisResult } from '../../projects/types';
import type { BusinessRule } from '../types';

/** Xuất nội dung gốc và định danh phương thức để đối chiếu cùng phạm vi giữa các cách sinh. */
export function buildBusinessRuleExport(projectId: number, servicePath: string | undefined,
  rules: BusinessRule[], analysis: AnalysisResult) {
  const methods = new Map(analysis.classes.flatMap((javaClass) => javaClass.methods.map((method) => [method.id, {
    qualifiedClassName: javaClass.qualifiedName,
    filePath: javaClass.filePath,
    methodName: method.methodName,
    parameters: method.parameters,
    returnType: method.returnType,
  }] as const)));
  return {
    schemaVersion: 'greytest-business-rules-v1',
    exportedAt: new Date().toISOString(),
    projectId,
    projectName: analysis.projectName,
    servicePath: servicePath ?? null,
    rules: rules.map((rule) => ({ ...rule, method: methods.get(rule.methodId ?? -1) ?? null })),
  };
}

export function downloadBusinessRules(projectId: number, servicePath: string | undefined,
  rules: BusinessRule[], analysis: AnalysisResult) {
  const content = JSON.stringify(buildBusinessRuleExport(projectId, servicePath, rules, analysis), null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `greytest-project-${projectId}-business-rules.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
