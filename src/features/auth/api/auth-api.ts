import { apiClient } from '../../../shared/api/api-client';
import type { AuthUser, LoginRequest, LoginResponse, RegisterRequest, UserQuota } from '../types';

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', request);
  return data;
}

export async function adminLogin(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/admin/login', request);
  return data;
}

export async function register(request: RegisterRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/register', request);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

/** Lấy thông tin hạn mức quota LLM của người dùng hiện tại */
export async function fetchUserQuota(): Promise<UserQuota> {
  const { data } = await apiClient.get<UserQuota>('/user/quota');
  return data;
}

/** Hủy gói nâng cấp của người dùng hiện tại và nhận hạn mức Free. */
export async function cancelSubscription(): Promise<UserQuota> {
  const { data } = await apiClient.post<UserQuota>('/user/cancel-subscription');
  return data;
}
