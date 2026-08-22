import { apiClient } from '../../../shared/api/api-client';
import type {
  ActivityFilters, ActivityLog, AdminOverview, AdminUser, AdminUserDetail,
  PageResult, ServiceHealth, TopUser, TrendPoint, UsageQuota, UserFilters, UserRole,
} from '../types';

export async function fetchAdminUsers(filters: UserFilters): Promise<PageResult<AdminUser>> {
  return (await apiClient.get('/admin/users', { params: filters })).data;
}

export async function fetchAdminUser(id: number): Promise<AdminUserDetail> {
  return (await apiClient.get(`/admin/users/${id}`)).data;
}

export async function updateUserStatus(id: number, enabled: boolean): Promise<AdminUser> {
  return (await apiClient.patch(`/admin/users/${id}/status`, { enabled })).data;
}

export async function updateUserRole(id: number, role: UserRole): Promise<AdminUser> {
  return (await apiClient.patch(`/admin/users/${id}/role`, { role })).data;
}

export async function updateUserQuota(id: number, quotaLimit: number): Promise<UsageQuota> {
  return (await apiClient.patch(`/admin/users/${id}/quota`, { quotaLimit })).data;
}

export async function fetchActivities(filters: ActivityFilters): Promise<PageResult<ActivityLog>> {
  return (await apiClient.get('/admin/activity', { params: filters })).data;
}

export async function fetchOverview(): Promise<AdminOverview> {
  return (await apiClient.get('/admin/stats/overview')).data;
}

export async function fetchTrend(days = 30, granularity = 'day'): Promise<TrendPoint[]> {
  return (await apiClient.get('/admin/stats/trend', { params: { days, granularity } })).data;
}

export async function fetchTopUsers(days = 30): Promise<TopUser[]> {
  return (await apiClient.get('/admin/stats/top-users', { params: { days } })).data;
}

export async function fetchServiceHealth(): Promise<ServiceHealth> {
  return (await apiClient.get('/admin/health')).data;
}
