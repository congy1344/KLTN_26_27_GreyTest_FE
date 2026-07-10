import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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
    mutationFn: async ({ methodId, descriptions }: { methodId: number; descriptions: string[] }) => {
      const created = [];
      for (const description of descriptions) {
        created.push(await createBusinessRule(projectId, methodId, description));
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

export function useDeleteBusinessRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => deleteBusinessRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rulesKey(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}
