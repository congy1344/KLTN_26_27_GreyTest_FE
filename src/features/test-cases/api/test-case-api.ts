import { apiClient } from '../../../shared/api/api-client';
import { serviceParams } from '../../projects/utils/project-service';
import type { CreateTestCaseInput, TestCase, UpdateTestCaseInput } from '../types';
import type { GenerationJobAccepted } from '../../../shared/types/generation-progress';

export async function fetchTestCases(projectId: number, servicePath?: string) {
  const { data } = await apiClient.get<TestCase[]>(`/projects/${projectId}/test-cases`, { params: serviceParams(servicePath) });
  return data;
}

export async function generateTestCases(projectId: number, planId?: number, servicePath?: string) {
  const { data } = await apiClient.post<GenerationJobAccepted>(
    `/projects/${projectId}/test-cases/generate`,
    undefined,
    { params: { ...serviceParams(servicePath), ...(planId == null ? {} : { planId }) } },
  );
  return data;
}

export async function approveTestCases(projectId: number, servicePath?: string) {
  const { data } = await apiClient.post<TestCase[]>(`/projects/${projectId}/test-cases/approve`, undefined, { params: serviceParams(servicePath) });
  return data;
}

export async function createTestCase(projectId: number, input: CreateTestCaseInput, servicePath?: string) {
  const { data } = await apiClient.post<TestCase>(`/projects/${projectId}/test-cases`, input, { params: serviceParams(servicePath) });
  return data;
}

export async function updateTestCase(caseId: number, input: UpdateTestCaseInput) {
  const { data } = await apiClient.put<TestCase>(`/test-cases/${caseId}`, input);
  return data;
}

export async function deleteTestCase(caseId: number) {
  await apiClient.delete(`/test-cases/${caseId}`);
}
