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
    if (queryError) {
      console.error('Error fetching notifications:', queryError instanceof Error ? queryError.message : String(queryError));
    }
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
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!user) return;

    // Register push endpoint when user is authenticated (non-blocking)
    registerPushEndpoint().catch(error => {
      console.log('Error in registerPushEndpoint:', error instanceof Error ? error.message : String(error));
    });

    if (Platform.OS === 'web') return;

    // Set up notification listeners for native platforms
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      if (!notification) return;
      console.log('Notification received:', notification);
      // Refetch notifications when a new one is received
      queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      if (!response) return;
      console.log('Notification response:', response);
      // Handle notification tap
      const notificationData = response.notification.request.content.data as { id?: string } | undefined;
      if (notificationData?.id && typeof notificationData.id === 'string') {
        markAsRead(notificationData.id);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user, queryClient, markAsRead]);

  return useMemo(() => ({
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    refetch,
  }), [notifications, unreadCount, isLoading, markAsRead, refetch]);
});