import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
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
  Shield,
  ClipboardList,
  Zap,
  BookOpen,
} from 'lucide-react-native';
import TagPill from '@/components/TagPill';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

interface DashboardStats {
  familyMembersCount: number;
  upcomingEventsCount: number;
  unreadAnnouncementsCount: number;
  totalDirectoryMembers: number;
  activePrayersCount: number;
  openFormsCount: number;
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

interface SimpleTag {
  id: string;
  name: string;
  color: string | null;
}

interface TaggedAnnouncement {
  id: string;
  title: string;
  created_at: string;
  author_name: string;
  tag_names: string[];
  matching_tags: SimpleTag[];
}

interface TaggedEvent {
  id: string;
  title: string;
  start_at: string;
  location?: string;
  tag_names: string[];
  matching_tags: SimpleTag[];
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  color: string;
  bgColor: string;
  count?: number;
}

export default function DashboardScreen() {
  const { profile, person, family, familyMembers, isLoading } = useUser();
  const { myPersonId, myRole } = useMe();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({
    familyMembersCount: 0,
    upcomingEventsCount: 0,
    unreadAnnouncementsCount: 0,
    totalDirectoryMembers: 0,
    activePrayersCount: 0,
    openFormsCount: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<RecentAnnouncement[]>([]);
  const [taggedAnnouncements, setTaggedAnnouncements] = useState<TaggedAnnouncement[]>([]);
  const [taggedEvents, setTaggedEvents] = useState<TaggedEvent[]>([]);

  const isPending = profile?.role === 'pending';
  const isAdmin = myRole === 'admin' || myRole === 'leader';

  const loadTaggedEvents = useCallback(async () => {
    if (!myPersonId) return;
    try {
      console.log('🏷️ Loading tagged events for person:', myPersonId);
      const personWithTags = await getPersonWithTags(myPersonId);
      const userTags = personWithTags.tags;
      const userTagNames = userTags.map(tag => tag.name);
      if (userTagNames.length === 0) { setTaggedEvents([]); return; }

      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_at, location')
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(10);

      if (eventsError || !allEvents || allEvents.length === 0) { setTaggedEvents([]); return; }

      const matchingEvents: TaggedEvent[] = [];
      for (const event of allEvents) {
        try {
          const tags = await getEventTags(event.id);
          const matchingTags = tags.filter((tag: any) => userTagNames.includes(tag.name));
          if (matchingTags.length > 0) {
            matchingEvents.push({
              id: event.id, title: event.title, start_at: event.start_at, location: event.location,
              tag_names: tags.map((t: any) => t.name),
              matching_tags: matchingTags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
            });
          }
        } catch (error) { console.error('Error fetching tags for event:', event.id, error); }
      }
      setTaggedEvents(matchingEvents.slice(0, 3));
    } catch (error) { console.error('Error loading tagged events:', error); }
  }, [myPersonId]);

  const loadTaggedAnnouncements = useCallback(async () => {
    if (!myPersonId) return;
    try {
      console.log('🏷️ Loading tagged announcements for person:', myPersonId);
      const personWithTags = await getPersonWithTags(myPersonId);
      const userTags = personWithTags.tags;
      const userTagNames = userTags.map(tag => tag.name);
      if (userTagNames.length === 0) { setTaggedAnnouncements([]); return; }

      const { data: allAnnouncements, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, title, created_at, created_by')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (announcementsError || !allAnnouncements || allAnnouncements.length === 0) { setTaggedAnnouncements([]); return; }

      const matchingAnnouncements: TaggedAnnouncement[] = [];
      for (const announcement of allAnnouncements) {
        try {
          const tags = await getAnnouncementTags(announcement.id);
          const matchingTags = tags.filter((tag: any) => userTagNames.includes(tag.name));
          if (matchingTags.length > 0) {
            const { data: authorPerson } = await supabase
              .from('persons').select('first_name, last_name').eq('user_id', announcement.created_by).single();
            matchingAnnouncements.push({
              id: announcement.id, title: announcement.title, created_at: announcement.created_at,
              author_name: authorPerson ? `${authorPerson.first_name} ${authorPerson.last_name}` : 'Unknown',
              tag_names: tags.map((t: any) => t.name),
              matching_tags: matchingTags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
            });
          }
        } catch (error) { console.error('Error fetching tags for announcement:', announcement.id, error); }
      }
      setTaggedAnnouncements(matchingAnnouncements.slice(0, 3));
    } catch (error) { console.error('Error loading tagged announcements:', error); }
  }, [myPersonId]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [eventsResult, announcementsResult, directoryResult, prayersResult, formsResult] = await Promise.all([
        supabase.from('events').select('id, title, start_at, location')
          .gte('start_at', new Date().toISOString()).order('start_at', { ascending: true }).limit(3),
        supabase.from('announcements').select('id, title, created_at, created_by')
          .order('created_at', { ascending: false }).limit(3),
        supabase.from('persons').select('id', { count: 'exact', head: true }),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('signup_form_summary').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      setStats({
        familyMembersCount: familyMembers?.length || 0,
        upcomingEventsCount: eventsResult.data?.length || 0,
        unreadAnnouncementsCount: announcementsResult.data?.length || 0,
        totalDirectoryMembers: directoryResult.count || 0,
        activePrayersCount: prayersResult.count || 0,
        openFormsCount: formsResult.count || 0,
      });

      if (eventsResult.data) setUpcomingEvents(eventsResult.data);

      if (announcementsResult.data) {
        const formatted = await Promise.all(
          announcementsResult.data.map(async (a) => {
            const { data: authorPerson } = await supabase
              .from('persons').select('first_name, last_name').eq('user_id', a.created_by).single();
            return {
              id: a.id, title: a.title, created_at: a.created_at,
              author_name: authorPerson ? `${authorPerson.first_name} ${authorPerson.last_name}` : 'Unknown',
            };
          })
        );
        setRecentAnnouncements(formatted);
      }
    } catch (error) { console.error('Error loading dashboard data:', error); }
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
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (dateString: string) => {
    const diffInHours = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const quickActions: QuickAction[] = [
    { id: 'events', label: 'Events', icon: <Calendar size={22} color="#059669" />, route: '/(tabs)/events', color: '#059669', bgColor: '#ECFDF5', count: stats.upcomingEventsCount },
    { id: 'announcements', label: 'Announcements', icon: <Bell size={22} color="#D97706" />, route: '/(tabs)/announcements', color: '#D97706', bgColor: '#FFFBEB', count: stats.unreadAnnouncementsCount },
    { id: 'prayers', label: 'Prayers', icon: <Heart size={22} color="#DC2626" />, route: '/(tabs)/prayers', color: '#DC2626', bgColor: '#FEF2F2', count: stats.activePrayersCount },
    { id: 'forms', label: 'Sign Ups', icon: <ClipboardList size={22} color="#7C3AED" />, route: '/(tabs)/forms', color: '#7C3AED', bgColor: '#F5F3FF', count: stats.openFormsCount },
    { id: 'family', label: 'My Family', icon: <Home size={22} color="#1C2E4A" />, route: '/(tabs)/family', color: '#1C2E4A', bgColor: '#E8EDF4', count: stats.familyMembersCount },
    { id: 'directory', label: 'Directory', icon: <Users size={22} color="#0891B2" />, route: '/(tabs)/directory', color: '#0891B2', bgColor: '#ECFEFF', count: stats.totalDirectoryMembers },
  ];

  if (isAdmin) {
    quickActions.push({
      id: 'admin', label: 'Admin', icon: <Shield size={22} color="#E11D48" />, route: '/(tabs)/admin', color: '#E11D48', bgColor: '#FFF1F2',
    });
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1C2E4A" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
            </Text>
            <Text style={styles.userName}>
              {person?.first_name || 'Welcome'}
              {isPending && <Text style={styles.pendingTag}> · Pending</Text>}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/notifications' as any)}
            testID="notifications-button"
          >
            <Bell size={22} color="#475569" />
            {stats.unreadAnnouncementsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{stats.unreadAnnouncementsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={18} color="#D97706" />
            <Text style={styles.pendingBannerText}>Your account is pending approval from church leadership</Text>
          </View>
        )}

        {isPending && (!person || !person.first_name || !person.last_name) && (
          <TouchableOpacity style={styles.profilePromptCard} onPress={() => router.push('/visitor-profile' as any)}>
            <View style={styles.profilePromptIcon}>
              <User size={20} color="#1C2E4A" />
            </View>
            <View style={styles.profilePromptContent}>
              <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
              <Text style={styles.profilePromptText}>Help your church family get to know you</Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>Quick Access</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => router.push(action.route as any)}
                testID={`hub-${action.id}`}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                  {action.icon}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
                {action.count !== undefined && action.count > 0 && (
                  <Text style={[styles.quickActionCount, { color: action.color }]}>{action.count}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {taggedAnnouncements.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>For You</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/announcements' as any)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {taggedAnnouncements.map((announcement) => (
              <TouchableOpacity
                key={announcement.id}
                style={styles.feedItem}
                onPress={() => router.push('/(tabs)/announcements' as any)}
              >
                <View style={[styles.feedItemIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Bell size={16} color="#D97706" />
                </View>
                <View style={styles.feedItemContent}>
                  <Text style={styles.feedItemTitle} numberOfLines={1}>{announcement.title}</Text>
                  <Text style={styles.feedItemMeta}>
                    {announcement.author_name} · {formatTimeAgo(announcement.created_at)}
                  </Text>
                  {announcement.matching_tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {announcement.matching_tags.map((tag) => (
                        <TagPill key={tag.id} tag={tag as any} size="small" />
                      ))}
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {taggedEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Events For You</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events' as any)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {taggedEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.feedItem}
                onPress={() => router.push(`/event-detail?id=${event.id}` as any)}
              >
                <View style={[styles.feedItemIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Calendar size={16} color="#059669" />
                </View>
                <View style={styles.feedItemContent}>
                  <Text style={styles.feedItemTitle} numberOfLines={1}>{event.title}</Text>
                  <View style={styles.feedItemMetaRow}>
                    <Clock size={11} color="#94A3B8" />
                    <Text style={styles.feedItemMeta}>{formatDate(event.start_at)}</Text>
                  </View>
                  {event.location && (
                    <View style={styles.feedItemMetaRow}>
                      <MapPin size={11} color="#94A3B8" />
                      <Text style={styles.feedItemMeta}>{event.location}</Text>
                    </View>
                  )}
                  {event.matching_tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {event.matching_tags.map((tag) => (
                        <TagPill key={tag.id} tag={tag as any} size="small" />
                      ))}
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {upcomingEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events' as any)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.feedItem}
                onPress={() => router.push(`/event-detail?id=${event.id}` as any)}
              >
                <View style={[styles.feedItemIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Calendar size={16} color="#059669" />
                </View>
                <View style={styles.feedItemContent}>
                  <Text style={styles.feedItemTitle} numberOfLines={1}>{event.title}</Text>
                  <View style={styles.feedItemMetaRow}>
                    <Clock size={11} color="#94A3B8" />
                    <Text style={styles.feedItemMeta}>{formatDate(event.start_at)}</Text>
                  </View>
                  {event.location && (
                    <View style={styles.feedItemMetaRow}>
                      <MapPin size={11} color="#94A3B8" />
                      <Text style={styles.feedItemMeta}>{event.location}</Text>
                    </View>
                  )}
                </View>
                <ChevronRight size={16} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {recentAnnouncements.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Latest Announcements</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/announcements' as any)}>
                <Text style={styles.seeAllLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentAnnouncements.map((announcement) => (
              <TouchableOpacity
                key={announcement.id}
                style={styles.feedItem}
                onPress={() => router.push('/(tabs)/announcements' as any)}
              >
                <View style={[styles.feedItemIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Bell size={16} color="#D97706" />
                </View>
                <View style={styles.feedItemContent}>
                  <Text style={styles.feedItemTitle} numberOfLines={1}>{announcement.title}</Text>
                  <Text style={styles.feedItemMeta}>
                    {announcement.author_name} · {formatTimeAgo(announcement.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!family && !isPending && (
          <View style={styles.sectionContainer}>
            <TouchableOpacity style={styles.joinFamilyCard} onPress={() => router.push('/(tabs)/family' as any)}>
              <Heart size={24} color="#EC4899" />
              <View style={styles.joinFamilyContent}>
                <Text style={styles.joinFamilyTitle}>Join Your Family</Text>
                <Text style={styles.joinFamilyText}>Connect with your family in the church community</Text>
              </View>
              <View style={styles.joinFamilyBtn}>
                <Plus size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  heroContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  pendingTag: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500' as const,
  },
  notificationBtn: {
    position: 'relative' as const,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  pendingBannerText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
    lineHeight: 18,
  },
  profilePromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 12,
  },
  profilePromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePromptContent: {
    flex: 1,
  },
  profilePromptTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  profilePromptText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1C2E4A',
    marginBottom: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  quickActionCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  quickActionCount: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  feedItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedItemContent: {
    flex: 1,
  },
  feedItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 3,
  },
  feedItemMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  feedItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  joinFamilyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCE7F3',
    gap: 12,
  },
  joinFamilyContent: {
    flex: 1,
  },
  joinFamilyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#0F172A',
  },
  joinFamilyText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  joinFamilyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: 30,
  },
});
