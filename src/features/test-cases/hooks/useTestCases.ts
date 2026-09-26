import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveTestCases, createTestCase, deleteTestCase, fetchTestCases, generateTestCases, updateTestCase } from '../api/test-case-api';
import type { CreateTestCaseInput, UpdateTestCaseInput } from '../types';

const key = (projectId: number, servicePath?: string) => ['test-cases', projectId, servicePath ?? 'auto'];

export function useTestCases(projectId: number, servicePath?: string) {
  return useQuery({ queryKey: key(projectId, servicePath), queryFn: () => fetchTestCases(projectId, servicePath), enabled: projectId > 0 });
}

export function useGenerateTestCases(projectId: number, servicePath?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables?: number | boolean | { planId?: number; resume?: boolean }) => {
      let planId: number | undefined;
      let resume = false;
      if (typeof variables === 'number') {
        planId = variables;
      } else if (typeof variables === 'boolean') {
        resume = variables;
      } else if (variables) {
        planId = variables.planId;
        resume = variables.resume ?? false;
      }
      return generateTestCases(projectId, planId, servicePath, resume);
    },
    onSuccess: () => client.invalidateQueries({
      queryKey: ['generation-progress', projectId, 'TEST_CASE'],
    }),
  });
}

export function useApproveTestCases(projectId: number, servicePath?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => approveTestCases(projectId, servicePath),
    onSuccess: (data) => {
      client.setQueryData(key(projectId, servicePath), data);
      client.setQueryData(['project', projectId], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return { ...old, status: 'CASE_APPROVED' };
      });
      client.invalidateQueries({ queryKey: ['project-services', projectId] });
      return client.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

function invalidate(client: ReturnType<typeof useQueryClient>, projectId: number, servicePath?: string) {
  client.invalidateQueries({ queryKey: key(projectId, servicePath) });
  client.invalidateQueries({ queryKey: ['project', projectId] });
  client.invalidateQueries({ queryKey: ['project-services', projectId] });
}

export function useCreateTestCase(projectId: number, servicePath?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestCaseInput) => createTestCase(projectId, input, servicePath),
    onSuccess: () => invalidate(client, projectId, servicePath),
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
