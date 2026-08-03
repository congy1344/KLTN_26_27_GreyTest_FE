import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptBusinessRuleSuggestion,
  approveBusinessRules,
  createBusinessRule,
  deleteBusinessRule,
  fetchBusinessRules,
  generateBusinessRules,
  reviewBusinessRules,
  updateBusinessRule,
} from '../api/business-rule-api';
import type { BusinessRule } from '../types';

function rulesKey(projectId: number) {
  return ['business-rules', projectId];
}

export function useBusinessRules(projectId: number) {
  return useQuery({
    queryKey: rulesKey(projectId),
    queryFn: () => fetchBusinessRules(projectId),
    enabled: projectId > 0,
  });
}

export function useCreateBusinessRules(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ methodId, descriptions, sourceBranchId }: {
      methodId: number;
      descriptions: string[];
      sourceBranchId: string | null;
    }) => {
      const created = [];
      for (const description of descriptions) {
        created.push(await createBusinessRule(projectId, methodId, description, sourceBranchId));
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateBusinessRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rule, description }: { rule: BusinessRule; description: string }) => updateBusinessRule(rule, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useAcceptBusinessRuleSuggestion(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => acceptBusinessRuleSuggestion(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteBusinessRule(_projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => deleteBusinessRule(ruleId),
    // Xóa BR cascade xóa Plan/Case/Unit Test → làm mới mọi cache
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useGenerateBusinessRules(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateBusinessRules(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useReviewBusinessRules(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reviewBusinessRules(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useApproveBusinessRules(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveBusinessRules(projectId),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) }),
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    ]),
  });
}
