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
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
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
