export type UserTier = 'FREE' | 'PLUS' | 'PRO';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  tier?: UserTier;
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

export interface UserQuota {
  tier: UserTier;
  limit: number | null;
  used: number;
  remaining: number | null;
  periodStart: string;
  resetDate: string;
  exceeded: boolean;
}
