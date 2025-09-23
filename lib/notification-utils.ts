import { notificationStorage } from '@/lib/notification-preferences';
import { getAnnouncementTags } from '@/lib/announcements';
import { supabase } from '@/lib/supabase';

/**
 * Check if the user should receive a notification for a specific announcement
 * based on their notification preferences and the announcement's tags
 */
export async function shouldReceiveAnnouncementNotification(
  announcementId: string
): Promise<boolean> {
  try {
    // Get user's notification preferences
    const preferences = await notificationStorage.getNotificationPreferences();
    
    // If announcements are disabled globally, don't send notification
    if (!preferences.announcements.enabled) {
      console.log('Announcements disabled globally');
      return false;
    }
    
    // Get the announcement's tags
    const announcementTags = await getAnnouncementTags(announcementId);
    
    // If announcement has no tags, send notification (default behavior)
    if (!announcementTags || announcementTags.length === 0) {
      console.log('Announcement has no tags, sending notification');
      return true;
    }
    
    // Check if user wants notifications for any of the announcement's tags
    const shouldReceive = announcementTags.some((tag: any) => {
      const tagPreference = preferences.announcements.tagPreferences[tag.id];
      // Default to true if no preference is set for this tag
      return tagPreference !== false;
    });
    
    console.log('Should receive notification:', shouldReceive, {
      announcementId,
      tags: announcementTags.map((t: any) => ({ id: t.id, name: t.name })),
      preferences: preferences.announcements.tagPreferences,
    });
    
    return shouldReceive;
  } catch (error) {
    console.error('Error checking notification preference:', error);
    // Default to true on error to ensure important notifications aren't missed
    return true;
  }
}

/**
 * Get a summary of the user's notification preferences for display
 */
export async function getNotificationPreferencesSummary(): Promise<{
  announcementsEnabled: boolean;
  enabledTagsCount: number;
  totalTagsCount: number;
  disabledTags: string[];
}> {
  try {
    const preferences = await notificationStorage.getNotificationPreferences();
    const tagPreferences = preferences.announcements.tagPreferences;
    
    const enabledTags = Object.entries(tagPreferences).filter(([_, enabled]) => enabled);
    const disabledTags = Object.entries(tagPreferences)
      .filter(([_, enabled]) => !enabled)
      .map(([tagId]) => tagId);
    
    return {
      announcementsEnabled: preferences.announcements.enabled,
      enabledTagsCount: enabledTags.length,
      totalTagsCount: Object.keys(tagPreferences).length,
      disabledTags,
    };
  } catch (error) {
    console.error('Error getting notification preferences summary:', error);
    return {
      announcementsEnabled: true,
      enabledTagsCount: 0,
      totalTagsCount: 0,
      disabledTags: [],
    };
  }
}

/**
 * Check if the user should receive a notification for a specific event
 * based on their notification preferences and the event's tags
 */
export async function shouldReceiveEventNotification(
  eventId: string,
  notificationType: 'newEvents' | 'eventUpdates' | 'rsvpReminders' | 'eventCancellations'
): Promise<boolean> {
  try {
    // Get user's notification preferences
    const preferences = await notificationStorage.getNotificationPreferences();
    
    // If events are disabled globally, don't send notification
    if (!preferences.events.enabled) {
      console.log('Events disabled globally');
      return false;
    }
    
    // Check if this specific notification type is enabled
    if (!preferences.events[notificationType]) {
      console.log(`Event notification type ${notificationType} disabled`);
      return false;
    }
    
    // Get the event's tags
    const { data: eventTags } = await supabase
      .from('event_tags')
      .select(`
        tag_id,
        tags!inner(
          id,
          name,
          color
        )
      `)
      .eq('event_id', eventId);
    
    // If event has no tags, send notification (default behavior)
    if (!eventTags || eventTags.length === 0) {
      console.log('Event has no tags, sending notification');
      return true;
    }
    
    // Check if user wants notifications for any of the event's tags
    const shouldReceive = eventTags.some((eventTag: any) => {
      const tagPreference = preferences.events.tagPreferences[eventTag.tag_id];
      // Default to true if no preference is set for this tag
      return tagPreference !== false;
    });
    
    console.log('Should receive event notification:', shouldReceive, {
      eventId,
      notificationType,
      tags: eventTags.map((et: any) => ({ id: et.tag_id, name: et.tags.name })),
      preferences: preferences.events.tagPreferences,
    });
    
    return shouldReceive;
  } catch (error) {
    console.error('Error checking event notification preference:', error);
    // Default to true on error to ensure important notifications aren't missed
    return true;
  }
}

/**
 * Get a summary of the user's event notification preferences for display
 */
export async function getEventNotificationPreferencesSummary(): Promise<{
  eventsEnabled: boolean;
  newEventsEnabled: boolean;
  eventUpdatesEnabled: boolean;
  rsvpRemindersEnabled: boolean;
  eventCancellationsEnabled: boolean;
  enabledTagsCount: number;
  totalTagsCount: number;
  disabledTags: string[];
}> {
  try {
    const preferences = await notificationStorage.getNotificationPreferences();
    const tagPreferences = preferences.events.tagPreferences;
    
    const enabledTags = Object.entries(tagPreferences).filter(([_, enabled]) => enabled);
    const disabledTags = Object.entries(tagPreferences)
      .filter(([_, enabled]) => !enabled)
      .map(([tagId]) => tagId);
    
    return {
      eventsEnabled: preferences.events.enabled,
      newEventsEnabled: preferences.events.newEvents,
      eventUpdatesEnabled: preferences.events.eventUpdates,
      rsvpRemindersEnabled: preferences.events.rsvpReminders,
      eventCancellationsEnabled: preferences.events.eventCancellations,
      enabledTagsCount: enabledTags.length,
      totalTagsCount: Object.keys(tagPreferences).length,
      disabledTags,
    };
  } catch (error) {
    console.error('Error getting event notification preferences summary:', error);
    return {
      eventsEnabled: true,
      newEventsEnabled: true,
      eventUpdatesEnabled: true,
      rsvpRemindersEnabled: true,
      eventCancellationsEnabled: true,
      enabledTagsCount: 0,
      totalTagsCount: 0,
      disabledTags: [],
    };
  }
}