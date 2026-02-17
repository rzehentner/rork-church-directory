import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/hooks/me-context';
import { useToast } from '@/hooks/toast-context';
import { listAnnouncementsForMe, markAnnouncementRead, getAnnouncementTags } from '@/lib/announcements';
import { listEventsForDateRange } from '@/services/events';
import { eventImageUrl } from '@/services/event-images';
import { router } from 'expo-router';
import {
  Bell,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import TagPill from '@/components/TagPill';

type FeedItemType = 'announcement' | 'event';

interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  subtitle: string;
  timestamp: string;
  sortDate: Date;
  isRead?: boolean;
  location?: string | null;
  imagePath?: string | null;
  tags?: { id: string; name: string; color: string }[];
  raw: any;
}

type FilterTab = 'all' | 'announcements' | 'events';

export default function ActivityScreen() {
  const { myRole, profile } = useMe();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    refetch: refetchAnnouncements,
  } = useQuery({
    queryKey: ['announcements-for-me', myRole, profile?.id],
    queryFn: async () => {
      console.log('📢 Activity: Fetching announcements, myRole:', myRole);
      const data = await listAnnouncementsForMe();
      console.log('📢 Activity: Got announcements:', data?.length);
      const withTags = await Promise.all(
        (data || []).map(async (a) => {
          try {
            const tags = await getAnnouncementTags(a.id);
            return { ...a, tags };
          } catch {
            return { ...a, tags: [] };
          }
        })
      );
      return withTags.map((a) => ({
        ...a,
        author_name: a.author_name || undefined,
        tags: Array.isArray(a.tags)
          ? a.tags.map((tag: any) => ({
              id: String(tag?.id || ''),
              name: String(tag?.name || ''),
              color: String(tag?.color || '#2563EB'),
            }))
          : [],
      }));
    },
    enabled: !!profile,
    staleTime: 30 * 1000,
  });

  const {
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['activity-events', profile?.id],
    queryFn: async () => {
      console.log('📅 Activity: Fetching events');
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      console.log('📅 Activity: Date range:', startDate.toISOString(), 'to', endDate.toISOString());
      const data = await listEventsForDateRange(startDate, endDate);
      console.log('📅 Activity: Got events:', data?.length);
      return data || [];
    },
    enabled: !!profile,
    staleTime: 30 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      return await markAnnouncementRead(announcementId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-for-me'] });
      showSuccess('Marked as read');
    },
    onError: () => {
      showError('Failed to mark as read');
    },
  });

  const isLoading = announcementsLoading || eventsLoading;

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    announcements.forEach((a: any) => {
      const date = new Date(a.published_at || a.created_at);
      items.push({
        id: `ann-${a.id}`,
        type: 'announcement',
        title: a.title,
        subtitle: a.author_name ? `By ${a.author_name}` : 'Church announcement',
        timestamp: a.published_at || a.created_at,
        sortDate: date,
        isRead: a.is_read,
        tags: a.tags,
        raw: a,
      });
    });

    events.forEach((e: any) => {
      const date = new Date(e.start_at);
      items.push({
        id: `evt-${e.id}`,
        type: 'event',
        title: e.title,
        subtitle: e.description || '',
        timestamp: e.start_at,
        sortDate: date,
        location: e.location,
        imagePath: e.image_path,
        raw: e,
      });
    });

    return items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [announcements, events]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return feedItems;
    if (activeFilter === 'announcements') return feedItems.filter((i) => i.type === 'announcement');
    return feedItems.filter((i) => i.type === 'event');
  }, [feedItems, activeFilter]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchAnnouncements(), refetchEvents()]);
  }, [refetchAnnouncements, refetchEvents]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFutureEvent = (dateString: string) => new Date(dateString) > new Date();

  const renderAnnouncementItem = (item: FeedItem) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.feedCard, !item.isRead && styles.unreadCard]}
      onPress={() => router.push('/(tabs)/announcements' as any)}
      testID={`activity-announcement-${item.raw.id}`}
    >
      <View style={styles.feedCardHeader}>
        <View style={[styles.typeIndicator, { backgroundColor: '#DBEAFE' }]}>
          <Bell size={14} color="#2563EB" />
        </View>
        <View style={styles.feedCardHeaderText}>
          <Text style={styles.feedCardType}>Announcement</Text>
          <Text style={styles.feedCardTime}>{formatTimeAgo(item.timestamp)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>

      <Text style={styles.feedCardTitle}>{item.title}</Text>
      {item.subtitle ? (
        <Text style={styles.feedCardSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      ) : null}

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <TagPill
              key={tag.id}
              tag={{
                id: tag.id,
                name: tag.name,
                color: tag.color,
                self_assignable: false,
                assign_min_role: 'member' as const,
                is_active: true,
                created_at: new Date().toISOString(),
              }}
              size="small"
            />
          ))}
        </View>
      )}

      {!item.isRead && (
        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={(e) => {
            e.stopPropagation();
            markReadMutation.mutate(item.raw.id);
          }}
          disabled={markReadMutation.isPending}
        >
          <CheckCircle size={12} color="#2563EB" />
          <Text style={styles.markReadText}>Mark as read</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderEventItem = (item: FeedItem) => {
    const upcoming = isFutureEvent(item.timestamp);
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.feedCard}
        onPress={() => router.push(`/event-detail?id=${item.raw.id}` as any)}
        testID={`activity-event-${item.raw.id}`}
      >
        {item.imagePath && (
          <Image
            source={{ uri: eventImageUrl(item.imagePath)! }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.feedCardHeader}>
          <View style={[styles.typeIndicator, { backgroundColor: upcoming ? '#D1FAE5' : '#F3F4F6' }]}>
            <Calendar size={14} color={upcoming ? '#059669' : '#6B7280'} />
          </View>
          <View style={styles.feedCardHeaderText}>
            <Text style={styles.feedCardType}>{upcoming ? 'Upcoming Event' : 'Past Event'}</Text>
            <Text style={styles.feedCardTime}>{formatEventDate(item.timestamp)}</Text>
          </View>
          {upcoming && (
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingBadgeText}>Upcoming</Text>
            </View>
          )}
        </View>

        <Text style={styles.feedCardTitle}>{item.title}</Text>

        {item.location && (
          <View style={styles.metaRow}>
            <MapPin size={12} color="#6B7280" />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
        )}

        <View style={styles.eventCardFooter}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <ChevronRight size={14} color="#2563EB" />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Zap size={24} color="#2563EB" />
          <Text style={styles.headerTitle}>Activity</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </View>
    );
  }

  const announcementCount = feedItems.filter((i) => i.type === 'announcement').length;
  const eventCount = feedItems.filter((i) => i.type === 'event').length;
  const unreadCount = feedItems.filter((i) => i.type === 'announcement' && !i.isRead).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Zap size={24} color="#2563EB" />
          <Text style={styles.headerTitle}>Activity</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount} new</Text>
          </View>
        )}
      </View>

      <View style={styles.filterBar}>
        {([
          { key: 'all' as const, label: 'All', count: feedItems.length },
          { key: 'announcements' as const, label: 'Announcements', count: announcementCount },
          { key: 'events' as const, label: 'Events', count: eventCount },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.filterCount, activeFilter === tab.key && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, activeFilter === tab.key && styles.filterCountTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.feedList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="#2563EB" />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Zap size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Announcements and events will appear here'
                : activeFilter === 'announcements'
                ? 'No announcements to show'
                : 'No events to show'}
            </Text>
          </View>
        ) : (
          <View style={styles.feedContent}>
            {filteredItems.map((item) =>
              item.type === 'announcement' ? renderAnnouncementItem(item) : renderEventItem(item)
            )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#0F172A',
  },
  headerBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#2563EB',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  feedList: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 12,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  typeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedCardHeaderText: {
    flex: 1,
  },
  feedCardType: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  feedCardTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  feedCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0F172A',
    marginBottom: 4,
    lineHeight: 22,
  },
  feedCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    gap: 5,
    marginTop: 8,
  },
  markReadText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500' as const,
  },
  eventImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 12,
    marginTop: -16,
    marginHorizontal: -16,
    marginRight: -16,
    // Override the padding of feedCard for full-bleed image
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  upcomingBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#059669',
  },
  eventCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#2563EB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748B',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#64748B',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomSpacing: {
    height: 30,
  },
});
