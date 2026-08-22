export type UserRole = 'USER' | 'ADMIN';
export type ActivityAction =
  | 'GENERATE_BUSINESS_RULE' | 'REVIEW_BUSINESS_RULE' | 'GENERATE_TEST_PLAN'
  | 'GENERATE_TEST_CASE' | 'GENERATE_UNIT_TEST' | 'COVERAGE_REFINEMENT'
  | 'LLM_CALL' | 'ADMIN_STATUS_CHANGE' | 'ADMIN_ROLE_CHANGE' | 'ADMIN_QUOTA_CHANGE';

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UsageQuota {
  limit: number;
  used: number;
  remaining: number;
  periodStart: string;
  exceeded: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  totalActivities: number;
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

export interface AdminUserDetail {
  user: AdminUser;
  projects: Array<{ id: number; name: string; status: string; createdAt: string }>;
  generatedUnitTests: number;
  recentActivities: ActivityLog[];
}

export interface AdminOverview {
  totalUsers: number;
  newUsers7Days: number;
  newUsers30Days: number;
  totalGenerationRequests: number;
  totalLlmCalls: number;
  quotaAlerts: number;
}

export interface TrendPoint { bucket: string; total: number }
export interface TopUser { userId: number; email: string; totalLlmCalls: number }
export interface ServiceHealth { application: string; database: string; llmGateway: string; javaParser: string }

export interface UserFilters {
  search?: string;
  role?: UserRole | '';
  enabled?: '' | 'true' | 'false';
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ActivityFilters {
  userId?: number;
  action?: ActivityAction | '';
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
