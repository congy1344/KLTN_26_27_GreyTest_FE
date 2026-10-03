export type UserTier = 'FREE' | 'PRO';

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
