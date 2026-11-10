export type UserRole = 'USER' | 'ADMIN';
export type UserTier = 'FREE' | 'PLUS' | 'PRO';
export type ActivityAction =
  | 'GENERATE_BUSINESS_RULE' | 'REVIEW_BUSINESS_RULE' | 'GENERATE_TEST_PLAN'
  | 'GENERATE_TEST_CASE' | 'GENERATE_UNIT_TEST' | 'COVERAGE_REFINEMENT'
  | 'LLM_CALL' | 'ADMIN_STATUS_CHANGE' | 'ADMIN_ROLE_CHANGE' | 'ADMIN_QUOTA_CHANGE'
  | 'USER_UPGRADE_TIER' | 'USER_CANCEL_TIER' | 'ADMIN_TIER_CHANGE'
  | 'USER_LOGIN';

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UsageQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  periodStart: string;
  resetDate: string;
  exceeded: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  tier: UserTier;
  enabled: boolean;
  createdAt: string;
  totalGenerationRequests: number;
  lastActivityAt: string | null;
  quota: UsageQuota;
}

export interface ActivityLog {
  id: number;
  userId: number;
  userEmail?: string;
  actionType: ActivityAction;
  projectId?: number;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface LoginHistoryRecord {
  id: number;
  timestamp: string;
  ip: string;
  userAgent: string;
  portal?: string;
  status: string;
  device?: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  projects: Array<{ id: number; name: string; status: string; createdAt: string }>;
  generatedUnitTests: number;
  recentActivities: ActivityLog[];
  lastLoginAt?: string | null;
  loginHistory?: LoginHistoryRecord[];
}

export interface AdminOverview {
  totalUsers: number;
  newUsers7Days: number;
  newUsers30Days: number;
  totalGenerationRequests: number;
  totalLlmCalls: number;
  quotaAlerts: number;
  generationRequests7Days?: number;
  llmCalls7Days?: number;
  totalProjects?: number;
  totalBusinessRules?: number;
  totalTestPlans?: number;
  totalTestCases?: number;
  totalUnitTests?: number;
  avgLineCoverage?: number | null;
  avgBranchCoverage?: number | null;
  totalCoverageReports?: number;
}

export interface TrendPoint { bucket: string; total: number }
export interface TopUser { userId: number; email: string; totalLlmCalls: number }
export interface ServiceHealth {
  application: string;
  database: string;
  llmGateway: string;
  javaParser: string;
  jvmHeapUsedMb?: number;
  jvmHeapMaxMb?: number;
  jvmNonHeapUsedMb?: number;
  activeConnections?: number;
  idleConnections?: number;
  maxConnections?: number;
  threadCount?: number;
  uptimeSeconds?: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole | '';
  enabled?: '' | 'true' | 'false';
  tier?: UserTier | '';
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ActivityFilters {
  userId?: number;
  userSearch?: string;
  action?: ActivityAction | '';
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export type GenerationProgressStage = 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
export type GenerationProgressStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface ActiveJob {
  projectId: number;
  projectName: string;
  userEmail: string;
  stage: GenerationProgressStage;
  status: GenerationProgressStatus;
  percent: number;
  completedSteps: number;
  totalSteps: number;
  message: string | null;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
  tier?: UserTier;
  quotaLimit?: number | null;
}

export interface UpdateUserRequest {
  fullName?: string;
  password?: string;
  role?: UserRole;
  tier?: UserTier;
  quotaLimit?: number | null;
  unlimitedQuota?: boolean;
}

export interface ApiKeySlot {
  slot: number;
  envVar: string;
  role: string;
  maskedKey: string;
  rawKey: string;
  configured: boolean;
}

export interface AiRuntimeConfig {
  provider: string;
  model: string;
  endpoint: string;
  batchConcurrency: number;
  keys: ApiKeySlot[];
  stageLimits: Record<string, number>;
}

export interface UpdateApiKeySlotRequest {
  slot: number;
  key: string;
}

export interface UpdateAiKeysRequest {
  slots: UpdateApiKeySlotRequest[];
}

export interface UpdateAiModelRequest {
  model?: string;
  provider?: string;
}

export interface UpdateStageLimitsRequest {
  stageLimits: Record<string, number>;
}

export interface TierPackage {
  code: string;
  name: string;
  price: number;
  cycle: string;
  quotaLimit: number;
  batchConcurrency: number;
  features: string[];
  description: string;
  active: boolean;
  activeUsersCount: number;
}

export interface SaveTierPackageRequest {
  code?: string;
  name?: string;
  price?: number;
  cycle?: string;
  quotaLimit?: number;
  batchConcurrency?: number;
  features?: string[];
  description?: string;
  active?: boolean;
}

export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type FeedbackCategory = 'BUG_GENERATION' | 'COVERAGE_TESTPLAN' | 'ACCOUNT_QUOTA' | 'FEATURE_REQUEST' | 'OTHER';

export interface JobHistoryItem {
  id: number;
  projectId?: number;
  projectName: string;
  userId?: number;
  userEmail: string;
  action: ActivityAction;
  status: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  stage?: GenerationProgressStage;
  message?: string | null;
}

export interface SystemSettingItem {
  key: string;
  value: string;
  description: string;
  updatedAt?: string;
}

export interface SystemSettings {
  settings: Record<string, string>;
  details: SystemSettingItem[];
}

export interface UpdateSystemSettingsRequest {
  settings: Record<string, string>;
}

export interface UserFeedback {
  id: number;
  userId?: number;
  userEmail: string;
  userName?: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  rating?: number;
  status: FeedbackStatus;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string | null;
  projectName?: string | null;
}

export interface SaveFeedbackRequest {
  category: string;
  title: string;
  content: string;
  rating?: number;
  projectName?: string;
}

export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus;
  adminNote?: string;
}

export interface FeedbackOverview {
  total: number;
  pending: number;
  resolved: number;
  averageRating?: number;
}

export interface ServerRequestLog {
  id: string;
  timestamp: string;
  method: string;
  uri: string;
  routeTemplate?: string;
  status: number;
  durationMs: number;
  clientIp: string;
  userEmail: string;
  requestType?: string;
  userAgent?: string | null;
}

export interface ServerTelemetry {
  totalRequests: number;
  requestsPerMinute: number;
  requestsPerSecond: number;
  activeRequests: number;
  rateLimitedCount: number;
  logs: ServerRequestLog[];
}

export interface BlockedIpEntry {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt: string;
  violationCount: number;
}

export interface WafStatus {
  active: boolean;
  underAttackMode: boolean;
  rateLimitPerMinute: number;
  standardRateLimitPerMinute?: number;
  underAttackRateLimitPerMinute?: number;
  burstLimitPerSecond: number;
  totalBlockedRequests: number;
  activeBlockedIpCount: number;
  blockedIps: BlockedIpEntry[];
}

export type MonitoringDataState = 'LOADING' | 'AVAILABLE' | 'NO_DATA' | 'NOT_SUPPORTED' | 'ERROR';
export type MonitoringStreamState = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';
export type MonitoringWindow = '1m' | '5m' | '15m' | '1h' | '24h';

export interface TrafficOverview {
  window: MonitoringWindow | string;
  windowSeconds: number;
  generatedAt: string;
  lifetimeTotalRequests: number;
  windowTotalRequests: number;
  currentRps: number;
  averageRps: number;
  peakRps: number;
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
  maxLatencyMs: number | null;
  errorRatePercent: number | null;
  clientErrorRatePercent: number | null;
  serverErrorRatePercent: number | null;
  successCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  activeConnections: number;
  rejectedRequests: number;
  windowRejectedRequests: number;
  previousWindowRequests: number;
  requestsChangePercent: number | null;
  previousAverageRps: number | null;
  rpsChangePercent: number | null;
  previousAvgLatencyMs: number | null;
  latencyChangePercent: number | null;
  dataState: MonitoringDataState;
}

export interface TrafficTimeseriesPoint {
  timestamp: string;
  rps: number;
  totalRequests: number;
  success2xx: number;
  clientError4xx: number;
  serverError5xx: number;
  rateLimited429: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  spike: boolean;
  disconnectedGap?: boolean;
}

export interface TrafficTimeseries {
  window: MonitoringWindow | string;
  bucketSeconds: number;
  warningRpsThreshold: number;
  criticalRpsThreshold: number;
  points: TrafficTimeseriesPoint[];
}

export interface EndpointMetric {
  method: string;
  endpoint: string;
  requestCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  errorCount: number;
  clientError4xx: number;
  serverError5xx: number;
  errorRatePercent: number;
}

export interface EndpointAnalytics {
  window: MonitoringWindow | string;
  topByVolume: EndpointMetric[];
  topByLatency: EndpointMetric[];
  topByErrorRate: EndpointMetric[];
  methodDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export interface TrafficAlert {
  id: string;
  code: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  metricValue: string;
  thresholdValue: string;
  triggeredAt: string;
}

export interface TrafficStreamSnapshot {
  timestamp: string;
  overview: TrafficOverview;
  latestPoint: TrafficTimeseriesPoint;
  alerts: TrafficAlert[];
  rateLimit: WafStatus;
  recentRequests: ServerRequestLog[];
}

export interface RateLimitConfigUpdate {
  active?: boolean;
  underAttackMode?: boolean;
  rateLimitPerMinute?: number;
  underAttackRateLimitPerMinute?: number;
  burstLimitPerSecond?: number;
}
