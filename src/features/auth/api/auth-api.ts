import { apiClient } from '../../../shared/api/api-client';
import type { AuthUser, LoginRequest, LoginResponse, RegisterRequest } from '../types';

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', request);
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
