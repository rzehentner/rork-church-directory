import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_PREFERENCES_KEY = 'notification_preferences';

export interface NotificationPreferences {
  announcements: {
    enabled: boolean;
    tagPreferences: Record<string, boolean>; // tagId -> enabled
  };
  events: {
    enabled: boolean;
    newEvents: boolean;
    eventUpdates: boolean;
    rsvpReminders: boolean;
    eventCancellations: boolean;
    tagPreferences: Record<string, boolean>; // tagId -> enabled
  };
  general: {
    enabled: boolean;
  };
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  announcements: {
    enabled: true,
    tagPreferences: {},
  },
  events: {
    enabled: true,
    newEvents: true,
    eventUpdates: true,
    rsvpReminders: true,
    eventCancellations: true,
    tagPreferences: {},
  },
  general: {
    enabled: true,
  },
};

export const notificationStorage = {
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const value = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
      if (value) {
        const stored = JSON.parse(value);
        // Merge with defaults to ensure all properties exist
        return {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...stored,
          announcements: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.announcements,
            ...stored.announcements,
          },
          events: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.events,
            ...stored.events,
          },
          general: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.general,
            ...stored.general,
          },
        };
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  },

  async setNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error setting notification preferences:', error);
    }
  },

  async updateAnnouncementTagPreference(tagId: string, enabled: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      preferences.announcements.tagPreferences[tagId] = enabled;
      await this.setNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error updating announcement tag preference:', error);
    }
  },

  async updateAnnouncementsEnabled(enabled: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      preferences.announcements.enabled = enabled;
      await this.setNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error updating announcements enabled:', error);
    }
  },

  async updateGeneralNotificationsEnabled(enabled: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      preferences.general.enabled = enabled;
      await this.setNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error updating general notifications enabled:', error);
    }
  },

  async updateEventsEnabled(enabled: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      preferences.events.enabled = enabled;
      await this.setNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error updating events enabled:', error);
    }
  },

  async updateEventNotificationType(type: keyof NotificationPreferences['events'], enabled: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      if (type !== 'tagPreferences') {
        (preferences.events as any)[type] = enabled;
        await this.setNotificationPreferences(preferences);
      }
    } catch (error) {
      console.error('Error updating event notification type:', error);
    }
  },

  async updateEventTagPreference(tagId: string, enabled: boolean): Promise<void> {
    try {
      const preferences = await this.getNotificationPreferences();
      preferences.events.tagPreferences[tagId] = enabled;
      await this.setNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error updating event tag preference:', error);
    }
  },
};