import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveTestPlans,
  createTestPlan,
  deleteTestPlan,
  fetchTestPlans,
  generateTestPlans,
  updateTestPlan,
} from '../api/test-plan-api';
import type { CreateTestPlanInput } from '../types';

function plansKey(projectId: number, servicePath?: string) {
  return ['test-plans', projectId, servicePath ?? 'auto'];
}

function invalidateProject(queryClient: ReturnType<typeof useQueryClient>, projectId: number, servicePath?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: plansKey(projectId, servicePath) }),
    queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['project-services', projectId] }),
  ]);
}

export function useTestPlans(projectId: number, servicePath?: string) {
  return useQuery({
    queryKey: plansKey(projectId, servicePath),
    queryFn: () => fetchTestPlans(projectId, servicePath),
    enabled: projectId > 0,
  });
}

export function useCreateTestPlan(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestPlanInput) => createTestPlan(projectId, input, servicePath),
    onSuccess: () => invalidateProject(queryClient, projectId, servicePath),
  });
}

export function useGenerateTestPlans(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateTestPlans(projectId, servicePath),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ['generation-progress', projectId, 'TEST_PLAN'],
    }),
  });
}

export function useApproveTestPlans(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveTestPlans(projectId, servicePath),
    onSuccess: () => invalidateProject(queryClient, projectId, servicePath),
  });
}

export function useUpdateTestPlan(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, input }: { planId: number; input: CreateTestPlanInput }) => updateTestPlan(planId, input),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useDeleteTestPlan(_projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: number) => deleteTestPlan(planId),
    // Xóa plan cascade xóa case/unit test → làm mới mọi cache
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
