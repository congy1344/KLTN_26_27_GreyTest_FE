import { apiClient } from '../../../shared/api/api-client';
import type { CreateTestCaseInput, TestCase, UpdateTestCaseInput } from '../types';

export async function fetchTestCases(projectId: number) {
  const { data } = await apiClient.get<TestCase[]>(`/projects/${projectId}/test-cases`);
  return data;
}

export async function generateTestCases(projectId: number, planId?: number) {
  const { data } = await apiClient.post<TestCase[]>(
    `/projects/${projectId}/test-cases/generate`,
    undefined,
    { params: planId == null ? undefined : { planId } },
  );
  return data;
}

export async function approveTestCases(projectId: number) {
  const { data } = await apiClient.post<TestCase[]>(`/projects/${projectId}/test-cases/approve`);
  return data;
}

export async function createTestCase(projectId: number, input: CreateTestCaseInput) {
  const { data } = await apiClient.post<TestCase>(`/projects/${projectId}/test-cases`, input);
  return data;
}

export async function updateTestCase(caseId: number, input: UpdateTestCaseInput) {
  const { data } = await apiClient.put<TestCase>(`/test-cases/${caseId}`, input);
  return data;
}

export async function deleteTestCase(caseId: number) {
  await apiClient.delete(`/test-cases/${caseId}`);
}
