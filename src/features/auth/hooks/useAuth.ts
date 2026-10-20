import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminLogin, fetchCurrentUser, fetchUserQuota, login, register } from '../api/auth-api';

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
    enabled: Boolean(localStorage.getItem('greytest.token')),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      void queryClient.cancelQueries();
      queryClient.clear();
      localStorage.setItem('greytest.token', data.token);
      queryClient.setQueryData(AUTH_KEY, data.user);
    },
  });
}

/** Tạo phiên đăng nhập từ endpoint dành riêng cho quản trị viên. */
export function useAdminLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminLogin,
    onSuccess: (data) => {
      void queryClient.cancelQueries();
      queryClient.clear();
      localStorage.setItem('greytest.token', data.token);
      queryClient.setQueryData(AUTH_KEY, data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      void queryClient.cancelQueries();
      queryClient.clear();
      localStorage.setItem('greytest.token', data.token);
      queryClient.setQueryData(AUTH_KEY, data.user);
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
