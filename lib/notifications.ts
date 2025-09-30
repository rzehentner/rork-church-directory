import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushEndpoint() {
  try {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return;
    }

    if (!Device.isDevice) {
      console.log('Push notifications not supported on simulator');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
      console.log('No authenticated user found');
      return;
    }

    const { error } = await supabase.from('notification_endpoints').upsert({
      user_id: user.id,
      provider: 'expo',
      token,
      platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' : 'android',
      is_active: true,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'provider,token' });

    if (error) {
      console.error('Error registering push endpoint:', error);
    } else {
      console.log('Push endpoint registered successfully');
    }
  } catch (error) {
    console.log('Push notification registration skipped:', error instanceof Error ? error.message : String(error));
  }
}

export async function fetchUserNotifications() {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error.message || JSON.stringify(error));
    throw new Error(error.message || 'Failed to fetch notifications');
  }

  return data || [];
}

export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function scheduleEventReminder(eventId: string, minutesBefore: number = 60, attendeesOnly: boolean = true) {
  try {
    const { data, error } = await supabase.rpc('schedule_event_reminder', {
      event_id: eventId,
      minutes_before: minutesBefore,
      attendees_only: attendeesOnly
    });

    if (error) {
      console.error('Error scheduling event reminder:', error);
    } else {
      console.log('Event reminder scheduled successfully');
    }

    return { data, error };
  } catch (error) {
    console.error('Error in scheduleEventReminder:', error);
    return { data: null, error };
  }
}