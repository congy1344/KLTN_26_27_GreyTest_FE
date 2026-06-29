import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentUser, login, register } from '../api/auth-api';

const AUTH_KEY = ['auth', 'me'];

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEY,
    queryFn: fetchCurrentUser,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
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
      localStorage.setItem('greytest.token', data.token);
      queryClient.setQueryData(AUTH_KEY, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    localStorage.removeItem('greytest.token');
    queryClient.removeQueries({ queryKey: AUTH_KEY });
  };
}
