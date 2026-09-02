import { apiClient } from '../../../shared/api/api-client';
import { serviceParams } from '../../projects/utils/project-service';
import type { CreateTestPlanInput, TestPlan } from '../types';
import type { GenerationJobAccepted } from '../../../shared/types/generation-progress';

export async function fetchTestPlans(projectId: number, servicePath?: string): Promise<TestPlan[]> {
  const { data } = await apiClient.get<TestPlan[]>(`/projects/${projectId}/test-plans`, { params: serviceParams(servicePath) });
  return data;
}

export async function createTestPlan(projectId: number, input: CreateTestPlanInput, servicePath?: string): Promise<TestPlan> {
  const { data } = await apiClient.post<TestPlan>(`/projects/${projectId}/test-plans`, input, { params: serviceParams(servicePath) });
  return data;
}

export async function generateTestPlans(projectId: number, servicePath?: string): Promise<GenerationJobAccepted> {
  const { data } = await apiClient.post<GenerationJobAccepted>(`/projects/${projectId}/test-plans/generate`, undefined, { params: serviceParams(servicePath) });
  return data;
}

export async function approveTestPlans(projectId: number, servicePath?: string): Promise<TestPlan[]> {
  const { data } = await apiClient.post<TestPlan[]>(`/projects/${projectId}/test-plans/approve`, undefined, { params: serviceParams(servicePath) });
  return data;
}

export async function updateTestPlan(planId: number, input: CreateTestPlanInput): Promise<TestPlan> {
  const { data } = await apiClient.put<TestPlan>(`/test-plans/${planId}`, input);
  return data;
}

export async function deleteTestPlan(planId: number): Promise<void> {
  await apiClient.delete(`/test-plans/${planId}`);
}
