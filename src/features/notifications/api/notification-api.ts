import { apiClient } from '../../../shared/api/api-client';

export type NotificationType = 'ADMIN' | 'PAYMENT' | 'TASK' | string;

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
  read?: boolean;
}

export async function fetchUserNotifications(): Promise<UserNotification[]> {
  const response = await apiClient.get<UserNotification[]>('/user/notifications');
  return response.data;
}

