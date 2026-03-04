import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Animated,
  PanResponder,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/user-context';
import { useToast } from '@/hooks/toast-context';
import {
  Shield,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Tag as TagIcon,
  Plus,
  Trash2,
  X,
  RotateCcw,
  Edit3,
  Bell,
  Clock,
  EyeOff,
  Search,
  Eye,
  Filter,
  FileText,
  Settings,
  Archive,
  ArchiveRestore,
} from 'lucide-react-native';
import { listTags, createTag, updateTag, deleteTag, reactivateTag, type Tag } from '@/services/tags';
import { listArchivedEvents, unarchiveEvent } from '@/services/events';
import { unpublishAnnouncement, publishAnnouncement } from '@/lib/announcements';
import { router } from 'expo-router';
import { useChurchSettings, type ServiceTime } from '@/hooks/church-settings-context';
import { CreateTagModal, EditTagModal } from '@/components/AdminTagModals';
import { ChurchSettingsSection } from '@/components/AdminChurchSettings';
import { styles } from '@/styles/admin.styles';

const SWIPE_THRESHOLD = 120;

interface PendingApproval {
  profile_id: string | null;
  email: string | null;
  requested_at: string | null;
  first_name: string | null;
  last_name: string | null;
  family_name: string | null;
  role: string | null;
  has_person_record: boolean | null;
}

interface TagFormData {
  name: string;
  namespace: string;
  color: string;
  description: string;
  self_assignable: boolean;
  assign_min_role: 'member' | 'leader' | 'admin';
}

interface EditTagFormData extends TagFormData {
  id: string;
}

interface AdminAnnouncement {
  id: string;
  title: string;
  body: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  is_published: boolean;
  is_public: boolean;
  role_tags: string[] | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  total_recipients?: number;
  read_count?: number;
}

export default function AdminScreen() {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { settings: churchSettings, updateSettings: updateChurchSettings, updateServiceTimes, isSaving: churchSaving } = useChurchSettings();
  const [localChurchSettings, setLocalChurchSettings] = useState(churchSettings);
  const [activeTab, setActiveTab] = useState<'approvals' | 'tags' | 'announcements' | 'bulletin' | 'church' | 'events'>('approvals');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllPending, setShowAllPending] = useState(false);
  const [showUnpublished, setShowUnpublished] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);

  const [tagForm, setTagForm] = useState<TagFormData>({
    name: '',
    namespace: '',
    color: '#6B7280',
    description: '',
    self_assignable: false,
    assign_min_role: 'member'
  });

  const [editTagForm, setEditTagForm] = useState<EditTagFormData>({
    id: '',
    name: '',
    namespace: '',
    color: '#6B7280',
    description: '',
    self_assignable: false,
    assign_min_role: 'member'
  });

  const [swipeStates, setSwipeStates] = useState<Record<string, {
    translateX: Animated.Value;
    panResponder: any;
    isRevealed: boolean;
  }>>({});

  const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_approvals')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as PendingApproval[];
    },
    enabled: profile?.role === 'admin' || profile?.role === 'leader',
    staleTime: 30000, // 30 seconds
  });

  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: () => listTags(false),
    enabled: profile?.role === 'admin' || profile?.role === 'leader',
    staleTime: 30000, // 30 seconds
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('id,title,body,published_at,expires_at,created_by,is_published,is_public,created_at,updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Batch-load role_tags from junction table
      const ids = (data ?? []).map(a => a.id);
      let roleMap: Record<string, string[]> = {};
      if (ids.length > 0) {
        const { data: roleRows } = await supabase
          .from('announcement_role_access')
          .select('announcement_id, role')
          .in('announcement_id', ids);
        for (const row of roleRows ?? []) {
          if (!roleMap[row.announcement_id]) roleMap[row.announcement_id] = [];
          roleMap[row.announcement_id].push(row.role);
        }
      }

      return (data ?? []).map(announcement => ({
        ...announcement,
        role_tags: roleMap[announcement.id] || null,
      })) as AdminAnnouncement[];
    },
    enabled: profile?.role === 'admin' || profile?.role === 'leader',
    staleTime: 30000, // 30 seconds
  });

  const { data: archivedEvents, isLoading: archivedLoading } = useQuery({
    queryKey: ['admin-archived-events'],
    queryFn: listArchivedEvents,
    enabled: profile?.role === 'admin',
    staleTime: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      showSuccess('User approved successfully');
    },
    onError: () => {
      showError('Failed to approve user. Please try again.');
    },
  });

  const handleApprove = (userId: string, role: string = 'member') => {
    if (approveMutation.isPending) return;
    approveMutation.mutate({ userId, role });
  };

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      showSuccess('User rejected successfully');
    },
    onError: () => {
      showError('Failed to reject user. Please try again.');
    },
  });

  const handleReject = (userId: string) => {
    if (rejectMutation.isPending) return;
    rejectMutation.mutate(userId);
  };

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowCreateTagModal(false);
      setTagForm({ name: '', namespace: '', color: '#6B7280', description: '', self_assignable: false, assign_min_role: 'member' });
      showSuccess(`Tag "${newTag.name}" created successfully`);
    },
    onError: (error) => {
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = error.message as string;
        if (errorMessage.includes('duplicate key')) {
          showError('A tag with this name already exists');
        } else {
          showError('Failed to create tag. Please try again.');
        }
      } else {
        showError('Failed to create tag. Please try again.');
      }
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: ({ tagId, updates }: { tagId: string; updates: any }) => updateTag(tagId, updates),
    onSuccess: (_, { updates }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      
      if (showEditTagModal) {
        setShowEditTagModal(false);
        showSuccess('Tag updated successfully');
      } else {
        // Quick update (toggle)
        if ('is_active' in updates) {
          showSuccess(updates.is_active ? 'Tag activated' : 'Tag deactivated');
        } else if ('self_assignable' in updates) {
          showSuccess(updates.self_assignable ? 'Tag is now self-assignable' : 'Tag is no longer self-assignable');
        } else {
          showSuccess('Tag updated successfully');
        }
      }
    },
    onError: () => {
      showError('Failed to update tag. Please try again.');
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: ({ tagId, hardDelete }: { tagId: string; hardDelete: boolean }) => deleteTag(tagId, hardDelete),
    onSuccess: (_, { hardDelete }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      showSuccess(hardDelete ? 'Tag deleted permanently' : 'Tag archived successfully');
    },
    onError: () => {
      showError('Failed to delete tag. Please try again.');
    },
  });

  const reactivateTagMutation = useMutation({
    mutationFn: reactivateTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      showSuccess('Tag reactivated successfully');
    },
    onError: () => {
      showError('Failed to reactivate tag. Please try again.');
    },
  });

  const handleCreateTag = () => {
    if (!tagForm.name.trim()) {
      showError('Tag name is required');
      return;
    }
    if (tagForm.name.length > 50) {
      showError('Tag name is too long (max 50 characters)');
      return;
    }
    if (createTagMutation.isPending) return;
    
    createTagMutation.mutate({
      name: tagForm.name.trim(),
      namespace: tagForm.namespace.trim() || undefined,
      color: tagForm.color,
      description: tagForm.description.trim() || undefined,
      self_assignable: tagForm.self_assignable,
      assign_min_role: tagForm.assign_min_role,
    });
  };

  const handleToggleSelfAssignable = (tag: Tag) => {
    if (updateTagMutation.isPending) return;
    updateTagMutation.mutate({
      tagId: tag.id,
      updates: { self_assignable: !tag.self_assignable }
    });
  };

  const handleToggleActive = (tag: Tag) => {
    if (updateTagMutation.isPending) return;
    updateTagMutation.mutate({
      tagId: tag.id,
      updates: { is_active: !tag.is_active }
    });
  };

  const handleUpdateMinRole = (tag: Tag, role: 'member' | 'leader' | 'admin') => {
    if (updateTagMutation.isPending) return;
    updateTagMutation.mutate({
      tagId: tag.id,
      updates: { assign_min_role: role }
    });
  };

  const handleDeleteTag = (tag: Tag) => {
    if (deleteTagMutation.isPending) return;
    // For now, just archive the tag (soft delete)
    deleteTagMutation.mutate({ tagId: tag.id, hardDelete: false });
  };

  const handleReactivateTag = (tag: Tag) => {
    if (reactivateTagMutation.isPending) return;
    reactivateTagMutation.mutate(tag.id);
  };

  const handleEditTag = (tag: Tag) => {
    setEditTagForm({
      id: tag.id,
      name: tag.name,
      namespace: tag.namespace || '',
      color: tag.color || '#6B7280',
      description: tag.description || '',
      self_assignable: tag.self_assignable,
      assign_min_role: tag.assign_min_role
    });
    setShowEditTagModal(true);
  };

  const handleUpdateTag = () => {
    if (!editTagForm.name.trim()) {
      showError('Tag name is required');
      return;
    }
    if (editTagForm.name.length > 50) {
      showError('Tag name is too long (max 50 characters)');
      return;
    }
    if (updateTagMutation.isPending) return;
    
    updateTagMutation.mutate({
      tagId: editTagForm.id,
      updates: {
        name: editTagForm.name.trim(),
        namespace: editTagForm.namespace.trim() || undefined,
        color: editTagForm.color,
        description: editTagForm.description.trim() || undefined,
        self_assignable: editTagForm.self_assignable,
        assign_min_role: editTagForm.assign_min_role,
      }
    });
  };

  const unpublishMutation = useMutation({
    mutationFn: unpublishAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      showSuccess('Announcement unpublished successfully');
    },
    onError: () => {
      showError('Failed to unpublish announcement. Please try again.');
    },
  });

  const republishMutation = useMutation({
    mutationFn: (announcementId: string) => publishAnnouncement(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      showSuccess('Announcement republished successfully');
    },
    onError: () => {
      showError('Failed to republish announcement. Please try again.');
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      showSuccess('Announcement deleted successfully');
    },
    onError: () => {
      showError('Failed to delete announcement. Please try again.');
    },
  });

  const createSwipeState = (announcementId: string) => {
    if (swipeStates[announcementId]) return swipeStates[announcementId];

    const translateX = new Animated.Value(0);
    
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -SWIPE_THRESHOLD * 1.2));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -SWIPE_THRESHOLD,
            useNativeDriver: true,
          }).start();
          setSwipeStates(prev => ({
            ...prev,
            [announcementId]: { ...prev[announcementId], isRevealed: true }
          }));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          setSwipeStates(prev => ({
            ...prev,
            [announcementId]: { ...prev[announcementId], isRevealed: false }
          }));
        }
      },
    });

    const newState = { translateX, panResponder, isRevealed: false };
    setSwipeStates(prev => ({ ...prev, [announcementId]: newState }));
    return newState;
  };

  const resetSwipe = (announcementId: string) => {
    const state = swipeStates[announcementId];
    if (state) {
      Animated.spring(state.translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setSwipeStates(prev => ({
        ...prev,
        [announcementId]: { ...prev[announcementId], isRevealed: false }
      }));
    }
  };

  const handleUnpublish = (announcement: AdminAnnouncement) => {
    if (Platform.OS === 'web') {
      const confirmed = confirm(`Are you sure you want to unpublish "${announcement.title}"? This will hide it from all users.`);
      if (confirmed) {
        resetSwipe(announcement.id);
        unpublishMutation.mutate(announcement.id);
      }
    } else {
      Alert.alert(
        'Unpublish Announcement',
        `Are you sure you want to unpublish "${announcement.title}"? This will hide it from all users.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unpublish',
            style: 'destructive',
            onPress: () => {
              resetSwipe(announcement.id);
              unpublishMutation.mutate(announcement.id);
            },
          },
        ]
      );
    }
  };

  const handleDeleteAnnouncement = (announcement: AdminAnnouncement) => {
    if (Platform.OS === 'web') {
      const confirmed = confirm(`Are you sure you want to permanently delete "${announcement.title}"? This action cannot be undone.`);
      if (confirmed) {
        resetSwipe(announcement.id);
        deleteAnnouncementMutation.mutate(announcement.id);
      }
    } else {
      Alert.alert(
        'Delete Announcement',
        `Are you sure you want to permanently delete "${announcement.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              resetSwipe(announcement.id);
              deleteAnnouncementMutation.mutate(announcement.id);
            },
          },
        ]
      );
    }
  };

  const handleEditAnnouncement = (announcement: AdminAnnouncement) => {
    resetSwipe(announcement.id);
    router.push(`/create-announcement?edit=${announcement.id}` as any);
  };

  const handleRepublish = (announcement: AdminAnnouncement) => {
    if (Platform.OS === 'web') {
      const confirmed = confirm(`Are you sure you want to republish "${announcement.title}"? This will make it visible to users again.`);
      if (confirmed) {
        resetSwipe(announcement.id);
        republishMutation.mutate(announcement.id);
      }
    } else {
      Alert.alert(
        'Republish Announcement',
        `Are you sure you want to republish "${announcement.title}"? This will make it visible to users again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Republish',
            style: 'default',
            onPress: () => {
              resetSwipe(announcement.id);
              republishMutation.mutate(announcement.id);
            },
          },
        ]
      );
    }
  };

  // Filter announcements based on search query and unpublished filter
  const filteredAnnouncements = announcements?.filter(announcement => {
    const matchesSearch = !searchQuery || 
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (announcement.body && announcement.body.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesPublishFilter = showUnpublished ? !announcement.is_published : true;
    
    return matchesSearch && matchesPublishFilter;
  }) || [];

  if (profile?.role !== 'admin' && profile?.role !== 'leader') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Shield size={64} color="#EF4444" />
          <Text style={styles.unauthorizedTitle}>Unauthorized</Text>
          <Text style={styles.unauthorizedText}>
            You need admin privileges to access this page
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = approvalsLoading || tagsLoading || announcementsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  const handleUnarchiveEvent = async (eventId: string, title: string) => {
    Alert.alert(
      'Unarchive Event',
      `Restore "${title}" to the active events list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: async () => {
            try {
              await unarchiveEvent(eventId);
              queryClient.invalidateQueries({ queryKey: ['admin-archived-events'] });
              showSuccess('Event restored');
            } catch {
              showError('Failed to unarchive event');
            }
          },
        },
      ]
    );
  };

  const renderArchivedEvents = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Archived Events</Text>
        <Text style={styles.sectionCount}>{archivedEvents?.length ?? 0}</Text>
      </View>

      {archivedLoading ? (
        <ActivityIndicator size="small" color="#7C3AED" />
      ) : !archivedEvents?.length ? (
        <View style={styles.emptyState}>
          <Archive size={32} color="#9CA3AF" />
          <Text style={styles.emptyText}>No archived events</Text>
        </View>
      ) : (
        archivedEvents.map((event) => {
          const archivedBy = event.profiles as any;
          const archiverName = archivedBy?.persons
            ? `${archivedBy.persons.first_name ?? ''} ${archivedBy.persons.last_name ?? ''}`.trim()
            : null;

          return (
            <View key={event.id} style={styles.archivedEventItem}>
              <View style={styles.archivedEventInfo}>
                <Text style={styles.archivedEventTitle}>{event.title}</Text>
                <Text style={styles.archivedEventMeta}>
                  {new Date(event.start_at).toLocaleDateString()}
                  {event.location ? ` \u2022 ${event.location}` : ''}
                </Text>
                <Text style={styles.archivedEventBy}>
                  {archiverName ? `Archived by ${archiverName}` : 'Auto-archived'}
                  {event.archived_at ? ` \u2022 ${new Date(event.archived_at).toLocaleDateString()}` : ''}
                </Text>
              </View>
              {profile?.role === 'admin' && (
                <TouchableOpacity
                  style={styles.unarchiveButton}
                  onPress={() => handleUnarchiveEvent(event.id, event.title)}
                >
                  <ArchiveRestore size={16} color="#7C3AED" />
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const readyApprovals = pendingApprovals?.filter(a => a.has_person_record && a.first_name) || [];
  const incompleteApprovals = pendingApprovals?.filter(a => !a.has_person_record || !a.first_name) || [];
  const displayedApprovals = showAllPending ? pendingApprovals || [] : readyApprovals;

  const renderApprovals = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Approvals</Text>
        {incompleteApprovals.length > 0 && (
          <TouchableOpacity
            style={[styles.filterToggle, showAllPending && styles.filterToggleActive]}
            onPress={() => setShowAllPending(!showAllPending)}
          >
            <Filter size={14} color={showAllPending ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterToggleText, showAllPending && styles.filterToggleTextActive]}>
              {showAllPending ? 'All' : 'Ready'} ({showAllPending ? pendingApprovals?.length || 0 : readyApprovals.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {displayedApprovals.length > 0 ? (
        displayedApprovals.map((approval) => {
          const isIncomplete = !approval.has_person_record || !approval.first_name;
          return (
            <View key={approval.profile_id} style={[styles.approvalCard, isIncomplete && styles.approvalCardIncomplete]}>
              <View style={styles.approvalHeader}>
                <View style={styles.userAvatar}>
                  <User size={24} color="#9CA3AF" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {approval.first_name && approval.last_name
                      ? `${approval.first_name} ${approval.last_name}`
                      : approval.email || 'Unknown user'}
                  </Text>
                  {approval.first_name && approval.email && (
                    <View style={styles.userDetail}>
                      <Mail size={12} color="#9CA3AF" />
                      <Text style={styles.userDetailText}>{approval.email}</Text>
                    </View>
                  )}
                  <View style={styles.userDetail}>
                    <Calendar size={12} color="#9CA3AF" />
                    <Text style={styles.userDetailText}>
                      Requested {approval.requested_at ? new Date(approval.requested_at).toLocaleDateString() : 'Unknown'}
                    </Text>
                  </View>
                  {isIncomplete && (
                    <View style={styles.userDetail}>
                      <Clock size={12} color="#F59E0B" />
                      <Text style={[styles.userDetailText, { color: '#F59E0B' }]}>
                        Profile incomplete
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {!isIncomplete && (
                <View style={styles.approvalActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.visitorButton,
                      approveMutation.isPending && styles.actionButtonDisabled
                    ]}
                    onPress={() => handleApprove(approval.profile_id!, 'visitor')}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <ActivityIndicator size={16} color="#FFFFFF" />
                    ) : (
                      <Eye size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.actionButtonText}>Visitor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.approveButton,
                      approveMutation.isPending && styles.actionButtonDisabled
                    ]}
                    onPress={() => handleApprove(approval.profile_id!, 'member')}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? (
                      <ActivityIndicator size={16} color="#FFFFFF" />
                    ) : (
                      <CheckCircle size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.actionButtonText}>Member</Text>
                  </TouchableOpacity>
                </View>
              )}

              {approval.family_name && (
                <View style={styles.noteContainer}>
                  <Text style={styles.noteText}>
                    Family: {approval.family_name}
                  </Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <User size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No pending approvals</Text>
          <Text style={styles.emptySubtext}>
            {showAllPending ? 'No pending users' : 'All profiled users have been processed'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderAnnouncements = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Announcement Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create-announcement' as any)}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New Announcement</Text>
        </TouchableOpacity>
      </View>
      
      {/* Search and Filter Controls */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search announcements..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
            >
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            showUnpublished && styles.filterButtonActive
          ]}
          onPress={() => setShowUnpublished(!showUnpublished)}
        >
          <Filter size={16} color={showUnpublished ? '#FFFFFF' : '#6B7280'} />
          <Text style={[
            styles.filterButtonText,
            showUnpublished && styles.filterButtonTextActive
          ]}>
            {showUnpublished ? 'Unpublished' : 'All'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {filteredAnnouncements && filteredAnnouncements.length > 0 ? (
        filteredAnnouncements.map((announcement: AdminAnnouncement) => {
          const isExpired = announcement.expires_at && new Date(announcement.expires_at) < new Date();
          const isPending = announcement.published_at && new Date(announcement.published_at) > new Date();
          const isDraft = !announcement.is_published;
          const swipeState = createSwipeState(announcement.id);
          
          return (
            <View key={announcement.id} style={styles.swipeContainer}>
              {/* Action buttons behind the card */}
              <View style={styles.swipeActions}>
                <TouchableOpacity
                  style={[styles.swipeActionButton, styles.editActionButton]}
                  onPress={() => handleEditAnnouncement(announcement)}
                >
                  <Edit3 size={20} color="#FFFFFF" />
                  <Text style={styles.swipeActionText}>Edit</Text>
                </TouchableOpacity>
                
                {announcement.is_published ? (
                  <TouchableOpacity
                    style={[styles.swipeActionButton, styles.unpublishActionButton]}
                    onPress={() => handleUnpublish(announcement)}
                  >
                    <EyeOff size={20} color="#FFFFFF" />
                    <Text style={styles.swipeActionText}>Unpublish</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.swipeActionButton, styles.republishActionButton]}
                    onPress={() => handleRepublish(announcement)}
                  >
                    <Eye size={20} color="#FFFFFF" />
                    <Text style={styles.swipeActionText}>Republish</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.swipeActionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteAnnouncement(announcement)}
                >
                  <Trash2 size={20} color="#FFFFFF" />
                  <Text style={styles.swipeActionText}>Delete</Text>
                </TouchableOpacity>
              </View>

              {/* Swipeable card */}
              <Animated.View
                style={[
                  styles.announcementCard,
                  isExpired && styles.expiredCard,
                  isPending && styles.pendingCard,
                  isDraft && styles.draftCard,
                  { transform: [{ translateX: swipeState.translateX }] }
                ]}
                {...swipeState.panResponder.panHandlers}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (swipeState.isRevealed) {
                      resetSwipe(announcement.id);
                    }
                  }}
                >
                  <View style={styles.announcementHeader}>
                    <View style={styles.announcementInfo}>
                      <View style={styles.announcementTitleRow}>
                        <Text style={styles.announcementTitle}>
                          {announcement.title}
                        </Text>
                        {announcement.is_public && (
                          <View style={styles.publicBadge}>
                            <Text style={styles.publicBadgeText}>Public</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.announcementMeta}>
                        <Calendar size={12} color="#6B7280" />
                        <Text style={styles.announcementMetaText}>
                          {isDraft ? 'Draft' : isPending ? 'Scheduled for' : 'Published'} 
                          {announcement.published_at ? new Date(announcement.published_at).toLocaleDateString() : new Date(announcement.created_at).toLocaleDateString()}
                        </Text>
                        {announcement.expires_at && (
                          <>
                            <Text style={styles.announcementMetaText}>•</Text>
                            <Clock size={12} color={isExpired ? '#EF4444' : '#F59E0B'} />
                            <Text style={[styles.announcementMetaText, isExpired && styles.expiredText]}>
                              {isExpired ? 'Expired' : 'Expires'} {new Date(announcement.expires_at).toLocaleDateString()}
                            </Text>
                          </>
                        )}
                      </View>
                      {announcement.role_tags && announcement.role_tags.length > 0 && (
                        <View style={styles.rolesContainer}>
                          <Text style={styles.rolesText}>Roles: {announcement.role_tags.join(', ')}</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.announcementStats}>
                      {isDraft && (
                        <View style={styles.draftBadge}>
                          <Text style={styles.draftBadgeText}>Draft</Text>
                        </View>
                      )}
                      {isPending && !isDraft && (
                        <View style={styles.pendingBadge}>
                          <Clock size={10} color="#F59E0B" />
                          <Text style={styles.pendingBadgeText}>Scheduled</Text>
                        </View>
                      )}
                      {isExpired && (
                        <View style={styles.expiredBadge}>
                          <Clock size={10} color="#EF4444" />
                          <Text style={styles.expiredBadgeText}>Expired</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditAnnouncement(announcement)}
                      >
                        <Edit3 size={14} color="#7C3AED" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.announcementBody} numberOfLines={2}>
                    {announcement.body || 'No content'}
                  </Text>

                  {/* Swipe hint */}
                  {!swipeState.isRevealed && (
                    <View style={styles.swipeHint}>
                      <Text style={styles.swipeHintText}>← Swipe left for actions</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <Bell size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {searchQuery || showUnpublished 
              ? 'No announcements match your criteria' 
              : 'No announcements created yet'
            }
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || showUnpublished
              ? 'Try adjusting your search or filters'
              : 'Create your first announcement to get started'
            }
          </Text>
        </View>
      )}
    </View>
  );

  const renderTags = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tag Management</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateTagModal(true)}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.createButtonText}>New Tag</Text>
        </TouchableOpacity>
      </View>
      
      {tags && tags.length > 0 ? (
        tags.map((tag: Tag) => (
          <View key={tag.id} style={[styles.tagCard, !tag.is_active && styles.inactiveTagCard]}>
            <View style={styles.tagHeader}>
              <View style={styles.tagInfo}>
                <View style={styles.tagNameRow}>
                  <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                  <Text style={[styles.tagName, !tag.is_active && styles.inactiveText]}>
                    {tag.name}
                  </Text>
                  {tag.namespace && (
                    <Text style={styles.tagNamespace}>({tag.namespace})</Text>
                  )}
                </View>
                {tag.description && (
                  <Text style={styles.tagDescription}>{tag.description}</Text>
                )}
              </View>
            </View>

            <View style={styles.tagControls}>
              <View style={styles.tagControlRow}>
                <Text style={styles.controlLabel}>Self-assignable:</Text>
                <Switch
                  value={tag.self_assignable}
                  onValueChange={() => handleToggleSelfAssignable(tag)}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor={tag.self_assignable ? '#FFFFFF' : '#9CA3AF'}
                  disabled={updateTagMutation.isPending}
                />
              </View>
              
              <View style={styles.tagControlRow}>
                <Text style={styles.controlLabel}>Active:</Text>
                <Switch
                  value={tag.is_active}
                  onValueChange={() => handleToggleActive(tag)}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor={tag.is_active ? '#FFFFFF' : '#9CA3AF'}
                  disabled={updateTagMutation.isPending}
                />
              </View>

              <View style={styles.tagControlRow}>
                <Text style={styles.controlLabel}>Min Role:</Text>
                <View style={styles.roleButtons}>
                  {(['member', 'leader', 'admin'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        tag.assign_min_role === role && styles.activeRoleButton
                      ]}
                      onPress={() => handleUpdateMinRole(tag, role)}
                      disabled={updateTagMutation.isPending}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        tag.assign_min_role === role && styles.activeRoleButtonText
                      ]}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.tagActions}>
              <TouchableOpacity
                style={[
                  styles.tagActionButton, 
                  styles.editTagButton,
                  updateTagMutation.isPending && styles.tagActionButtonDisabled
                ]}
                onPress={() => handleEditTag(tag)}
                disabled={updateTagMutation.isPending}
              >
                <Edit3 size={14} color="#7C3AED" />
                <Text style={styles.editTagButtonText}>Edit</Text>
              </TouchableOpacity>
              {!tag.is_active ? (
                <TouchableOpacity
                  style={[
                    styles.tagActionButton, 
                    styles.reactivateTagButton,
                    reactivateTagMutation.isPending && styles.tagActionButtonDisabled
                  ]}
                  onPress={() => handleReactivateTag(tag)}
                  disabled={reactivateTagMutation.isPending}
                >
                  {reactivateTagMutation.isPending ? (
                    <ActivityIndicator size={14} color="#10B981" />
                  ) : (
                    <RotateCcw size={14} color="#10B981" />
                  )}
                  <Text style={styles.reactivateTagButtonText}>Reactivate</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.tagActionButton, 
                  styles.deleteTagButton,
                  deleteTagMutation.isPending && styles.tagActionButtonDisabled
                ]}
                onPress={() => handleDeleteTag(tag)}
                disabled={deleteTagMutation.isPending}
              >
                {deleteTagMutation.isPending ? (
                  <ActivityIndicator size={14} color="#EF4444" />
                ) : (
                  <Trash2 size={14} color="#EF4444" />
                )}
                <Text style={styles.deleteTagButtonText}>Archive</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <TagIcon size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No tags created yet</Text>
          <Text style={styles.emptySubtext}>Create your first tag to get started</Text>
        </View>
      )}
    </View>
  );

  const handleSaveChurchSettings = () => {
    updateChurchSettings(localChurchSettings);
    showSuccess('Church settings saved');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingApprovals?.length || 0}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tags?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Total Tags</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{announcements?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Announcements</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approvals' && styles.activeTab]}
          onPress={() => setActiveTab('approvals')}
        >
          <User size={16} color={activeTab === 'approvals' ? '#7C3AED' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>
            Approvals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tags' && styles.activeTab]}
          onPress={() => setActiveTab('tags')}
        >
          <TagIcon size={16} color={activeTab === 'tags' ? '#7C3AED' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'tags' && styles.activeTabText]}>
            Tags
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'announcements' && styles.activeTab]}
          onPress={() => setActiveTab('announcements')}
        >
          <Bell size={16} color={activeTab === 'announcements' ? '#7C3AED' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>
            Announcements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bulletin' && styles.activeTab]}
          onPress={() => setActiveTab('bulletin')}
        >
          <FileText size={16} color={activeTab === 'bulletin' ? '#7C3AED' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'bulletin' && styles.activeTabText]}>
            Bulletin
          </Text>
        </TouchableOpacity>
        {profile?.role === 'admin' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}
          >
            <Archive size={16} color={activeTab === 'events' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
              Events
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'church' && styles.activeTab]}
          onPress={() => {
            setLocalChurchSettings(churchSettings);
            setActiveTab('church');
          }}
        >
          <Settings size={16} color={activeTab === 'church' ? '#7C3AED' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'church' && styles.activeTabText]}>
            Church
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'approvals' && renderApprovals()}
        {activeTab === 'tags' && renderTags()}
        {activeTab === 'announcements' && renderAnnouncements()}
        {activeTab === 'bulletin' && (
          <View style={styles.section}>
            <View style={styles.bulletinPromo}>
              <FileText size={48} color="#7C3AED" />
              <Text style={styles.bulletinTitle}>Weekly Bulletin</Text>
              <Text style={styles.bulletinSubtitle}>
                Generate a print-ready bulletin with prayers, events, schedules, and custom sections
              </Text>
              <TouchableOpacity
                style={styles.bulletinButton}
                onPress={() => router.push('/create-bulletin' as any)}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.bulletinButtonText}>Create Bulletin</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {activeTab === 'events' && renderArchivedEvents()}
        {activeTab === 'church' && (
          <ChurchSettingsSection
            localSettings={localChurchSettings}
            setLocalSettings={setLocalChurchSettings}
            onSave={handleSaveChurchSettings}
            isSaving={churchSaving}
          />
        )}
      </ScrollView>

      <CreateTagModal
        visible={showCreateTagModal}
        onClose={() => setShowCreateTagModal(false)}
        tagForm={tagForm}
        setTagForm={setTagForm}
        onCreate={handleCreateTag}
        isPending={createTagMutation.isPending}
      />
      <EditTagModal
        visible={showEditTagModal}
        onClose={() => setShowEditTagModal(false)}
        editTagForm={editTagForm}
        setEditTagForm={setEditTagForm}
        onUpdate={handleUpdateTag}
        isPending={updateTagMutation.isPending}
      />
    </SafeAreaView>
  );
}
