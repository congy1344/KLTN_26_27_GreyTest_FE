export type UserTier = 'FREE' | 'PLUS' | 'PRO';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  tier?: UserTier;
  phoneNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  githubUsername?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  mailSent: boolean;
  resetUrl?: string | null;
  devOtp?: string | null;
}

export interface ResetPasswordRequest {
  token?: string;
  email?: string;
  otp?: string;
  newPassword: string;
  confirmPassword: string;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface GoogleConfigResponse {
  enabled: boolean;
  clientId: string;
}

export interface GithubConfigResponse {
  enabled: boolean;
  clientId: string;
  redirectUri: string;
}

export interface GithubLoginRequest {
  code: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string;
}

export interface GithubImportRequest {
  cloneUrl: string;
  branch?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordActionResponse {
  message: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  githubUsername?: string | null;
}

export interface UserQuota {
  tier: UserTier;
  limit: number | null;
  used: number;
  remaining: number | null;
  periodStart: string;
  resetDate: string;
  exceeded: boolean;
}
