import { apiClient } from '../../../shared/api/api-client';
import type { Project } from '../../projects/types';
import type {
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GithubConfigResponse,
  GithubImportRequest,
  GithubLoginRequest,
  GithubRepo,
  GoogleConfigResponse,
  GoogleLoginRequest,
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

/** Lấy cấu hình Google Sign-In từ Backend */
export async function fetchGoogleConfig(): Promise<GoogleConfigResponse> {
  const { data } = await apiClient.get<GoogleConfigResponse>('/auth/google-config');
  return data;
}

/** Đăng nhập bằng Google Identity Services credential (ID Token) */
export async function googleLogin(request: GoogleLoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/google', request);
  return data;
}

/** Lấy cấu hình GitHub OAuth từ Backend */
export async function fetchGithubConfig(): Promise<GithubConfigResponse> {
  const { data } = await apiClient.get<GithubConfigResponse>('/auth/github-config');
  return data;
}

/** Đăng nhập hoặc liên kết bằng GitHub authorization code */
export async function githubLogin(request: GithubLoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/github', request);
  return data;
}

/** Lấy danh sách GitHub repositories của người dùng hiện tại */
export async function fetchGithubRepos(): Promise<GithubRepo[]> {
  const { data } = await apiClient.get<GithubRepo[]>('/github/repos');
  return data;
}

/** Import repository từ GitHub vào danh sách dự án */
export async function importGithubRepo(request: GithubImportRequest): Promise<Project> {
  const { data } = await apiClient.post<Project>('/github/import', request);
  return data;
}

/** Ngắt kết nối tài khoản GitHub khỏi tài khoản GreyTest hiện tại */
export async function disconnectGithub(): Promise<AuthUser> {
  const { data } = await apiClient.delete<AuthUser>('/github/disconnect');
  return data;
}

/** Xin backend state chống CSRF dùng một lần, lưu vào sessionStorage và dựng URL cấp quyền GitHub OAuth */
export async function buildGithubAuthorizeUrl(
  config: GithubConfigResponse,
  redirectAfterPath: string,
  mode: 'login' | 'link' = 'login'
): Promise<string> {
  const safeRedirect = redirectAfterPath.startsWith('/') && !redirectAfterPath.startsWith('//')
    ? redirectAfterPath
    : '/projects';
  // Đặt mode trước để interceptor biết có gửi kèm token khi xin state (state gắn với người dùng khi liên kết).
  sessionStorage.setItem('github_oauth_mode', mode);
  sessionStorage.setItem('github_redirect_after', safeRedirect);
  const { data } = await apiClient.post<{ state: string }>('/auth/github/state');
  const state = data.state;
  sessionStorage.setItem('github_oauth_state', state);
  const redirectUri = encodeURIComponent(config.redirectUri || `${window.location.origin}/auth/callback/github`);
  const scope = encodeURIComponent('read:user user:email repo');
  return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(config.clientId)}&redirect_uri=${redirectUri}&scope=${scope}&state=${encodeURIComponent(state)}&prompt=select_account`;
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
