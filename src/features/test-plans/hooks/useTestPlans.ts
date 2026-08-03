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

function plansKey(projectId: number) {
  return ['test-plans', projectId];
}

function invalidateProject(queryClient: ReturnType<typeof useQueryClient>, projectId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: plansKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
  ]);
}

export function useTestPlans(projectId: number) {
  return useQuery({
    queryKey: plansKey(projectId),
    queryFn: () => fetchTestPlans(projectId),
    enabled: projectId > 0,
  });
}

export function useCreateTestPlan(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestPlanInput) => createTestPlan(projectId, input),
    onSuccess: () => invalidateProject(queryClient, projectId),
  });
}

export function useGenerateTestPlans(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateTestPlans(projectId),
    // Sinh lại plan xóa case/unit test cũ theo cascade → làm mới mọi cache
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useApproveTestPlans(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveTestPlans(projectId),
    onSuccess: () => invalidateProject(queryClient, projectId),
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
