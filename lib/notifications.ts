import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/utils/validation';

let notificationHandlerSet = false;

async function ensureNotificationHandler() {
  if (notificationHandlerSet || Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerSet = true;
  } catch (e) {
    console.warn('Failed to set notification handler:', e);
  }
}

export async function registerPushEndpoint() {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    const Device = await import('expo-device');
    if (!Device.isDevice) {
      return;
    }

    await ensureNotificationHandler();
    const Notifications = await import('expo-notifications');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return;
    }

    const tokenPromise = Notifications.getExpoPushTokenAsync();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Token fetch timeout')), 10000)
    );
    
    const tokenResult = await Promise.race([tokenPromise, timeoutPromise]) as { data: string };
    const token = tokenResult.data;
    
    const user = (await supabase.auth.getUser()).data.user;
    
    if (!user) {
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

  } catch {
  }
}

export async function fetchUserNotifications() {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message || 'Failed to fetch notifications');
  }

  return data || [];
}

export async function markNotificationAsRead(id: string) {
  if (!isValidUUID(id)) return;
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    // non-critical; swallow silently
  }
}

export async function scheduleEventReminder(eventId: string, minutesBefore: number = 60, attendeesOnly: boolean = true) {
  if (!isValidUUID(eventId)) return { data: null, error: new Error('Invalid event ID') };
  try {
    const { data, error } = await supabase.rpc('schedule_event_reminder', {
      p_event_id: eventId,
      p_minutes_before: minutesBefore,
      p_attendees_only: attendeesOnly,
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}