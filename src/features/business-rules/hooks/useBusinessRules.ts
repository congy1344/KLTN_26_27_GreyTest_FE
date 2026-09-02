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

function rulesKey(projectId: number, servicePath?: string) {
  return ['business-rules', projectId, servicePath ?? 'auto'];
}

export function useBusinessRules(projectId: number, servicePath?: string) {
  return useQuery({
    queryKey: rulesKey(projectId, servicePath),
    queryFn: () => fetchBusinessRules(projectId, servicePath),
    enabled: projectId > 0,
  });
}

export function useCreateBusinessRules(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ methodId, descriptions, sourceBranchId }: {
      methodId: number;
      descriptions: string[];
      sourceBranchId: string | null;
    }) => {
      if (sourceBranchId && descriptions.length !== 1) {
        throw new Error('Mỗi quyết định source chỉ được liên kết với một Business Rule.');
      }
      const created = [];
      for (const description of descriptions) {
        created.push(await createBusinessRule(projectId, methodId, description, sourceBranchId, servicePath));
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId, servicePath) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
    },
  });
}

export function useUpdateBusinessRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rule, description }: { rule: BusinessRule; description: string }) => updateBusinessRule(rule, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
    },
  });
}

export function useAcceptBusinessRuleSuggestion(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => acceptBusinessRuleSuggestion(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-rules', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
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

export function useGenerateBusinessRules(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateBusinessRules(projectId, servicePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-progress', projectId, 'BUSINESS_RULE'] });
    },
  });
}

export function useReviewBusinessRules(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reviewBusinessRules(projectId, servicePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId, servicePath) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
    },
  });
}

export function useApproveBusinessRules(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveBusinessRules(projectId, servicePath),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId, servicePath) }),
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] }),
    ]),
  });
}
