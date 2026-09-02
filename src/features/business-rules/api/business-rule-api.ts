import { apiClient } from '../../../shared/api/api-client';
import { serviceParams } from '../../projects/utils/project-service';
import type { BusinessRule, BusinessRuleReview } from '../types';
import type { GenerationJobAccepted } from '../../../shared/types/generation-progress';

export async function fetchBusinessRules(projectId: number, servicePath?: string): Promise<BusinessRule[]> {
  const { data } = await apiClient.get<BusinessRule[]>(`/projects/${projectId}/business-rules`, { params: serviceParams(servicePath) });
  return data;
}

export async function createBusinessRule(
  projectId: number,
  methodId: number,
  description: string,
  sourceBranchId: string | null,
  servicePath?: string,
): Promise<BusinessRule> {
  const { data } = await apiClient.post<BusinessRule>(`/projects/${projectId}/business-rules`, { methodId, description, sourceBranchId }, { params: serviceParams(servicePath) });
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

export async function generateBusinessRules(projectId: number, servicePath?: string): Promise<GenerationJobAccepted> {
  const { data } = await apiClient.post<GenerationJobAccepted>(`/projects/${projectId}/business-rules/generate`, undefined, { params: serviceParams(servicePath) });
  return data;
}

export async function reviewBusinessRules(projectId: number, servicePath?: string): Promise<BusinessRuleReview> {
  const { data } = await apiClient.post<BusinessRuleReview>(`/projects/${projectId}/business-rules/review`, undefined, { params: serviceParams(servicePath) });
  return data;
}

export async function approveBusinessRules(projectId: number, servicePath?: string): Promise<BusinessRule[]> {
  const { data } = await apiClient.post<BusinessRule[]>(`/projects/${projectId}/business-rules/approve`, undefined, { params: serviceParams(servicePath) });
  return data;
}
