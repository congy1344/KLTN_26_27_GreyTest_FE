import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelActiveJob, createAdminUser, createFeedback, createTierPackage, deleteAdminUser, deleteFeedback, deleteTierPackage,
  fetchActivities, fetchActiveJobs, fetchAdminUser, fetchAdminUsers,
  fetchAiRuntimeConfig, fetchFeedbacks, fetchFeedbackStats, fetchJobHistory, fetchOverview, fetchServiceHealth, fetchSystemSettings, fetchTierPackages, fetchTopUsers, fetchTrend,
  resetUserQuota, retryJob, updateAdminUser, updateAiKeys, updateAiModel, updateFeedbackStatus, updateStageLimits, updateSystemSettings, updateTierPackage,
  updateUserQuota, updateUserRole, updateUserStatus, updateUserTier,
} from '../api/admin-api';
import type {
  ActivityFilters, CreateUserRequest, GenerationProgressStage, SaveFeedbackRequest, SaveTierPackageRequest,
  UpdateAiKeysRequest, UpdateAiModelRequest, UpdateFeedbackStatusRequest, UpdateStageLimitsRequest, UpdateSystemSettingsRequest,
  UpdateUserRequest, UserFilters, UserRole, UserTier,
} from '../types';

const ADMIN_KEY = ['admin'];

export function useAdminUsers(filters: UserFilters) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'users', filters], queryFn: () => fetchAdminUsers(filters) });
}
export function useAdminUser(id: number, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'user', id],
    queryFn: () => fetchAdminUser(id),
    enabled: Number.isFinite(id),
    refetchInterval: options?.refetchInterval !== undefined ? options.refetchInterval : 5_000,
  });
}
export function useAdminOverview() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'overview'], queryFn: fetchOverview, refetchInterval: 30_000 });
}
export function useAdminTrend(days: number, granularity: string, from?: string, to?: string) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'trend', days, granularity, from, to],
    queryFn: () => fetchTrend(days, granularity, from, to),
  });
}
export function useTopUsers(days: number) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'top', days], queryFn: () => fetchTopUsers(days) });
}
export function useServiceHealth() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'health'], queryFn: fetchServiceHealth, refetchInterval: 30_000 });
}

export function useAiRuntimeConfig() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'ai-config'], queryFn: fetchAiRuntimeConfig });
}

export function useAiRuntimeMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'ai-config'] });
  return {
    updateKeys: useMutation({
      mutationFn: (data: UpdateAiKeysRequest) => updateAiKeys(data),
      onSuccess: refresh,
    }),
    updateLimits: useMutation({
      mutationFn: (data: UpdateStageLimitsRequest) => updateStageLimits(data),
      onSuccess: refresh,
    }),
    updateModel: useMutation({
      mutationFn: (data: UpdateAiModelRequest) => updateAiModel(data),
      onSuccess: refresh,
    }),
  };
}
export function useTierPackages() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'tier-packages'], queryFn: fetchTierPackages });
}

export function useFeedbacks(status?: string, category?: string, search?: string) {
  const query = useQuery({
    queryKey: [...ADMIN_KEY, 'feedbacks', status, category, search],
    queryFn: () => fetchFeedbacks(status, category, search),
    refetchInterval: 3_000,
    refetchOnWindowFocus: true,
  });

  const { refetch } = query;
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'greytest_notification_sync') {
        void refetch();
      }
    };
    const handleCustomSync = () => {
      void refetch();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('greytest-notification-sync', handleCustomSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('greytest-notification-sync', handleCustomSync);
    };
  }, [refetch]);

  return query;
}

export function useFeedbackStats() {
  const query = useQuery({
    queryKey: [...ADMIN_KEY, 'feedback-stats'],
    queryFn: fetchFeedbackStats,
    refetchInterval: 3_000,
    refetchOnWindowFocus: true,
  });

  const { refetch } = query;
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'greytest_notification_sync') {
        void refetch();
      }
    };
    const handleCustomSync = () => {
      void refetch();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('greytest-notification-sync', handleCustomSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('greytest-notification-sync', handleCustomSync);
    };
  }, [refetch]);

  return query;
}

export function useFeedbackMutations() {
  const client = useQueryClient();
  const refresh = () => {
    client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'feedbacks'] });
    client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'feedback-stats'] });
    client.invalidateQueries({ queryKey: ['user', 'feedbacks'] });
    client.invalidateQueries({ queryKey: ['user', 'notifications'] });
    try {
      localStorage.setItem('greytest_notification_sync', String(Date.now()));
      window.dispatchEvent(new Event('greytest-notification-sync'));
    } catch {}
  };
  return {
    create: useMutation({
      mutationFn: (data: SaveFeedbackRequest) => createFeedback(data),
      onSuccess: refresh,
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateFeedbackStatusRequest }) => updateFeedbackStatus(id, data),
      onSuccess: refresh,
    }),
    deleteFeedback: useMutation({
      mutationFn: (id: number) => deleteFeedback(id),
      onSuccess: refresh,
    }),
  };
}

export function useTierPackageMutations() {
  const client = useQueryClient();
  const refresh = () => {
    client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'tier-packages'] });
    client.invalidateQueries({ queryKey: ['public-tier-packages'] });
    client.invalidateQueries({ queryKey: ['user', 'quota'] });
    client.invalidateQueries({ queryKey: ['auth', 'me'] });
  };
  return {
    create: useMutation({ mutationFn: (data: SaveTierPackageRequest) => createTierPackage(data), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ code, data }: { code: string; data: SaveTierPackageRequest }) => updateTierPackage(code, data),
      onSuccess: refresh,
    }),
    deletePackage: useMutation({
      mutationFn: (code: string) => deleteTierPackage(code),
      onSuccess: refresh,
    }),
  };
}

export function useActivities(filters: ActivityFilters) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'activity', filters], queryFn: () => fetchActivities(filters), refetchInterval: 15_000 });
}
export function useActiveJobs(stage?: GenerationProgressStage) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'jobs', 'active', stage], queryFn: () => fetchActiveJobs(stage), refetchInterval: 5_000 });
}

export function useAdminUserMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ADMIN_KEY });
  return {
    create: useMutation({ mutationFn: (data: CreateUserRequest) => createAdminUser(data), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) => updateAdminUser(id, data), onSuccess: refresh }),
    deleteUser: useMutation({ mutationFn: (id: number) => deleteAdminUser(id), onSuccess: refresh }),
    status: useMutation({ mutationFn: ({ id, enabled, reason }: { id: number; enabled: boolean; reason?: string }) => updateUserStatus(id, enabled, reason), onSuccess: refresh }),
    role: useMutation({ mutationFn: ({ id, role }: { id: number; role: UserRole }) => updateUserRole(id, role), onSuccess: refresh }),
    tier: useMutation({ mutationFn: ({ id, tier }: { id: number; tier: UserTier }) => updateUserTier(id, tier), onSuccess: refresh }),
    quota: useMutation({ mutationFn: ({ id, limit }: { id: number; limit: number | null }) => updateUserQuota(id, limit), onSuccess: refresh }),
    resetQuota: useMutation({ mutationFn: (userId: number) => resetUserQuota(userId), onSuccess: refresh }),
    cancelJob: useMutation({
      mutationFn: ({ projectId, stage }: { projectId: number; stage: GenerationProgressStage }) => cancelActiveJob(projectId, stage),
      onSuccess: () => client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'jobs'] }),
    }),
  };
}

export function useJobHistory(page = 0, size = 20, stage?: string) {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'jobs', 'history', page, size, stage],
    queryFn: () => fetchJobHistory(page, size, stage),
    refetchInterval: 10_000,
  });
}

export function useJobRetryMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, stage }: { projectId: number; stage: string }) => retryJob(projectId, stage),
    onSuccess: () => client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'jobs'] }),
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: [...ADMIN_KEY, 'settings'],
    queryFn: fetchSystemSettings,
    refetchInterval: 60_000,
  });
}

export function useSystemSettingsMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSystemSettingsRequest) => updateSystemSettings(data),
    onSuccess: () => client.invalidateQueries({ queryKey: [...ADMIN_KEY, 'settings'] }),
  });
}
