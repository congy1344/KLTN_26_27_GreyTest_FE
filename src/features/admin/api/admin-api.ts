import { apiClient } from '../../../shared/api/api-client';
import type {
  ActiveJob, ActivityFilters, ActivityLog, AdminOverview, AdminUser, AdminUserDetail,
  AiRuntimeConfig, CreateUserRequest, FeedbackOverview, GenerationProgressStage, JobHistoryItem, PageResult, SaveFeedbackRequest, SaveTierPackageRequest,
  ServiceHealth, SystemSettings, TierPackage, TopUser, TrendPoint,
  UpdateAiKeysRequest, UpdateAiModelRequest, UpdateFeedbackStatusRequest, UpdateStageLimitsRequest, UpdateSystemSettingsRequest, UpdateUserRequest, UsageQuota, UserFeedback, UserFilters, UserRole, UserTier,
  ServerTelemetry, WafStatus,
  TrafficOverview, TrafficTimeseries, EndpointAnalytics, TrafficAlert, ServerRequestLog, RateLimitConfigUpdate, MonitoringWindow,
} from '../types';

export async function fetchAdminUsers(filters: UserFilters): Promise<PageResult<AdminUser>> {
  return (await apiClient.get('/admin/users', { params: filters })).data;
}

export async function fetchAdminUser(id: number): Promise<AdminUserDetail> {
  return (await apiClient.get(`/admin/users/${id}`)).data;
}

export async function createAdminUser(data: CreateUserRequest): Promise<AdminUser> {
  return (await apiClient.post('/admin/users', data)).data;
}

export async function updateAdminUser(id: number, data: UpdateUserRequest): Promise<AdminUser> {
  return (await apiClient.put(`/admin/users/${id}`, data)).data;
}

export async function deleteAdminUser(id: number): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

export async function updateUserStatus(id: number, enabled: boolean, reason?: string): Promise<AdminUser> {
  return (await apiClient.patch(`/admin/users/${id}/status`, { enabled, reason })).data;
}

export async function updateUserRole(id: number, role: UserRole): Promise<AdminUser> {
  return (await apiClient.patch(`/admin/users/${id}/role`, { role })).data;
}

export async function updateUserTier(id: number, tier: UserTier): Promise<AdminUser> {
  return (await apiClient.patch(`/admin/users/${id}/tier`, { tier })).data;
}

export async function updateUserQuota(id: number, quotaLimit: number | null): Promise<UsageQuota> {
  return (await apiClient.patch(`/admin/users/${id}/quota`, { quotaLimit })).data;
}

export async function resetUserQuota(userId: number): Promise<UsageQuota> {
  return (await apiClient.post(`/admin/quotas/${userId}/reset`)).data;
}

export async function cancelActiveJob(projectId: number, stage: GenerationProgressStage): Promise<void> {
  await apiClient.delete(`/admin/jobs/active/${projectId}/${stage}`);
}

export async function fetchActivities(filters: ActivityFilters): Promise<PageResult<ActivityLog>> {
  return (await apiClient.get('/admin/activity', { params: filters })).data;
}

export async function fetchActiveJobs(stage?: GenerationProgressStage): Promise<ActiveJob[]> {
  return (await apiClient.get('/admin/jobs/active', { params: stage ? { stage } : {} })).data;
}

export async function fetchOverview(): Promise<AdminOverview> {
  return (await apiClient.get('/admin/stats/overview')).data;
}

export async function fetchTrend(
  days = 30,
  granularity = 'day',
  from?: string,
  to?: string
): Promise<TrendPoint[]> {
  const params: Record<string, unknown> = { days, granularity };
  if (from) params.from = from;
  if (to) params.to = to;
  return (await apiClient.get('/admin/stats/trend', { params })).data;
}

export async function fetchTopUsers(days = 30): Promise<TopUser[]> {
  return (await apiClient.get('/admin/stats/top-users', { params: { days } })).data;
}

export async function fetchServiceHealth(): Promise<ServiceHealth> {
  return (await apiClient.get('/admin/health')).data;
}

export async function fetchAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  return (await apiClient.get('/admin/ai-config')).data;
}

export async function updateAiKeys(data: UpdateAiKeysRequest): Promise<AiRuntimeConfig> {
  return (await apiClient.put('/admin/ai-config/keys', data)).data;
}

export async function updateStageLimits(data: UpdateStageLimitsRequest): Promise<AiRuntimeConfig> {
  return (await apiClient.put('/admin/ai-config/limits', data)).data;
}

export async function updateAiModel(data: UpdateAiModelRequest): Promise<AiRuntimeConfig> {
  return (await apiClient.put('/admin/ai-config/model', data)).data;
}

export async function fetchTierPackages(): Promise<TierPackage[]> {
  return (await apiClient.get('/admin/tier-packages')).data;
}

export async function createTierPackage(data: SaveTierPackageRequest): Promise<TierPackage> {
  return (await apiClient.post('/admin/tier-packages', data)).data;
}

export async function updateTierPackage(code: string, data: SaveTierPackageRequest): Promise<TierPackage> {
  return (await apiClient.put(`/admin/tier-packages/${encodeURIComponent(code)}`, data)).data;
}

export async function deleteTierPackage(code: string): Promise<void> {
  await apiClient.delete(`/admin/tier-packages/${encodeURIComponent(code)}`);
}

export async function fetchFeedbacks(status?: string, category?: string, search?: string): Promise<UserFeedback[]> {
  return (await apiClient.get('/admin/feedbacks', { params: { status, category, search } })).data;
}

export async function fetchFeedbackStats(): Promise<FeedbackOverview> {
  return (await apiClient.get('/admin/feedbacks/stats')).data;
}

export async function createFeedback(data: SaveFeedbackRequest): Promise<UserFeedback> {
  return (await apiClient.post('/admin/feedbacks', data)).data;
}

export async function updateFeedbackStatus(id: number, data: UpdateFeedbackStatusRequest): Promise<UserFeedback> {
  return (await apiClient.patch(`/admin/feedbacks/${id}/status`, data)).data;
}

export async function deleteFeedback(id: number): Promise<void> {
  await apiClient.delete(`/admin/feedbacks/${id}`);
}

export async function fetchJobHistory(page = 0, size = 20, stage?: string): Promise<PageResult<JobHistoryItem>> {
  return (await apiClient.get('/admin/jobs/history', { params: { page, size, stage } })).data;
}

export async function retryJob(projectId: number, stage: string): Promise<void> {
  await apiClient.post(`/admin/jobs/${projectId}/${encodeURIComponent(stage)}/retry`);
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return (await apiClient.get('/admin/settings')).data;
}

export async function updateSystemSettings(data: UpdateSystemSettingsRequest): Promise<SystemSettings> {
  return (await apiClient.put('/admin/settings', data)).data;
}

export async function fetchServerTelemetry(params?: { limit?: number; search?: string; status?: number }): Promise<ServerTelemetry> {
  return (await apiClient.get('/admin/system/request-logs', { params })).data;
}

export async function fetchWafStatus(): Promise<WafStatus> {
  return (await apiClient.get('/admin/system/security/waf-status')).data;
}

export async function toggleUnderAttackMode(enabled: boolean): Promise<WafStatus> {
  return (await apiClient.post('/admin/system/security/under-attack-mode', { enabled })).data;
}

export async function blockIp(ip: string, reason: string, durationMinutes = 15): Promise<WafStatus> {
  return (await apiClient.post('/admin/system/security/block-ip', { ip, reason, durationMinutes })).data;
}

export async function unblockIp(ip: string): Promise<WafStatus> {
  return (await apiClient.delete(`/admin/system/security/block-ip/${encodeURIComponent(ip)}`)).data;
}

export async function updateRateLimit(rateLimitPerMinute: number): Promise<WafStatus> {
  return (await apiClient.put('/admin/system/security/rate-limit', { rateLimitPerMinute })).data;
}

export async function fetchTrafficOverview(window: MonitoringWindow | string = '1m'): Promise<TrafficOverview> {
  return (await apiClient.get('/admin/monitoring/traffic/overview', { params: { window } })).data;
}

export async function fetchTrafficTimeseries(window: MonitoringWindow | string = '1m'): Promise<TrafficTimeseries> {
  return (await apiClient.get('/admin/monitoring/traffic/timeseries', { params: { window } })).data;
}

export interface RecentRequestsQuery {
  page?: number;
  size?: number;
  search?: string;
  method?: string;
  status?: number;
  statusGroup?: string;
  minLatencyMs?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export async function fetchRecentRequests(params: RecentRequestsQuery = {}): Promise<PageResult<ServerRequestLog>> {
  return (await apiClient.get('/admin/monitoring/requests/recent', { params })).data;
}

export async function fetchEndpointAnalytics(window: MonitoringWindow | string = '15m', limit = 10): Promise<EndpointAnalytics> {
  return (await apiClient.get('/admin/monitoring/endpoints', { params: { window, limit } })).data;
}

export async function fetchTrafficAlerts(window: MonitoringWindow | string = '1m'): Promise<TrafficAlert[]> {
  return (await apiClient.get('/admin/monitoring/alerts', { params: { window } })).data;
}

export async function fetchMonitoringRateLimit(): Promise<WafStatus> {
  return (await apiClient.get('/admin/monitoring/rate-limit')).data;
}

export async function updateMonitoringRateLimit(config: RateLimitConfigUpdate): Promise<WafStatus> {
  return (await apiClient.put('/admin/monitoring/rate-limit', config)).data;
}
