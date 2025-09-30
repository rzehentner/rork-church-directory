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
  Crown,
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
  starts_at: string;
  location?: string;
}

interface RecentAnnouncement {
  id: string;
  title: string;
  created_at: string;
  author_name: string;
}

export default function DashboardScreen() {
  const { profile, person, family, familyMembers, isLoading } = useUser();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({
    familyMembersCount: 0,
    upcomingEventsCount: 0,
    unreadAnnouncementsCount: 0,
    totalDirectoryMembers: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<RecentAnnouncement[]>([]);


  const isPending = profile?.role === 'pending';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'leader';

  const loadDashboardData = useCallback(async () => {
    try {
      // Load stats
      const [eventsResult, announcementsResult, directoryResult] = await Promise.all([
        // Upcoming events
        supabase
          .from('events')
          .select('id, title, starts_at, location')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(3),
        
        // Recent announcements
        supabase
          .from('announcements')
          .select(`
            id,
            title,
            created_at,
            persons!announcements_author_id_fkey (
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(3),
        
        // Total directory members
        supabase
          .from('persons')
          .select('id', { count: 'exact', head: true })
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
        const formattedAnnouncements = announcementsResult.data.map(announcement => ({
          id: announcement.id,
          title: announcement.title,
          created_at: announcement.created_at,
          author_name: announcement.persons 
            ? `${(announcement.persons as any).first_name} ${(announcement.persons as any).last_name}`
            : 'Unknown Author'
        }));
        setRecentAnnouncements(formattedAnnouncements);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [familyMembers]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/family')}
            >
              <Home size={20} color="#7C3AED" />
              <Text style={styles.actionText}>My Family</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/directory')}
            >
              <Users size={20} color="#7C3AED" />
              <Text style={styles.actionText}>Directory</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/events')}
            >
              <Calendar size={20} color="#7C3AED" />
              <Text style={styles.actionText}>Events</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/admin')}
              >
                <Crown size={20} color="#F59E0B" />
                <Text style={styles.actionText}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

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
                    <Text style={styles.eventTime}>{formatDate(event.starts_at)}</Text>
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
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionText: {
    fontSize: 14,
    color: '#1F2937',
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