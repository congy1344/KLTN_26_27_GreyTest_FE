import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminLogin,
  cancelSubscription,
  changePassword,
  disconnectGithub,
  fetchCurrentUser,
  fetchGithubConfig,
  fetchGithubRepos,
  fetchGoogleConfig,
  fetchUserQuota,
  forgotPassword,
  githubLogin,
  googleLogin,
  importGithubRepo,
  login,
  register,
  resetPassword,
  updateProfile,
} from '../api/auth-api';
import type { AuthUser, LoginResponse } from '../types';

const AUTH_KEY = ['auth', 'me'];
export const USER_QUOTA_KEY = ['user', 'quota'];

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEY,
    queryFn: fetchCurrentUser,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    retry: false,
  });
}

/** Lấy thông tin hạn mức sử dụng AI quota của người dùng hiện tại */
export function useUserQuota() {
  return useQuery({
    queryKey: USER_QUOTA_KEY,
    queryFn: fetchUserQuota,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    retry: false,
  });
}

/** Cập nhật gói và quota dùng chung sau khi người dùng hủy Plus/Pro. */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: async (quota) => {
      // Chặn request cũ trả về muộn làm hiện lại gói trước khi hủy.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: AUTH_KEY }),
        queryClient.cancelQueries({ queryKey: USER_QUOTA_KEY }),
      ]);
      queryClient.setQueryData(USER_QUOTA_KEY, quota);
      queryClient.setQueryData<AuthUser>(AUTH_KEY, (user) => user ? { ...user, tier: quota.tier } : user);
    },
  });
}

function applyAuthSession(queryClient: ReturnType<typeof useQueryClient>, data: LoginResponse) {
  void queryClient.cancelQueries();
  queryClient.clear();
  localStorage.setItem('greytest.token', data.token);
  queryClient.setQueryData(AUTH_KEY, data.user);
  void queryClient.invalidateQueries({ queryKey: AUTH_KEY });
  void queryClient.invalidateQueries({ queryKey: USER_QUOTA_KEY });
  void queryClient.invalidateQueries({ queryKey: ['github', 'repos'] });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => applyAuthSession(queryClient, data),
  });
}

/** Lấy cấu hình Google Client ID từ Backend để khởi tạo nút đăng nhập Google */
export function useGoogleConfig() {
  return useQuery({
    queryKey: ['auth', 'google-config'],
    queryFn: fetchGoogleConfig,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Đăng nhập qua Google Identity Services (GIS) */
export function useGoogleLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: googleLogin,
    onSuccess: (data) => applyAuthSession(queryClient, data),
  });
}

/** Lấy cấu hình GitHub OAuth từ Backend */
export function useGithubConfig() {
  return useQuery({
    queryKey: ['auth', 'github-config'],
    queryFn: fetchGithubConfig,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Đăng nhập qua GitHub OAuth */
export function useGithubLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: githubLogin,
    onSuccess: (data) => applyAuthSession(queryClient, data),
  });
}

/** Lấy danh sách GitHub repositories của người dùng hiện tại */
export function useGithubRepos(enabled = true) {
  return useQuery({
    queryKey: ['github', 'repos'],
    queryFn: fetchGithubRepos,
    enabled: enabled && Boolean(localStorage.getItem('greytest.token')),
    staleTime: 60_000,
    retry: false,
  });
}

/** Import repository từ GitHub vào GreyTest */
export function useImportGithubRepo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importGithubRepo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/** Ngắt kết nối tài khoản GitHub khỏi tài khoản GreyTest hiện tại */
export function useDisconnectGithub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectGithub,
    onSuccess: async (updatedUser) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: AUTH_KEY }),
        queryClient.cancelQueries({ queryKey: ['github', 'repos'] }),
      ]);
      queryClient.setQueryData(AUTH_KEY, updatedUser);
      queryClient.removeQueries({ queryKey: ['github', 'repos'] });
    },
  });
}

/** Tạo phiên đăng nhập từ endpoint dành riêng cho quản trị viên. */
export function useAdminLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => applyAuthSession(queryClient, data),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => applyAuthSession(queryClient, data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: resetPassword,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(AUTH_KEY, updatedUser);
      void queryClient.invalidateQueries({ queryKey: AUTH_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    localStorage.removeItem('greytest.token');
    // Cache project cũng thuộc phiên cũ, không được hiển thị cho tài khoản đăng nhập sau.
    void queryClient.cancelQueries();
    queryClient.clear();
  };
}
