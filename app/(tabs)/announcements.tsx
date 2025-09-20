import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/hooks/me-context';
import { useToast } from '@/hooks/toast-context';
import { listAnnouncementsForMe, markAnnouncementRead, getAnnouncementTags } from '@/lib/announcements';
import { listTags, getPersonWithTags } from '@/services/tags';
import TagPill from '@/components/TagPill';
import { 
  Bell, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Globe,
  Search,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';

interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string;
  expires_at: string | null;
  created_by: string;
  is_read: boolean;
  is_public: boolean;
  author_name?: string;
  role_tags?: string[];
  person_tags?: string[];
  tags?: { id: string; name: string; color: string }[];
}

interface AnnouncementGroup {
  title: string;
  announcements: Announcement[];
  color?: string;
  isUserTag?: boolean;
}

export default function AnnouncementsScreen() {
  const { myRole, profile, person } = useMe();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const insets = useSafeAreaInsets();
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const isPulling = useRef(false);

  const isAdminOrLeader = myRole === 'admin' || myRole === 'leader';

  // Fetch announcements for the current user
  const {
    data: announcements = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['announcements-for-me', myRole, profile],
    queryFn: async () => {
      try {
        console.log('📢 Fetching announcements for me');
        console.log('👤 Current user role:', myRole);
        console.log('👤 Current profile:', profile);
        const data = await listAnnouncementsForMe();
        
        // Fetch tags for each announcement
        const announcementsWithTags = await Promise.all(
          (data || []).map(async (announcement) => {
            try {
              const tags = await getAnnouncementTags(announcement.id);
              return { ...announcement, tags };
            } catch (fetchError) {
              console.warn('Failed to fetch tags for announcement:', announcement.id, fetchError);
              return { ...announcement, tags: [] };
            }
          })
        );
        
        console.log('✅ Announcements with tags fetched:', announcementsWithTags?.length || 0);
        return announcementsWithTags.map(announcement => ({
          ...announcement,
          author_name: announcement.author_name || undefined,
          tags: Array.isArray(announcement.tags) ? announcement.tags.map((tag: any) => ({
            id: String(tag?.id || ''),
            name: String(tag?.name || ''),
            color: String(tag?.color || '#7C3AED')
          })) : []
        })) as Announcement[];
      } catch (error) {
        console.error('❌ Error in announcements query:', error);
        throw error;
      }
    },
    enabled: !!myRole,
    staleTime: 30 * 1000,
  });
  
  // Fetch available tags for filtering
  const { data: availableTags = [] } = useQuery({
    queryKey: ['tags', 'active'],
    queryFn: () => listTags(true),
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch user's tags to prioritize groups
  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags', person?.id],
    queryFn: async () => {
      if (!person?.id) return [];
      try {
        const personWithTags = await getPersonWithTags(person.id);
        return personWithTags.tags || [];
      } catch (fetchError) {
        console.warn('Failed to fetch user tags:', fetchError);
        return [];
      }
    },
    enabled: !!person?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Mark announcement as read
  const markReadMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      console.log('📖 Marking announcement as read:', announcementId);
      const result = await markAnnouncementRead(announcementId);
      console.log('✅ Announcement marked as read:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch announcements to get updated read status
      queryClient.invalidateQueries({ queryKey: ['announcements-for-me'] });
      showSuccess('Marked as read');
    },
    onError: (error) => {
      console.error('❌ Failed to mark as read:', error);
      showError('Failed to mark as read');
    },
  });



  // Group and filter announcements
  const groupedAnnouncements = useMemo(() => {
    let filteredAnnouncements = announcements;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredAnnouncements = filteredAnnouncements.filter(announcement => 
        announcement.title.toLowerCase().includes(query) ||
        announcement.body?.toLowerCase().includes(query) ||
        announcement.tags?.some(tag => tag.name.toLowerCase().includes(query))
      );
    }
    
    // Apply tag filter
    if (selectedTagFilter) {
      filteredAnnouncements = filteredAnnouncements.filter(announcement => 
        announcement.tags?.some(tag => tag.id === selectedTagFilter)
      );
    }
    
    // Apply unread filter
    if (showUnreadOnly) {
      filteredAnnouncements = filteredAnnouncements.filter(announcement => 
        !announcement.is_read
      );
    }
    
    // Group announcements by tags
    const groups: AnnouncementGroup[] = [];
    const processedAnnouncements = new Set<string>();
    const userTagIds = new Set(userTags.map(tag => tag.id));
    
    // 1. No tags group (announcements without tags)
    const noTagsAnnouncements = filteredAnnouncements.filter(announcement => 
      !announcement.tags || announcement.tags.length === 0
    );
    if (noTagsAnnouncements.length > 0) {
      groups.push({
        title: 'General Announcements',
        announcements: noTagsAnnouncements,
        color: '#6B7280'
      });
      noTagsAnnouncements.forEach(a => processedAnnouncements.add(a.id));
    }
    
    // 2. User's tags groups (prioritized)
    userTags.forEach(userTag => {
      const tagAnnouncements = filteredAnnouncements.filter(announcement => 
        !processedAnnouncements.has(announcement.id) &&
        announcement.tags?.some(tag => tag.id === userTag.id)
      );
      
      if (tagAnnouncements.length > 0) {
        groups.push({
          title: userTag.name,
          announcements: tagAnnouncements,
          color: userTag.color || '#7C3AED',
          isUserTag: true
        });
        tagAnnouncements.forEach(a => processedAnnouncements.add(a.id));
      }
    });
    
    // 3. Other tags groups
    const otherTags = availableTags.filter(tag => !userTagIds.has(tag.id));
    otherTags.forEach(tag => {
      const tagAnnouncements = filteredAnnouncements.filter(announcement => 
        !processedAnnouncements.has(announcement.id) &&
        announcement.tags?.some(announcementTag => announcementTag.id === tag.id)
      );
      
      if (tagAnnouncements.length > 0) {
        groups.push({
          title: tag.name,
          announcements: tagAnnouncements,
          color: tag.color || '#7C3AED',
          isUserTag: false
        });
        tagAnnouncements.forEach(a => processedAnnouncements.add(a.id));
      }
    });
    
    return groups;
  }, [announcements, searchQuery, selectedTagFilter, showUnreadOnly, userTags, availableTags]);

  const handleMarkAsRead = (announcementId: string) => {
    if (markReadMutation.isPending) return;
    markReadMutation.mutate(announcementId);
  };

  const handleCreateAnnouncement = () => {
    router.push('/create-announcement');
  };
  
  const clearSearch = () => {
    setSearchQuery('');
  };
  
  const clearTagFilter = () => {
    setSelectedTagFilter(null);
  };
  
  const toggleUnreadFilter = () => {
    setShowUnreadOnly(!showUnreadOnly);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      await queryClient.invalidateQueries({ queryKey: ['user-tags'] });
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
      Animated.timing(pullDistance, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return gestureState.dy > 0 && !isPulling.current;
    },
    onPanResponderGrant: () => {
      isPulling.current = true;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0 && gestureState.dy < 100) {
        pullDistance.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      isPulling.current = false;
      if (gestureState.dy > 60) {
        handleRefresh();
      } else {
        Animated.timing(pullDistance, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    console.error('❌ Error fetching announcements:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'object' && error !== null 
        ? JSON.stringify(error, null, 2) 
        : 'Unknown error occurred';
        
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load announcements</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderAnnouncementCard = (announcement: Announcement, groupColor?: string) => {
    const expired = isExpired(announcement.expires_at);
    const primaryColor = groupColor || announcement.tags?.[0]?.color || '#7C3AED';
    
    return (
      <View
        key={announcement.id}
        style={[
          styles.announcementCard,
          !announcement.is_read && styles.unreadCard,
          expired && styles.expiredCard
        ]}
      >
        {/* Color strip on the left */}
        <View style={[styles.colorStrip, { backgroundColor: primaryColor }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.announcementHeader}>
            <View style={styles.announcementMeta}>
              <Text style={styles.announcementTitle}>
                {announcement.title}
              </Text>
              <View style={styles.metaRow}>
                <Calendar size={12} color="#6B7280" />
                <Text style={styles.metaText}>
                  {formatDate(announcement.published_at)}
                </Text>
                {announcement.author_name && (
                  <>
                    <Text style={styles.metaSeparator}>•</Text>
                    <Text style={styles.metaText}>
                      {announcement.author_name}
                    </Text>
                  </>
                )}
              </View>
            </View>
            
            <View style={styles.statusIndicators}>
              {announcement.is_public && (
                <View style={styles.publicBadge}>
                  <Globe size={10} color="#10B981" />
                </View>
              )}
              {!announcement.is_read && (
                <View style={styles.unreadDot} />
              )}
              {expired && (
                <View style={styles.expiredBadge}>
                  <Clock size={10} color="#9CA3AF" />
                </View>
              )}
            </View>
          </View>

          <Text style={styles.announcementBody}>
            {announcement.body}
          </Text>

          {announcement.tags && announcement.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {announcement.tags.map(tag => (
                <TagPill
                  key={tag.id}
                  tag={{
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                    self_assignable: false,
                    assign_min_role: 'member' as const,
                    is_active: true,
                    created_at: new Date().toISOString()
                  }}
                  size="small"
                  testId={`announcement-tag-${tag.id}`}
                />
              ))}
            </View>
          )}

          {announcement.expires_at && (
            <View style={styles.expiryContainer}>
              <Clock size={12} color={expired ? '#EF4444' : '#F59E0B'} />
              <Text style={[styles.expiryText, expired && styles.expiredText]}>
                {expired ? 'Expired' : 'Expires'} {formatDate(announcement.expires_at)}
              </Text>
            </View>
          )}

          {!announcement.is_read && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => handleMarkAsRead(announcement.id)}
              disabled={markReadMutation.isPending}
            >
              {markReadMutation.isPending ? (
                <ActivityIndicator size={14} color="#7C3AED" />
              ) : (
                <CheckCircle size={14} color="#7C3AED" />
              )}
              <Text style={styles.markReadButtonText}>Mark as read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={28} color="#7C3AED" />
          <Text style={styles.title}>Announcements</Text>
        </View>
        {isAdminOrLeader && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateAnnouncement}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search announcements..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.unreadFilterButton,
            showUnreadOnly && styles.unreadFilterButtonActive
          ]}
          onPress={toggleUnreadFilter}
        >
          <Bell size={16} color={showUnreadOnly ? '#FFFFFF' : '#7C3AED'} />
          <Text style={[
            styles.unreadFilterText,
            showUnreadOnly && styles.unreadFilterTextActive
          ]}>Unread</Text>
        </TouchableOpacity>
      </View>
      
      {/* Filter Tags - Always Visible */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagFilters}>
          <TouchableOpacity
            style={[
              styles.tagFilterButton,
              !selectedTagFilter && styles.tagFilterButtonActive
            ]}
            onPress={clearTagFilter}
          >
            <Text style={[
              styles.tagFilterText,
              !selectedTagFilter && styles.tagFilterTextActive
            ]}>All</Text>
          </TouchableOpacity>
          {availableTags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagFilterButton,
                selectedTagFilter === tag.id && styles.tagFilterButtonActive,
                { borderColor: tag.color || '#7C3AED' }
              ]}
              onPress={() => setSelectedTagFilter(selectedTagFilter === tag.id ? null : tag.id)}
            >
              <Text style={[
                styles.tagFilterText,
                selectedTagFilter === tag.id && styles.tagFilterTextActive
              ]}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.scrollContainer} {...panResponder.panHandlers}>
        <Animated.View style={[styles.pullToRefreshIndicator, {
          height: pullDistance,
          opacity: pullDistance.interpolate({
            inputRange: [0, 60],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        }]}>
          <View style={styles.refreshIndicatorContent}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <Text style={styles.pullToRefreshText}>Pull to refresh</Text>
            )}
          </View>
        </Animated.View>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
        {groupedAnnouncements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedTagFilter ? 'No matching announcements' : 'No announcements'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedTagFilter 
                ? 'Try adjusting your search or filters'
                : isAdminOrLeader 
                  ? 'Create your first announcement to get started'
                  : 'Check back later for updates from your community'
              }
            </Text>
            {isAdminOrLeader && !searchQuery && !selectedTagFilter && (
              <TouchableOpacity
                style={styles.emptyCreateButton}
                onPress={handleCreateAnnouncement}
              >
                <Plus size={16} color="#7C3AED" />
                <Text style={styles.emptyCreateButtonText}>Create Announcement</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.announcementsContainer}>
            {groupedAnnouncements.map((group, groupIndex) => (
              <View key={`group-${groupIndex}`} style={styles.groupContainer}>
                <View style={styles.groupHeader}>
                  <View style={[styles.groupColorDot, { backgroundColor: group.color }]} />
                  <Text style={[
                    styles.groupTitle,
                    group.isUserTag && styles.userGroupTitle
                  ]}>
                    {group.title}
                  </Text>
                  <Text style={styles.groupCount}>({group.announcements.length})</Text>
                  {group.isUserTag && (
                    <View style={styles.userBadge}>
                      <Text style={styles.userBadgeText}>Your Tag</Text>
                    </View>
                  )}
                </View>
                
                {group.announcements.map((announcement) => 
                  renderAnnouncementCard(announcement, group.color)
                )}
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </View>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1F2937',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  pullToRefreshIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  refreshIndicatorContent: {
    paddingVertical: 10,
  },
  pullToRefreshText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  emptyCreateButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  announcementsContainer: {
    padding: 20,
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  unreadFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#7C3AED',
    gap: 6,
  },
  unreadFilterButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  unreadFilterText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500' as const,
  },
  unreadFilterTextActive: {
    color: '#FFFFFF',
  },

  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  tagFilters: {
    paddingHorizontal: 20,
  },
  tagFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  tagFilterButtonActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  tagFilterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  tagFilterTextActive: {
    color: '#7C3AED',
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  groupColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  userGroupTitle: {
    color: '#7C3AED',
  },
  groupCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  userBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  userBadgeText: {
    fontSize: 10,
    color: '#7C3AED',
    fontWeight: '600' as const,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  colorStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  unreadCard: {
    shadowOpacity: 0.1,
    elevation: 4,
  },
  expiredCard: {
    opacity: 0.7,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  announcementMeta: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  expiredBadge: {
    padding: 2,
  },
  publicBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    padding: 2,
  },
  announcementBody: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  expiryText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500' as const,
  },
  expiredText: {
    color: '#EF4444',
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    gap: 6,
    marginTop: 4,
  },
  markReadButtonText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500' as const,
  },

});