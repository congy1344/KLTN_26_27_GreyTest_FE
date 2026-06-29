import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveBusinessRules,
  createBusinessRule,
  fetchBusinessRules,
  generateBusinessRules,
  reviewBusinessRules,
} from '../api/business-rule-api';

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

export function useCreateBusinessRule(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (description: string) => createBusinessRule(projectId, description),
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
