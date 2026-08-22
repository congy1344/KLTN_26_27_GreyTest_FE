import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchActivities, fetchAdminUser, fetchAdminUsers, fetchOverview, fetchServiceHealth,
  fetchTopUsers, fetchTrend, updateUserQuota, updateUserRole, updateUserStatus,
} from '../api/admin-api';
import type { ActivityFilters, UserFilters, UserRole } from '../types';

const ADMIN_KEY = ['admin'];

export function useAdminUsers(filters: UserFilters) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'users', filters], queryFn: () => fetchAdminUsers(filters) });
}
export function useAdminUser(id: number) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'user', id], queryFn: () => fetchAdminUser(id), enabled: Number.isFinite(id) });
}
export function useAdminOverview() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'overview'], queryFn: fetchOverview, refetchInterval: 30_000 });
}
export function useAdminTrend(days: number, granularity: string) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'trend', days, granularity], queryFn: () => fetchTrend(days, granularity) });
}
export function useTopUsers(days: number) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'top', days], queryFn: () => fetchTopUsers(days) });
}
export function useServiceHealth() {
  return useQuery({ queryKey: [...ADMIN_KEY, 'health'], queryFn: fetchServiceHealth, refetchInterval: 30_000 });
}
export function useActivities(filters: ActivityFilters) {
  return useQuery({ queryKey: [...ADMIN_KEY, 'activity', filters], queryFn: () => fetchActivities(filters), refetchInterval: 15_000 });
}

export function useAdminUserMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ADMIN_KEY });
  return {
    status: useMutation({ mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => updateUserStatus(id, enabled), onSuccess: refresh }),
    role: useMutation({ mutationFn: ({ id, role }: { id: number; role: UserRole }) => updateUserRole(id, role), onSuccess: refresh }),
    quota: useMutation({ mutationFn: ({ id, limit }: { id: number; limit: number }) => updateUserQuota(id, limit), onSuccess: refresh }),
  };
}
