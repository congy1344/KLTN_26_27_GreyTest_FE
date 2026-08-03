import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveTestCases, createTestCase, deleteTestCase, fetchTestCases, generateTestCases, updateTestCase } from '../api/test-case-api';
import type { CreateTestCaseInput, UpdateTestCaseInput } from '../types';

const key = (projectId: number) => ['test-cases', projectId];

export function useTestCases(projectId: number) {
  return useQuery({ queryKey: key(projectId), queryFn: () => fetchTestCases(projectId), enabled: projectId > 0 });
}

export function useGenerateTestCases(projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (planId?: number) => generateTestCases(projectId, planId),
    // Sinh lại case xóa unit test cũ theo cascade → làm mới mọi cache.
    onSuccess: (data, planId) => {
      client.setQueryData(key(projectId), (current: typeof data | undefined) => planId == null
        ? data
        : [...(current ?? []).filter((item) => item.testPlanId !== planId), ...data]);
      return client.invalidateQueries();
    },
  });
}

export function useApproveTestCases(projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => approveTestCases(projectId),
    onSuccess: (data) => {
      client.setQueryData(key(projectId), data);
      return client.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

function invalidate(client: ReturnType<typeof useQueryClient>, projectId: number) {
  client.invalidateQueries({ queryKey: key(projectId) });
  client.invalidateQueries({ queryKey: ['project', projectId] });
}

export function useCreateTestCase(projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestCaseInput) => createTestCase(projectId, input),
    onSuccess: () => invalidate(client, projectId),
  });
}

export function useUpdateTestCase(projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, input }: { caseId: number; input: UpdateTestCaseInput }) => updateTestCase(caseId, input),
    onSuccess: () => invalidate(client, projectId),
  });
}

export function useDeleteTestCase(_projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (caseId: number) => deleteTestCase(caseId),
    // Xóa case cascade xóa unit test → làm mới mọi cache
    onSuccess: () => client.invalidateQueries(),
  });
}
