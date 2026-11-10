import { apiClient } from '../../../shared/api/api-client';
import type {
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  PasswordActionResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  UserQuota,
} from '../types';

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

/** Gửi yêu cầu khôi phục mật khẩu về email đã đăng ký */
export async function forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  const { data } = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', request);
  return data;
}

/** Đặt lại mật khẩu mới bằng token nhận từ đường dẫn email */
export async function resetPassword(request: ResetPasswordRequest): Promise<PasswordActionResponse> {
  const { data } = await apiClient.post<PasswordActionResponse>('/auth/reset-password', request);
  return data;
}

/** Đổi mật khẩu dành cho người dùng đang đăng nhập */
export async function changePassword(request: ChangePasswordRequest): Promise<PasswordActionResponse> {
  const { data } = await apiClient.post<PasswordActionResponse>('/auth/change-password', request);
  return data;
}

/** Cập nhật thông tin cá nhân (họ tên) của người dùng đang đăng nhập */
export async function updateProfile(request: UpdateProfileRequest): Promise<AuthUser> {
  const { data } = await apiClient.put<AuthUser>('/auth/profile', request);
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
