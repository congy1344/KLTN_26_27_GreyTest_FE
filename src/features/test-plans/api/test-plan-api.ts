import { apiClient } from '../../../shared/api/api-client';
import type { CreateTestPlanInput, TestPlan } from '../types';

export async function fetchTestPlans(projectId: number): Promise<TestPlan[]> {
  const { data } = await apiClient.get<TestPlan[]>(`/projects/${projectId}/test-plans`);
  return data;
}

export async function createTestPlan(projectId: number, input: CreateTestPlanInput): Promise<TestPlan> {
  const { data } = await apiClient.post<TestPlan>(`/projects/${projectId}/test-plans`, input);
  return data;
}

export async function generateTestPlans(projectId: number): Promise<TestPlan[]> {
  const { data } = await apiClient.post<TestPlan[]>(`/projects/${projectId}/test-plans/generate`);
  return data;
}

export async function approveTestPlans(projectId: number): Promise<TestPlan[]> {
  const { data } = await apiClient.post<TestPlan[]>(`/projects/${projectId}/test-plans/approve`);
  return data;
}

export async function updateTestPlan(planId: number, input: CreateTestPlanInput): Promise<TestPlan> {
  const { data } = await apiClient.put<TestPlan>(`/test-plans/${planId}`, input);
  return data;
}

export async function deleteTestPlan(planId: number): Promise<void> {
  await apiClient.delete(`/test-plans/${planId}`);
}
