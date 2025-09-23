import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Bell, Tag, Calendar } from 'lucide-react-native';
import { notificationStorage, NotificationPreferences } from '@/lib/notification-preferences';
import { listTags, Tag as TagType } from '@/services/tags';

interface NotificationPreferencesProps {
  onPreferencesChange?: (preferences: NotificationPreferences) => void;
}

export function NotificationPreferencesSection({ onPreferencesChange }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferencesAndTags();
  }, []);

  const loadPreferencesAndTags = async () => {
    try {
      setLoading(true);
      const [prefs, availableTags] = await Promise.all([
        notificationStorage.getNotificationPreferences(),
        listTags(true), // Only active tags
      ]);
      
      setPreferences(prefs);
      setTags(availableTags);
      
      // Initialize tag preferences for new tags
      const updatedPrefs = { ...prefs };
      let hasChanges = false;
      
      availableTags.forEach(tag => {
        if (!(tag.id in updatedPrefs.announcements.tagPreferences)) {
          updatedPrefs.announcements.tagPreferences[tag.id] = true; // Default to enabled
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        await notificationStorage.setNotificationPreferences(updatedPrefs);
        setPreferences(updatedPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences and tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAnnouncementsEnabled = async (enabled: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      announcements: {
        ...preferences.announcements,
        enabled,
      },
    };
    
    setPreferences(updated);
    await notificationStorage.setNotificationPreferences(updated);
    onPreferencesChange?.(updated);
  };

  const updateTagPreference = async (tagId: string, enabled: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      announcements: {
        ...preferences.announcements,
        tagPreferences: {
          ...preferences.announcements.tagPreferences,
          [tagId]: enabled,
        },
      },
    };
    
    setPreferences(updated);
    await notificationStorage.setNotificationPreferences(updated);
    onPreferencesChange?.(updated);
  };

  const updateEventsEnabled = async (enabled: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      events: {
        ...preferences.events,
        enabled,
      },
    };
    
    setPreferences(updated);
    await notificationStorage.setNotificationPreferences(updated);
    onPreferencesChange?.(updated);
  };

  const updateEventNotificationType = async (type: 'newEvents' | 'eventUpdates' | 'rsvpReminders' | 'eventCancellations', enabled: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      events: {
        ...preferences.events,
        [type]: enabled,
      },
    };
    
    setPreferences(updated);
    await notificationStorage.setNotificationPreferences(updated);
    onPreferencesChange?.(updated);
  };

  const updateEventTagPreference = async (tagId: string, enabled: boolean) => {
    if (!preferences) return;
    
    const updated = {
      ...preferences,
      events: {
        ...preferences.events,
        tagPreferences: {
          ...preferences.events.tagPreferences,
          [tagId]: enabled,
        },
      },
    };
    
    setPreferences(updated);
    await notificationStorage.setNotificationPreferences(updated);
    onPreferencesChange?.(updated);
  };

  if (loading || !preferences) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Announcements Toggle */}
      <View style={styles.card}>
        <View style={styles.mainToggleRow}>
          <View style={styles.toggleInfo}>
            <Bell size={20} color="#6B7280" />
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Announcement Notifications</Text>
              <Text style={styles.toggleDescription}>
                Receive notifications for new announcements
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.announcements.enabled}
            onValueChange={updateAnnouncementsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
            thumbColor={preferences.announcements.enabled ? '#7C3AED' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Tag-based Preferences */}
      {preferences.announcements.enabled && tags.length > 0 && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Tag size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Notification Preferences by Tag</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose which types of announcements you want to receive notifications for
          </Text>
          
          <ScrollView style={styles.tagsList} showsVerticalScrollIndicator={false}>
            {tags.map((tag) => (
              <View key={tag.id} style={styles.tagRow}>
                <View style={styles.tagInfo}>
                  <View style={[styles.tagColorDot, { backgroundColor: tag.color || '#6B7280' }]} />
                  <Text style={styles.tagName}>{tag.name}</Text>
                  {tag.description && (
                    <Text style={styles.tagDescription}>{tag.description}</Text>
                  )}
                </View>
                <Switch
                  value={preferences.announcements.tagPreferences[tag.id] ?? true}
                  onValueChange={(enabled) => updateTagPreference(tag.id, enabled)}
                  trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                  thumbColor={
                    (preferences.announcements.tagPreferences[tag.id] ?? true) 
                      ? '#7C3AED' 
                      : '#9CA3AF'
                  }
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {preferences.announcements.enabled && tags.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.noTagsText}>
            No announcement tags are currently available. You&apos;ll receive notifications for all announcements.
          </Text>
        </View>
      )}

      {/* Event Notifications */}
      <View style={styles.card}>
        <View style={styles.mainToggleRow}>
          <View style={styles.toggleInfo}>
            <Calendar size={20} color="#6B7280" />
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Event Notifications</Text>
              <Text style={styles.toggleDescription}>
                Receive notifications for events and RSVPs
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.events.enabled}
            onValueChange={updateEventsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
            thumbColor={preferences.events.enabled ? '#7C3AED' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Event Notification Types */}
      {preferences.events.enabled && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Event Notification Types</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose which types of event notifications you want to receive
          </Text>
          
          <View style={styles.eventTypesList}>
            <View style={styles.eventTypeRow}>
              <Text style={styles.eventTypeLabel}>New Events</Text>
              <Switch
                value={preferences.events.newEvents}
                onValueChange={(enabled) => updateEventNotificationType('newEvents', enabled)}
                trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                thumbColor={preferences.events.newEvents ? '#7C3AED' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.eventTypeRow}>
              <Text style={styles.eventTypeLabel}>Event Updates</Text>
              <Switch
                value={preferences.events.eventUpdates}
                onValueChange={(enabled) => updateEventNotificationType('eventUpdates', enabled)}
                trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                thumbColor={preferences.events.eventUpdates ? '#7C3AED' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.eventTypeRow}>
              <Text style={styles.eventTypeLabel}>RSVP Reminders</Text>
              <Switch
                value={preferences.events.rsvpReminders}
                onValueChange={(enabled) => updateEventNotificationType('rsvpReminders', enabled)}
                trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                thumbColor={preferences.events.rsvpReminders ? '#7C3AED' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.eventTypeRow}>
              <Text style={styles.eventTypeLabel}>Event Cancellations</Text>
              <Switch
                value={preferences.events.eventCancellations}
                onValueChange={(enabled) => updateEventNotificationType('eventCancellations', enabled)}
                trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                thumbColor={preferences.events.eventCancellations ? '#7C3AED' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>
      )}

      {/* Event Tag-based Preferences */}
      {preferences.events.enabled && tags.length > 0 && (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Tag size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Event Notification Preferences by Tag</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose which types of events you want to receive notifications for
          </Text>
          
          <ScrollView style={styles.tagsList} showsVerticalScrollIndicator={false}>
            {tags.map((tag) => (
              <View key={`event-${tag.id}`} style={styles.tagRow}>
                <View style={styles.tagInfo}>
                  <View style={[styles.tagColorDot, { backgroundColor: tag.color || '#6B7280' }]} />
                  <Text style={styles.tagName}>{tag.name}</Text>
                  {tag.description && (
                    <Text style={styles.tagDescription}>{tag.description}</Text>
                  )}
                </View>
                <Switch
                  value={preferences.events.tagPreferences[tag.id] ?? true}
                  onValueChange={(enabled) => updateEventTagPreference(tag.id, enabled)}
                  trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                  thumbColor={
                    (preferences.events.tagPreferences[tag.id] ?? true) 
                      ? '#7C3AED' 
                      : '#9CA3AF'
                  }
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  mainToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleContent: {
    marginLeft: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 16,
  },
  tagsList: {
    maxHeight: 300,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  tagColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tagName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500' as const,
    flex: 1,
  },
  tagDescription: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  noTagsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  eventTypesList: {
    gap: 8,
  },
  eventTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  eventTypeLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500' as const,
  },
});