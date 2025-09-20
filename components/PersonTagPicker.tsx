import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/hooks/me-context';
import { useToast } from '@/hooks/toast-context';
import {
  listTags,
  getPersonWithTags,
  addTagToPerson,
  removeTagFromPerson,
  type Tag,
} from '@/services/tags';
import { Plus, X, AlertCircle, Lock } from 'lucide-react-native';
import { TagPickerSkeleton } from '@/components/Skeleton';

interface PersonTagPickerProps {
  personId: string;
  testId?: string;
  onTagsChanged?: () => void;
}

export default function PersonTagPicker({ personId, testId, onTagsChanged }: PersonTagPickerProps) {
  const { myRole, person: myPerson } = useMe();
  const queryClient = useQueryClient();
  const { showError, showSuccess, showWarning } = useToast();
  const [localPersonTags, setLocalPersonTags] = useState<Tag[]>([]);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());

  console.log('PersonTagPicker render:', { personId, myRole });

  // Fetch all available tags (only active ones for pickers)
  const {
    data: allTags = [],
    isLoading: tagsLoading,
    error: tagsError,
  } = useQuery({
    queryKey: ['tags', 'active'],
    queryFn: () => listTags(true), // Only fetch active tags for pickers
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch person's current tags
  const {
    data: personWithTags,
    isLoading: personLoading,
    error: personError,
  } = useQuery({
    queryKey: ['person-with-tags', personId],
    queryFn: () => getPersonWithTags(personId),
    enabled: !!personId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update local state when person tags change
  useEffect(() => {
    if (personWithTags?.tags) {
      setLocalPersonTags(personWithTags.tags);
    }
  }, [personWithTags]);

  // Add tag mutation with debouncing
  const addTagMutation = useMutation({
    mutationFn: ({ personId, tagId }: { personId: string; tagId: string }) =>
      addTagToPerson(personId, tagId),
    onMutate: async ({ tagId }) => {
      // Add to pending actions
      setPendingActions(prev => new Set([...prev, tagId]));
      
      // Optimistic update
      const tagToAdd = allTags.find(tag => tag.id === tagId);
      if (tagToAdd) {
        setLocalPersonTags(prev => [...prev, tagToAdd]);
      }
    },
    onSuccess: (_, { tagId }) => {
      // Remove from pending actions
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagId);
        return newSet;
      });
      
      // Invalidate and refetch person tags and directory data
      queryClient.invalidateQueries({ queryKey: ['person-with-tags', personId] });
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      
      // Call the callback if provided
      onTagsChanged?.();
      
      const tagName = allTags.find(tag => tag.id === tagId)?.name || 'Tag';
      showSuccess(`${tagName} added successfully`);
    },
    onError: (error, { tagId }) => {
      // Remove from pending actions
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagId);
        return newSet;
      });
      
      console.error('Error adding tag:', error);
      
      // Revert optimistic update
      setLocalPersonTags(prev => prev.filter(tag => tag.id !== tagId));
      
      // Show user-friendly error message
      const tagName = allTags.find(tag => tag.id === tagId)?.name || 'tag';
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = error.message as string;
        if (errorMessage.includes('Only admins/leaders')) {
          showWarning(`This ${tagName} tag is staff-only. Ask a leader to assign it.`);
        } else if (errorMessage.includes('not self-assignable')) {
          showWarning(`Ask a leader to enable self-assignment for the ${tagName} tag.`);
        } else {
          showError(`Failed to add ${tagName} tag. Please try again.`);
        }
      } else {
        showError(`Failed to add ${tagName} tag. Please try again.`);
      }
    },
  });

  // Remove tag mutation with debouncing
  const removeTagMutation = useMutation({
    mutationFn: ({ personId, tagId }: { personId: string; tagId: string }) =>
      removeTagFromPerson(personId, tagId),
    onMutate: async ({ tagId }) => {
      // Add to pending actions
      setPendingActions(prev => new Set([...prev, tagId]));
      
      // Optimistic update
      setLocalPersonTags(prev => prev.filter(tag => tag.id !== tagId));
    },
    onSuccess: (_, { tagId }) => {
      // Remove from pending actions
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagId);
        return newSet;
      });
      
      // Invalidate and refetch person tags and directory data
      queryClient.invalidateQueries({ queryKey: ['person-with-tags', personId] });
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      
      // Call the callback if provided
      onTagsChanged?.();
      
      const tagName = allTags.find(tag => tag.id === tagId)?.name || 'Tag';
      showSuccess(`${tagName} removed successfully`);
    },
    onError: (error, { tagId }) => {
      // Remove from pending actions
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagId);
        return newSet;
      });
      
      console.error('Error removing tag:', error);
      
      // Revert optimistic update
      const tagToRestore = allTags.find(tag => tag.id === tagId);
      if (tagToRestore) {
        setLocalPersonTags(prev => [...prev, tagToRestore]);
      }
      
      // Show user-friendly error message
      const tagName = allTags.find(tag => tag.id === tagId)?.name || 'tag';
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = error.message as string;
        if (errorMessage.includes('Only admins/leaders')) {
          showWarning(`This ${tagName} tag is staff-only. Ask a leader to remove it.`);
        } else {
          showError(`Failed to remove ${tagName} tag. Please try again.`);
        }
      } else {
        showError(`Failed to remove ${tagName} tag. Please try again.`);
      }
    },
  });





  // Extract mutation functions for stable dependencies
  const { mutateAsync: addTagAsync } = addTagMutation;
  const { mutateAsync: removeTagAsync } = removeTagMutation;

  // Stable toggle function
  const stableHandleToggleTag = useCallback(async (tag: Tag) => {
    const isAssigned = localPersonTags.some(t => t.id === tag.id);
    const isStaff = (myRole === 'admin' || myRole === 'leader');
    const sameFamily = !!(myPerson?.family_id && myPerson.family_id === personWithTags?.family_id);
    const canToggle = isStaff || (sameFamily && tag.self_assignable === true);
    const isPending = pendingActions.has(tag.id);

    if (isPending) return;

    if (!canToggle) {
      const action = isAssigned ? 'remove' : 'assign';
      showWarning(`You can't ${action} this tag.`);
      return;
    }

    try {
      if (isAssigned) {
        await removeTagAsync({ personId, tagId: tag.id });
      } else {
        await addTagAsync({ personId, tagId: tag.id });
      }
    } catch {
    }
  }, [localPersonTags, myRole, myPerson?.family_id, personWithTags?.family_id, pendingActions, personId, showWarning, addTagAsync, removeTagAsync]);

  const isLoading = tagsLoading || personLoading;
  const hasError = tagsError || personError;

  if (isLoading) {
    return (
      <View style={styles.container} testID={testId}>
        <TagPickerSkeleton />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.errorContainer} testID={testId}>
        <AlertCircle size={20} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load tags</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
            queryClient.invalidateQueries({ queryKey: ['person-with-tags', personId] });
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show empty state if no tags are available
  if (allTags.length === 0) {
    return (
      <View style={styles.emptyContainer} testID={testId}>
        <AlertCircle size={32} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No tags available</Text>
        <Text style={styles.emptyText}>
          {myRole === 'admin' 
            ? 'Create tags in the Admin section to enable tagging'
            : 'Ask a leader to create tags for the community'
          }
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testId}>
      <Text style={styles.title}>Tags</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagsContainer}
      >
        {allTags.map(tag => {
          const isAssigned = localPersonTags.some(t => t.id === tag.id);
          const isStaff = (myRole === 'admin' || myRole === 'leader');
          const sameFamily = !!(myPerson?.family_id && myPerson.family_id === personWithTags?.family_id);
          const canToggle = isStaff || (sameFamily && tag.self_assignable === true);
          const isPending = pendingActions.has(tag.id);
          const isProcessing = addTagMutation.isPending || removeTagMutation.isPending;

          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagPill,
                isAssigned && styles.tagPillAssigned,
                !canToggle && styles.tagPillDisabled,
                isPending && styles.tagPillPending,
                { backgroundColor: isAssigned ? tag.color || '#7C3AED' : '#F3F4F6' },
              ]}
              onPress={() => stableHandleToggleTag(tag)}
              disabled={!canToggle || isProcessing || isPending}
              testID={`tag-${tag.id}`}
            >
              <Text
                style={[
                  styles.tagText,
                  isAssigned && styles.tagTextAssigned,
                  !canToggle && styles.tagTextDisabled,
                ]}
              >
                {tag.name}
              </Text>
              
              {isPending ? (
                <ActivityIndicator 
                  size={14} 
                  color={isAssigned ? '#FFFFFF' : '#6B7280'} 
                  style={styles.tagIcon}
                />
              ) : canToggle ? (
                <View style={styles.tagIcon}>
                  {isAssigned ? (
                    <X size={14} color={isAssigned ? '#FFFFFF' : '#6B7280'} />
                  ) : (
                    <Plus size={14} color="#6B7280" />
                  )}
                </View>
              ) : (
                <View style={styles.lockedIndicator}>
                  <Lock size={12} color="#9CA3AF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Help text */}
      <Text style={styles.helpText}>
        {(myRole || 'member') === 'admin'
          ? 'You can assign/remove any tag'
          : (myRole || 'member') === 'leader'
          ? 'You can assign/remove tags that require leader role or below'
          : 'You can assign/remove self-assignable tags for yourself and family members'}
      </Text>
      
      {/* Status indicator */}
      {(addTagMutation.isPending || removeTagMutation.isPending) && (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.statusText}>Updating tags...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  tagsContainer: {
    paddingRight: 20,
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tagPillAssigned: {
    borderColor: 'transparent',
  },
  tagPillDisabled: {
    opacity: 0.6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  tagTextAssigned: {
    color: '#FFFFFF',
  },
  tagTextDisabled: {
    color: '#9CA3AF',
  },
  tagIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedIndicator: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
  },
  tagPillPending: {
    opacity: 0.7,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#7C3AED',
    fontStyle: 'italic' as const,
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
});