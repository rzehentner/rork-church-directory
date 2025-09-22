import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
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
  Filter
} from 'lucide-react-native';
import { listTags, createTag, updateTag, deleteTag, reactivateTag, type Tag } from '@/services/tags';
import { unpublishAnnouncement, publishAnnouncement } from '@/lib/announcements';
import { router } from 'expo-router';

const SWIPE_THRESHOLD = 120;

interface PendingApproval {
  user_id: string;
  email: string | null;
  created_at: string;
  person_id: string | null;
  first_name: string | null;
  last_name: string | null;
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
  roles_allowed: string[] | null;
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
  const [activeTab, setActiveTab] = useState<'approvals' | 'tags' | 'announcements'>('approvals');
  const [searchQuery, setSearchQuery] = useState('');
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
        .order('created_at', { ascending: false });

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
      console.log('📢 Fetching admin announcements');
      
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          id,
          title,
          body,
          published_at,
          expires_at,
          created_by,
          is_published,
          is_public,
          roles_allowed,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Error fetching admin announcements:', error);
        throw error;
      }
      
      // Transform the data to safely handle roles_allowed parsing
      const transformedData = data?.map(announcement => {
        let rolesAllowed: string[] | null = null;
        
        // Safely parse roles_allowed field
        if (announcement.roles_allowed) {
          try {
            if (Array.isArray(announcement.roles_allowed)) {
              rolesAllowed = announcement.roles_allowed;
            } else if (typeof announcement.roles_allowed === 'string') {
              // Clean the string before parsing
              const cleanedString = announcement.roles_allowed.trim();
              if (cleanedString.startsWith('[') && cleanedString.endsWith(']')) {
                rolesAllowed = JSON.parse(cleanedString);
              } else if (cleanedString.startsWith('{') && cleanedString.endsWith('}')) {
                // Handle PostgreSQL array format like {admin,leader}
                const arrayContent = cleanedString.slice(1, -1);
                rolesAllowed = arrayContent ? arrayContent.split(',').map(s => s.trim()) : [];
              } else {
                // Single value or comma-separated values
                rolesAllowed = cleanedString.split(',').map(s => s.trim()).filter(Boolean);
              }
            } else {
              // Handle other data types
              rolesAllowed = null;
            }
          } catch (parseError) {
            console.warn('⚠️ Failed to parse roles_allowed for admin announcement:', announcement.id, 'Raw value:', announcement.roles_allowed, 'Error:', parseError);
            rolesAllowed = null;
          }
        }
        
        return {
          ...announcement,
          roles_allowed: rolesAllowed
        } as AdminAnnouncement;
      }) || [];
      
      console.log('✅ Admin announcements fetched:', transformedData?.length || 0);
      console.log('📋 Raw admin announcements data:', transformedData);
      return transformedData;
    },
    enabled: profile?.role === 'admin' || profile?.role === 'leader',
    staleTime: 30000, // 30 seconds
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
    onError: (error) => {
      console.error('Error approving user:', error);
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
    onError: (error) => {
      console.error('Error rejecting user:', error);
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
      console.log('✅ Tag created successfully:', newTag);
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowCreateTagModal(false);
      setTagForm({ name: '', namespace: '', color: '#6B7280', description: '', self_assignable: false, assign_min_role: 'member' });
      showSuccess(`Tag "${newTag.name}" created successfully`);
    },
    onError: (error) => {
      console.error('❌ Error creating tag:', error);
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
    onError: (error) => {
      console.error('❌ Error updating tag:', error);
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
    onError: (error) => {
      console.error('❌ Error deleting tag:', error);
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
    onError: (error) => {
      console.error('❌ Error reactivating tag:', error);
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
    onError: (error) => {
      console.error('❌ Error unpublishing announcement:', error);
      showError('Failed to unpublish announcement. Please try again.');
    },
  });

  const republishMutation = useMutation({
    mutationFn: (announcementId: string) => publishAnnouncement(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      showSuccess('Announcement republished successfully');
    },
    onError: (error) => {
      console.error('❌ Error republishing announcement:', error);
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
    onError: (error) => {
      console.error('❌ Error deleting announcement:', error);
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
    router.push(`/create-announcement?edit=${announcement.id}`);
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

  const renderApprovals = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pending Approvals</Text>
      {pendingApprovals && pendingApprovals.length > 0 ? (
        pendingApprovals.map((approval) => (
          <View key={approval.user_id} style={styles.approvalCard}>
            <View style={styles.approvalHeader}>
              <View style={styles.userAvatar}>
                <User size={24} color="#9CA3AF" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {approval.first_name && approval.last_name
                    ? `${approval.first_name} ${approval.last_name}`
                    : 'No name set'}
                </Text>
                {approval.email && (
                  <View style={styles.userDetail}>
                    <Mail size={12} color="#9CA3AF" />
                    <Text style={styles.userDetailText}>{approval.email}</Text>
                  </View>
                )}
                <View style={styles.userDetail}>
                  <Calendar size={12} color="#9CA3AF" />
                  <Text style={styles.userDetailText}>
                    Requested {new Date(approval.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.approvalActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.approveButton,
                  approveMutation.isPending && styles.actionButtonDisabled
                ]}
                onPress={() => handleApprove(approval.user_id, 'member')}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <ActivityIndicator size={16} color="#FFFFFF" />
                ) : (
                  <CheckCircle size={16} color="#FFFFFF" />
                )}
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.rejectButton,
                  rejectMutation.isPending && styles.actionButtonDisabled
                ]}
                onPress={() => handleReject(approval.user_id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size={16} color="#FFFFFF" />
                ) : (
                  <XCircle size={16} color="#FFFFFF" />
                )}
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>

            {approval.person_id && (
              <View style={styles.noteContainer}>
                <Text style={styles.noteText}>
                  ✓ Pre-loaded person record found
                </Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <User size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No pending approvals</Text>
          <Text style={styles.emptySubtext}>All users have been processed</Text>
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
          onPress={() => router.push('/create-announcement')}
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
                      {announcement.roles_allowed && announcement.roles_allowed.length > 0 && (
                        <View style={styles.rolesContainer}>
                          <Text style={styles.rolesText}>Roles: {announcement.roles_allowed.join(', ')}</Text>
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

  const renderEditTagModal = () => (
    <Modal
      visible={showEditTagModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Tag</Text>
          <TouchableOpacity
            onPress={() => {
              setShowEditTagModal(false);
            }}
            style={styles.modalCloseButton}
          >
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              style={styles.formInput}
              value={editTagForm.name}
              onChangeText={(text) => setEditTagForm(prev => ({ ...prev, name: text }))}
              placeholder="Enter tag name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Namespace</Text>
            <TextInput
              style={styles.formInput}
              value={editTagForm.namespace}
              onChangeText={(text) => setEditTagForm(prev => ({ ...prev, namespace: text }))}
              placeholder="e.g., ministry, age, skill (optional)"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formHint}>Groups related tags together for organization</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Color</Text>
            <View style={styles.colorPickerContainer}>
              <View style={styles.colorGrid}>
                {[
                  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
                  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
                  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
                  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
                  '#F43F5E', '#6B7280', '#374151', '#1F2937'
                ].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      editTagForm.color === color && styles.selectedColorOption
                    ]}
                    onPress={() => setEditTagForm(prev => ({ ...prev, color }))}
                  >
                    {editTagForm.color === color && (
                      <View style={styles.colorCheckmark}>
                        <Text style={styles.colorCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customColorRow}>
                <Text style={styles.customColorLabel}>Custom:</Text>
                <View style={styles.customColorInputContainer}>
                  <View style={[styles.colorPreview, { backgroundColor: editTagForm.color }]} />
                  <TextInput
                    style={styles.customColorInput}
                    value={editTagForm.color}
                    onChangeText={(text) => setEditTagForm(prev => ({ ...prev, color: text }))}
                    placeholder="#6B7280"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={editTagForm.description}
              onChangeText={(text) => setEditTagForm(prev => ({ ...prev, description: text }))}
              placeholder="Optional description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.formSwitchRow}>
              <View style={styles.formSwitchInfo}>
                <Text style={styles.formLabel}>Self-assignable</Text>
                <Text style={styles.formHint}>Allow members to assign this tag to themselves</Text>
              </View>
              <Switch
                value={editTagForm.self_assignable}
                onValueChange={(value) => setEditTagForm(prev => ({ ...prev, self_assignable: value }))}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={editTagForm.self_assignable ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Minimum Role Required</Text>
            <Text style={styles.formHint}>Who can assign this tag to others</Text>
            <View style={styles.roleButtonsForm}>
              {(['member', 'leader', 'admin'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButtonForm,
                    editTagForm.assign_min_role === role && styles.activeRoleButtonForm
                  ]}
                  onPress={() => setEditTagForm(prev => ({ ...prev, assign_min_role: role }))}
                >
                  <Text style={[
                    styles.roleButtonTextForm,
                    editTagForm.assign_min_role === role && styles.activeRoleButtonTextForm
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => {
              setShowEditTagModal(false);
            }}
          >
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalCreateButton}
            onPress={handleUpdateTag}
            disabled={updateTagMutation.isPending}
          >
            {updateTagMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalCreateButtonText}>Update Tag</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderCreateTagModal = () => (
    <Modal
      visible={showCreateTagModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create New Tag</Text>
          <TouchableOpacity
            onPress={() => setShowCreateTagModal(false)}
            style={styles.modalCloseButton}
          >
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              style={styles.formInput}
              value={tagForm.name}
              onChangeText={(text) => setTagForm(prev => ({ ...prev, name: text }))}
              placeholder="Enter tag name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Namespace</Text>
            <TextInput
              style={styles.formInput}
              value={tagForm.namespace}
              onChangeText={(text) => setTagForm(prev => ({ ...prev, namespace: text }))}
              placeholder="e.g., ministry, age, skill (optional)"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.formHint}>Groups related tags together for organization</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Color</Text>
            <View style={styles.colorPickerContainer}>
              <View style={styles.colorGrid}>
                {[
                  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
                  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
                  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
                  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
                  '#F43F5E', '#6B7280', '#374151', '#1F2937'
                ].map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      tagForm.color === color && styles.selectedColorOption
                    ]}
                    onPress={() => setTagForm(prev => ({ ...prev, color }))}
                  >
                    {tagForm.color === color && (
                      <View style={styles.colorCheckmark}>
                        <Text style={styles.colorCheckmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.customColorRow}>
                <Text style={styles.customColorLabel}>Custom:</Text>
                <View style={styles.customColorInputContainer}>
                  <View style={[styles.colorPreview, { backgroundColor: tagForm.color }]} />
                  <TextInput
                    style={styles.customColorInput}
                    value={tagForm.color}
                    onChangeText={(text) => setTagForm(prev => ({ ...prev, color: text }))}
                    placeholder="#6B7280"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={tagForm.description}
              onChangeText={(text) => setTagForm(prev => ({ ...prev, description: text }))}
              placeholder="Optional description"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.formSwitchRow}>
              <View style={styles.formSwitchInfo}>
                <Text style={styles.formLabel}>Self-assignable</Text>
                <Text style={styles.formHint}>Allow members to assign this tag to themselves</Text>
              </View>
              <Switch
                value={tagForm.self_assignable}
                onValueChange={(value) => setTagForm(prev => ({ ...prev, self_assignable: value }))}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={tagForm.self_assignable ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Minimum Role Required</Text>
            <Text style={styles.formHint}>Who can assign this tag to others</Text>
            <View style={styles.roleButtonsForm}>
              {(['member', 'leader', 'admin'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButtonForm,
                    tagForm.assign_min_role === role && styles.activeRoleButtonForm
                  ]}
                  onPress={() => setTagForm(prev => ({ ...prev, assign_min_role: role }))}
                >
                  <Text style={[
                    styles.roleButtonTextForm,
                    tagForm.assign_min_role === role && styles.activeRoleButtonTextForm
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowCreateTagModal(false)}
          >
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalCreateButton}
            onPress={handleCreateTag}
            disabled={createTagMutation.isPending}
          >
            {createTagMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalCreateButtonText}>Create Tag</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

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
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === 'approvals' && renderApprovals()}
        {activeTab === 'tags' && renderTags()}
        {activeTab === 'announcements' && renderAnnouncements()}
      </ScrollView>

      {renderCreateTagModal()}
      {renderEditTagModal()}
    </SafeAreaView>
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
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 8,
  },
  unauthorizedText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#7C3AED',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  approvalHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  userDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  noteContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  noteText: {
    fontSize: 12,
    color: '#10B981',
    fontStyle: 'italic' as const,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  tagCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inactiveTagCard: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  tagHeader: {
    marginBottom: 16,
  },
  tagInfo: {
    flex: 1,
  },
  tagNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tagColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  tagNamespace: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontStyle: 'italic' as const,
  },
  tagDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 20,
  },
  inactiveText: {
    color: '#9CA3AF',
  },
  tagControls: {
    gap: 12,
    marginBottom: 16,
  },
  tagControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeRoleButton: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B7280',
    textTransform: 'capitalize' as const,
  },
  activeRoleButtonText: {
    color: '#FFFFFF',
  },
  tagActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  tagActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  deleteTagButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteTagButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#EF4444',
  },
  reactivateTagButton: {
    backgroundColor: '#F0FDF4',
    marginRight: 8,
  },
  reactivateTagButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#10B981',
  },
  editTagButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  editTagButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#7C3AED',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  tagActionButtonDisabled: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPickerContainer: {
    gap: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderColor: '#1F2937',
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCheckmarkText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  customColorLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  customColorInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  customColorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  modalCreateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  formHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  formSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formSwitchInfo: {
    flex: 1,
    marginRight: 16,
  },
  roleButtonsForm: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roleButtonForm: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  activeRoleButtonForm: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  roleButtonTextForm: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
    textTransform: 'capitalize' as const,
  },
  activeRoleButtonTextForm: {
    color: '#FFFFFF',
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  expiredCard: {
    opacity: 0.7,
    backgroundColor: '#FEF2F2',
  },
  pendingCard: {
    backgroundColor: '#FFFBEB',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementInfo: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  announcementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  announcementMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expiredText: {
    color: '#EF4444',
  },
  announcementStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  pendingBadgeText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '500' as const,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  expiredBadgeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  announcementBody: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  draftCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed' as const,
  },
  announcementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  publicBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  publicBadgeText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '500' as const,
  },
  rolesContainer: {
    marginTop: 4,
  },
  rolesText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic' as const,
  },
  draftBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  draftBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  swipeActions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  swipeActionButton: {
    width: 60,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
    gap: 4,
  },
  editActionButton: {
    backgroundColor: '#7C3AED',
  },
  unpublishActionButton: {
    backgroundColor: '#F59E0B',
  },
  deleteActionButton: {
    backgroundColor: '#EF4444',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  swipeHint: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  clearSearchButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  republishActionButton: {
    backgroundColor: '#10B981',
  },
});