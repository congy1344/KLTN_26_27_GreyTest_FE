import { apiClient } from '../../../shared/api/api-client';
import type { BusinessRule, BusinessRuleReview } from '../types';

export async function fetchBusinessRules(projectId: number): Promise<BusinessRule[]> {
  const { data } = await apiClient.get<BusinessRule[]>(`/projects/${projectId}/business-rules`);
  return data;
}

export async function createBusinessRule(
  projectId: number,
  methodId: number,
  description: string,
  sourceBranchId: string | null,
): Promise<BusinessRule> {
  const { data } = await apiClient.post<BusinessRule>(`/projects/${projectId}/business-rules`, { methodId, description, sourceBranchId });
  return data;
}

export async function updateBusinessRule(rule: BusinessRule, description: string): Promise<BusinessRule> {
  const { data } = await apiClient.put<BusinessRule>(`/business-rules/${rule.id}`, {
    methodId: rule.methodId,
    description,
  });
  return data;
}

export async function acceptBusinessRuleSuggestion(ruleId: number): Promise<BusinessRule> {
  const { data } = await apiClient.post<BusinessRule>(`/business-rules/${ruleId}/accept-suggestion`);
  return data;
}

export async function deleteBusinessRule(ruleId: number): Promise<void> {
  await apiClient.delete(`/business-rules/${ruleId}`);
}

export async function generateBusinessRules(projectId: number): Promise<BusinessRule[]> {
  const { data } = await apiClient.post<BusinessRule[]>(`/projects/${projectId}/business-rules/generate`);
  return data;
}

export async function reviewBusinessRules(projectId: number): Promise<BusinessRuleReview> {
  const { data } = await apiClient.post<BusinessRuleReview>(`/projects/${projectId}/business-rules/review`);
  return data;
}

export async function approveBusinessRules(projectId: number): Promise<BusinessRule[]> {
  const { data } = await apiClient.post<BusinessRule[]>(`/projects/${projectId}/business-rules/approve`);
  return data;
}
