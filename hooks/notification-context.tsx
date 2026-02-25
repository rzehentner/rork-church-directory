import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserNotifications, markNotificationAsRead, registerPushEndpoint } from '@/lib/notifications';
import { useAuth } from '@/hooks/auth-context';

interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data?: any;
  read_at?: string;
  created_at: string;
}

interface NotificationState {
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  refetch: () => void;
}

export const [NotificationProvider, useNotifications] = createContextHook<NotificationState>(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const {
    data: notifications = [],
    isLoading,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: fetchUserNotifications,
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1,
  });

  useEffect(() => {
  }, [queryError]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read_at).length, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!id?.trim()) return;
    
    try {
      await markNotificationAsRead(id);
      // Optimistically update the cache
      queryClient.setQueryData(['notifications', user?.id], (old: UserNotification[] = []) =>
        old.map(notification =>
          notification.id === id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch {
    }
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!user) return;

    // Register push endpoint when user is authenticated (non-blocking)
    registerPushEndpoint().catch(() => {});

    if (Platform.OS === 'web') return;

    // Set up notification listeners for native platforms
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (!notification) return;
      refetch();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (!response) return;
      // Handle notification tap
      const notificationData = response.notification.request.content.data as { id?: string } | undefined;
      if (notificationData?.id && typeof notificationData.id === 'string') {
        markAsRead(notificationData.id);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, refetch, markAsRead]);

  return useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    refetch,
  }), [notifications, unreadCount, isLoading, markAsRead, refetch]);
});