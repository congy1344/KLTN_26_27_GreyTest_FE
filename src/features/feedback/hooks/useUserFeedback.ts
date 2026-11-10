import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyFeedbacks,
  submitFeedback,
  type CreateFeedbackPayload,
  type UserFeedbackItem,
} from '../api/user-feedback-api';

export function useMyFeedbacks() {
  const query = useQuery<UserFeedbackItem[]>({
    queryKey: ['user', 'feedbacks'],
    queryFn: fetchMyFeedbacks,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    refetchInterval: 3_000,
    refetchOnWindowFocus: true,
    staleTime: 1_000,
  });

  const { refetch } = query;

  // Tự động refetch ngay khi có tín hiệu đồng bộ từ Admin hoặc từ tab khác
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'greytest_notification_sync') {
        void refetch();
      }
    };
    const handleCustomSync = () => {
      void refetch();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('greytest-notification-sync', handleCustomSync);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('greytest-notification-sync', handleCustomSync);
    };
  }, [refetch]);

  return query;
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFeedbackPayload) => submitFeedback(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user', 'feedbacks'] });
      void queryClient.invalidateQueries({ queryKey: ['user', 'notifications'] });
      try {
        localStorage.setItem('greytest_notification_sync', String(Date.now()));
        window.dispatchEvent(new Event('greytest-notification-sync'));
      } catch {}
    },
  });
}
