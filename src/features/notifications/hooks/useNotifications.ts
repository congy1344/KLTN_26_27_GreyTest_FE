import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserNotifications, type UserNotification } from '../api/notification-api';
import { useCurrentUser } from '../../auth/hooks/useAuth';

function getStorageKey(userId?: number | string): string {
  return userId ? `greytest_notifications_read_${userId}` : 'greytest_notifications_read';
}

function getReadNotificationIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadNotificationIds(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function useNotifications() {
  const { data: user } = useCurrentUser();
  const storageKey = getStorageKey(user?.id);
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadNotificationIds(storageKey));
  const [filter, setFilter] = useState<'ALL' | 'ADMIN' | 'PAYMENT' | 'TASK'>('ALL');

  useEffect(() => {
    setReadIds(getReadNotificationIds(storageKey));
  }, [storageKey]);

  const { data: rawNotifications = [], isLoading, error, refetch } = useQuery<UserNotification[]>({
    queryKey: ['user', 'notifications'],
    queryFn: fetchUserNotifications,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    refetchInterval: 3_000, // Tự động refetch mỗi 3 giây khi tab đang active để cập nhật phản hồi admin realtime
    refetchOnWindowFocus: true,
    staleTime: 1_000,
  });

  // Lắng nghe tín hiệu đồng bộ giữa các tab hoặc từ các mutation phản hồi
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setReadIds(getReadNotificationIds(storageKey));
      }
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
  }, [refetch, storageKey]);

  // Đồng bộ read status từ localStorage
  const notifications = useMemo(() => {
    return rawNotifications.map((item) => ({
      ...item,
      read: item.read || readIds.has(item.id),
    }));
  }, [rawNotifications, readIds]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'ALL') return notifications;
    return notifications.filter((item) => item.type === filter);
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.read).length;
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadNotificationIds(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const item of rawNotifications) {
        next.add(item.id);
      }
      saveReadNotificationIds(storageKey, next);
      return next;
    });
  }, [rawNotifications, storageKey]);

  return {
    notifications: filteredNotifications,
    allNotifications: notifications,
    unreadCount,
    isLoading,
    error,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}
