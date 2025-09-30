import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/hooks/user-context';
import { useMe } from '@/hooks/me-context';
import { getPersonWithTags } from '@/services/tags';
import { getAnnouncementTags } from '@/lib/announcements';
import { getEventTags } from '@/services/events';

import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  Home,
  Users,
  Calendar,
  Bell,
  Heart,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  AlertCircle,
} from 'lucide-react-native';

interface DashboardStats {
  familyMembersCount: number;
  upcomingEventsCount: number;
  unreadAnnouncementsCount: number;
  totalDirectoryMembers: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_at: string;
  location?: string;
}

interface RecentAnnouncement {
  id: string;
  title: string;
  created_at: string;
  author_name: string;
}

interface TaggedAnnouncement {
  id: string;
  title: string;
  created_at: string;
  author_name: string;
  tag_names: string[];
}

interface TaggedEvent {
  id: string;
  title: string;
  start_at: string;
  location?: string;
  tag_names: string[];
}

export default function DashboardScreen() {
  const { profile, person, family, familyMembers, isLoading } = useUser();
  const { myPersonId } = useMe();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({
    familyMembersCount: 0,
    upcomingEventsCount: 0,
    unreadAnnouncementsCount: 0,
    totalDirectoryMembers: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<RecentAnnouncement[]>([]);
  const [taggedAnnouncements, setTaggedAnnouncements] = useState<TaggedAnnouncement[]>([]);
  const [isLoadingTaggedAnnouncements, setIsLoadingTaggedAnnouncements] = useState<boolean>(false);
  const [taggedEvents, setTaggedEvents] = useState<TaggedEvent[]>([]);
  const [isLoadingTaggedEvents, setIsLoadingTaggedEvents] = useState<boolean>(false);

  const isPending = profile?.role === 'pending';

  const loadTaggedEvents = useCallback(async () => {
    if (!myPersonId) {
      console.log('No person ID, skipping tagged events');
      return;
    }

    setIsLoadingTaggedEvents(true);
    try {
      console.log('🏷️ Loading tagged events for person:', myPersonId);
      
      // Get user's tags
      const personWithTags = await getPersonWithTags(myPersonId);
      const userTagNames = personWithTags.tags.map(tag => tag.name);
      
      console.log('User tags:', userTagNames);
      
      if (userTagNames.length === 0) {
        console.log('User has no tags, skipping tagged events');
        setTaggedEvents([]);
        return;
      }

      // Get all upcoming events
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_at,
          location
        `)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(10);

      if (eventsError) {
        console.error('Error fetching events:', JSON.stringify(eventsError, null, 2));
        console.error('Error details:', {
          message: eventsError.message,
          details: eventsError.details,
          hint: eventsError.hint,
          code: eventsError.code
        });
        return;
      }

      if (!allEvents || allEvents.length === 0) {
        console.log('No events found');
        setTaggedEvents([]);
        return;
      }

      // For each event, get its tags and check if any match user's tags
      const matchingEvents: TaggedEvent[] = [];
      
      for (const event of allEvents) {
        try {
          const tags = await getEventTags(event.id);
          const tagNames = tags.map((tag: any) => tag.name);
          
          // Check if any of the event's tags match user's tags
          const hasMatchingTag = tagNames.some(tagName => userTagNames.includes(tagName));
          
          if (hasMatchingTag) {
            matchingEvents.push({
              id: event.id,
              title: event.title,
              start_at: event.start_at,
              location: event.location,
              tag_names: tagNames
            });
          }
        } catch (error) {
          console.error('Error fetching tags for event:', event.id, error);
        }
      }

      console.log('Found matching events:', matchingEvents.length);
      setTaggedEvents(matchingEvents.slice(0, 3));
    } catch (error) {
      console.error('Error loading tagged events:', error);
    } finally {
      setIsLoadingTaggedEvents(false);
    }
  }, [myPersonId]);

  const loadTaggedAnnouncements = useCallback(async () => {
    if (!myPersonId) {
      console.log('No person ID, skipping tagged announcements');
      return;
    }

    setIsLoadingTaggedAnnouncements(true);
    try {
      console.log('🏷️ Loading tagged announcements for person:', myPersonId);
      
      // Get user's tags
      const personWithTags = await getPersonWithTags(myPersonId);
      const userTagNames = personWithTags.tags.map(tag => tag.name);
      
      console.log('User tags:', userTagNames);
      
      if (userTagNames.length === 0) {
        console.log('User has no tags, skipping tagged announcements');
        setTaggedAnnouncements([]);
        return;
      }

      // Get all published announcements
      const { data: allAnnouncements, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          created_at,
          created_by
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (announcementsError) {
        console.error('Error fetching announcements:', JSON.stringify(announcementsError, null, 2));
        console.error('Error details:', {
          message: announcementsError.message,
          details: announcementsError.details,
          hint: announcementsError.hint,
          code: announcementsError.code
        });
        return;
      }

      if (!allAnnouncements || allAnnouncements.length === 0) {
        console.log('No announcements found');
        setTaggedAnnouncements([]);
        return;
      }

      // For each announcement, get its tags and check if any match user's tags
      const matchingAnnouncements: TaggedAnnouncement[] = [];
      
      for (const announcement of allAnnouncements) {
        try {
          const tags = await getAnnouncementTags(announcement.id);
          const tagNames = tags.map((tag: any) => tag.name);
          
          // Check if any of the announcement's tags match user's tags
          const hasMatchingTag = tagNames.some(tagName => userTagNames.includes(tagName));
          
          if (hasMatchingTag) {
            // Get author info
            const { data: authorPerson } = await supabase
              .from('persons')
              .select('first_name, last_name')
              .eq('user_id', announcement.created_by)
              .single();
            
            matchingAnnouncements.push({
              id: announcement.id,
              title: announcement.title,
              created_at: announcement.created_at,
              author_name: authorPerson 
                ? `${authorPerson.first_name} ${authorPerson.last_name}`
                : 'Unknown Author',
              tag_names: tagNames
            });
          }
        } catch (error) {
          console.error('Error fetching tags for announcement:', announcement.id, error);
        }
      }

      console.log('Found matching announcements:', matchingAnnouncements.length);
      setTaggedAnnouncements(matchingAnnouncements.slice(0, 3));
    } catch (error) {
      console.error('Error loading tagged announcements:', error);
    } finally {
      setIsLoadingTaggedAnnouncements(false);
    }
  }, [myPersonId]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [eventsResult, announcementsResult, directoryResult] = await Promise.all([
        // Upcoming events
        supabase
          .from('events')
          .select('id, title, start_at, location')
          .gte('start_at', new Date().toISOString())
          .order('start_at', { ascending: true })
          .limit(3),
        
        // Recent announcements
        supabase
          .from('announcements')
          .select('id, title, created_at, created_by')
          .order('created_at', { ascending: false })
          .limit(3),
        
        // Total directory members
        supabase
          .from('persons')
          .select('id', { count: 'exact', head: true }),
      ]);

      // Set stats
      setStats({
        familyMembersCount: familyMembers?.length || 0,
        upcomingEventsCount: eventsResult.data?.length || 0,
        unreadAnnouncementsCount: announcementsResult.data?.length || 0,
        totalDirectoryMembers: directoryResult.count || 0,
      });

      // Set upcoming events
      if (eventsResult.data) {
        setUpcomingEvents(eventsResult.data);
      }

      // Set recent announcements
      if (announcementsResult.data) {
        const formattedAnnouncements = await Promise.all(
          announcementsResult.data.map(async (announcement) => {
            const { data: authorPerson } = await supabase
              .from('persons')
              .select('first_name, last_name')
              .eq('user_id', announcement.created_by)
              .single();
            
            return {
              id: announcement.id,
              title: announcement.title,
              created_at: announcement.created_at,
              author_name: authorPerson 
                ? `${authorPerson.first_name} ${authorPerson.last_name}`
                : 'Unknown Author'
            };
          })
        );
        setRecentAnnouncements(formattedAnnouncements);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [familyMembers]);

  useEffect(() => {
    loadDashboardData();
    loadTaggedAnnouncements();
    loadTaggedEvents();
  }, [loadDashboardData, loadTaggedAnnouncements, loadTaggedEvents]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
            </Text>
            <Text style={styles.userName}>
              {person?.first_name || 'Welcome'}
              {isPending && (
                <Text style={styles.pendingIndicator}> (Pending)</Text>
              )}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={24} color="#6B7280" />
              {stats.unreadAnnouncementsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {stats.unreadAnnouncementsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Account Banner */}
        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={20} color="#F59E0B" />
            <Text style={styles.pendingText}>
              Your account is pending approval from church leadership
            </Text>
          </View>
        )}

        {/* Profile Completion Prompt */}
        {isPending && (!person || !person.first_name || !person.last_name) && (
          <View style={styles.card}>
            <View style={styles.profilePrompt}>
              <User size={24} color="#7C3AED" />
              <View style={styles.profilePromptContent}>
                <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
                <Text style={styles.profilePromptText}>
                  Help your church family get to know you better
                </Text>
              </View>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/visitor-profile')}
              >
                <ChevronRight size={16} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(tabs)/family')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#EBF8FF' }]}>
                <Home size={20} color="#3B82F6" />
              </View>
              <Text style={styles.statNumber}>{stats.familyMembersCount}</Text>
              <Text style={styles.statLabel}>Family Members</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(tabs)/events')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
                <Calendar size={20} color="#10B981" />
              </View>
              <Text style={styles.statNumber}>{stats.upcomingEventsCount}</Text>
              <Text style={styles.statLabel}>Upcoming Events</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(tabs)/announcements')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Bell size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{stats.unreadAnnouncementsCount}</Text>
              <Text style={styles.statLabel}>Announcements</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => router.push('/(tabs)/directory')}
            >
              <View style={[styles.statIcon, { backgroundColor: '#F3E8FF' }]}>
                <Users size={20} color="#7C3AED" />
              </View>
              <Text style={styles.statNumber}>{stats.totalDirectoryMembers}</Text>
              <Text style={styles.statLabel}>Directory</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Announcements For You */}
        {taggedAnnouncements.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Announcements For You</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/announcements')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {taggedAnnouncements.map((announcement) => (
              <TouchableOpacity 
                key={announcement.id} 
                style={styles.announcementItem}
                onPress={() => {
                  router.push('/(tabs)/announcements');
                }}
              >
                <View style={styles.announcementIcon}>
                  <Bell size={16} color="#7C3AED" />
                </View>
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementMeta}>
                    By {announcement.author_name} • {formatTimeAgo(announcement.created_at)}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Events For You */}
        {taggedEvents.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Events For You</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {taggedEvents.map((event) => (
              <TouchableOpacity 
                key={event.id}
                style={styles.eventItem}
                onPress={() => router.push(`/event-detail?id=${event.id}`)}
              >
                <View style={styles.eventIcon}>
                  <Calendar size={16} color="#7C3AED" />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={styles.eventTime}>{formatDate(event.start_at)}</Text>
                  </View>
                  {event.location && (
                    <View style={styles.eventMeta}>
                      <MapPin size={12} color="#6B7280" />
                      <Text style={styles.eventLocation}>{event.location}</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingEvents.map((event) => (
              <TouchableOpacity 
                key={event.id}
                style={styles.eventItem}
                onPress={() => router.push(`/event-detail?id=${event.id}`)}
              >
                <View style={styles.eventIcon}>
                  <Calendar size={16} color="#10B981" />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={styles.eventTime}>{formatDate(event.start_at)}</Text>
                  </View>
                  {event.location && (
                    <View style={styles.eventMeta}>
                      <MapPin size={12} color="#6B7280" />
                      <Text style={styles.eventLocation}>{event.location}</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Announcements */}
        {recentAnnouncements.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Announcements</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/announcements')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentAnnouncements.map((announcement) => (
              <View key={announcement.id} style={styles.announcementItem}>
                <View style={styles.announcementIcon}>
                  <Bell size={16} color="#F59E0B" />
                </View>
                <View style={styles.announcementContent}>
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.announcementMeta}>
                    By {announcement.author_name} • {formatTimeAgo(announcement.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Family Status */}
        {!family && !isPending && (
          <View style={styles.card}>
            <View style={styles.familyPrompt}>
              <Heart size={24} color="#EC4899" />
              <View style={styles.familyPromptContent}>
                <Text style={styles.familyPromptTitle}>Join Your Family</Text>
                <Text style={styles.familyPromptText}>
                  Connect with your family members in the church community
                </Text>
              </View>
              <TouchableOpacity
                style={styles.familyButton}
                onPress={() => router.push('/(tabs)/family')}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  pendingIndicator: {
    fontSize: 16,
    color: '#F59E0B',
    fontWeight: '500' as const,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  pendingText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profilePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profilePromptContent: {
    flex: 1,
  },
  profilePromptTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  profilePromptText: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500' as const,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  announcementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  announcementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  announcementMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  familyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  familyPromptContent: {
    flex: 1,
  },
  familyPromptTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  familyPromptText: {
    fontSize: 14,
    color: '#6B7280',
  },
  familyButton: {
    backgroundColor: '#7C3AED',
    padding: 8,
    borderRadius: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});