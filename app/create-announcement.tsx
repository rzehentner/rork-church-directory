import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/hooks/me-context';
import { useToast } from '@/hooks/toast-context';
import { listTags, type Tag } from '@/services/tags';
import { createAnnouncement, getAnnouncement, getAnnouncementTags, updateAnnouncement, setAnnouncementTags } from '@/lib/announcements';
import { 
  ArrowLeft, 
  Send, 
  Calendar, 
  Clock, 
  Users, 
  Tag as TagIcon,
  AlertCircle,
  X,
  Globe
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ImageUploader from '@/components/ImageUploader';
import { uploadAnnouncementImage } from '@/services/event-images';
import { styles } from '@/styles/create-announcement.styles';

interface AnnouncementFormData {
  title: string;
  body: string;
  publishNow: boolean;
  publishAt: string;
  expiresAt: string;
  roleChips: string[];
  tagChips: string[];
  isPublic: boolean;
}

type DatePickerMode = 'date' | 'time' | null;

export default function CreateAnnouncementScreen() {
  const { myRole, profile, userId } = useMe();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  
  const isEditMode = !!edit;
  const announcementId = edit;

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    body: '',
    publishNow: true,
    publishAt: new Date().toISOString(),
    expiresAt: '',
    roleChips: [],
    tagChips: [],
    isPublic: false,
  });
  
  const [isFormInitialized, setIsFormInitialized] = useState(!isEditMode);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState<DatePickerMode>(null);
  const [showPublishDatePicker, setShowPublishDatePicker] = useState<DatePickerMode>(null);

  const isAdminOrLeader = myRole === 'admin' || myRole === 'leader';

  // Fetch available tags for targeting
  const { data: availableTags = [] } = useQuery({
    queryKey: ['tags', 'active'],
    queryFn: () => listTags(true),
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch existing announcement data if in edit mode
  const { data: existingAnnouncement, isLoading: loadingAnnouncement } = useQuery({
    queryKey: ['announcement', announcementId],
    queryFn: () => getAnnouncement(announcementId!),
    enabled: isEditMode && !!announcementId,
    staleTime: 0, // Always fetch fresh data for editing
  });
  
  // Fetch existing announcement tags if in edit mode
  const { data: existingTags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['announcement-tags', announcementId],
    queryFn: () => getAnnouncementTags(announcementId!),
    enabled: isEditMode && !!announcementId,
    staleTime: 0, // Always fetch fresh data for editing
  });
  
  // Initialize form with existing data when in edit mode
  React.useEffect(() => {
    if (isEditMode && existingAnnouncement && existingTags && availableTags.length > 0 && !isFormInitialized) {
      const tagNames = existingTags.map((tag: any) => tag.name);
      const roleChips = existingAnnouncement.roles_allowed || [];
      
      setFormData({
        title: existingAnnouncement.title,
        body: existingAnnouncement.body || '',
        publishNow: existingAnnouncement.is_published && !existingAnnouncement.published_at,
        publishAt: existingAnnouncement.published_at || new Date().toISOString(),
        expiresAt: existingAnnouncement.expires_at || '',
        roleChips: roleChips,
        tagChips: tagNames,
        isPublic: existingAnnouncement.is_public,
      });
      
      setIsFormInitialized(true);
    }
  }, [isEditMode, existingAnnouncement, existingTags, availableTags, isFormInitialized]);

  // Create/Update announcement mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      if (isEditMode && announcementId) {
        const announcement = await updateAnnouncement(announcementId, {
          title: data.title.trim(),
          body: data.body.trim() || null,
          is_public: data.isPublic,
          roles_allowed: data.isPublic ? null : (data.roleChips.length > 0 ? data.roleChips as any : null),
          published_at: data.publishNow ? new Date().toISOString() : data.publishAt,
          expires_at: data.expiresAt || null,
          is_published: data.publishNow || existingAnnouncement?.is_published || false,
        });
        
        const tagIds = availableTags
          .filter(tag => data.tagChips.includes(tag.name))
          .map(tag => tag.id);
        
        await setAnnouncementTags(announcement.id, tagIds);

        if (imageUri) {
          try {
            await uploadAnnouncementImage(imageUri, announcement.id);
          } catch (imgErr) {
            console.error('Image upload failed:', imgErr);
          }
        }
        
        return announcement;
      } else {
        const announcement = await createAnnouncement({
          title: data.title.trim(),
          body: data.body.trim() || null,
          is_public: data.isPublic,
          roles_allowed: data.isPublic ? null : (data.roleChips.length > 0 ? data.roleChips as any : null),
          published_at: data.publishNow ? null : data.publishAt,
          expires_at: data.expiresAt || null,
          publish_immediately: data.publishNow,
          created_by: userId!,
        });

        if (data.tagChips.length > 0) {
          const tagIds = availableTags
            .filter(tag => data.tagChips.includes(tag.name))
            .map(tag => tag.id);
          
          if (tagIds.length > 0) {
            await setAnnouncementTags(announcement.id, tagIds);
          }
        }

        if (imageUri) {
          try {
            await uploadAnnouncementImage(imageUri, announcement.id);
          } catch (imgErr) {
            console.error('Image upload failed:', imgErr);
          }
        }

        return announcement;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-for-me'] });
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement', announcementId] });
      queryClient.invalidateQueries({ queryKey: ['announcement-tags', announcementId] });
      showSuccess(isEditMode ? 'Announcement updated successfully' : 'Announcement created successfully');
      router.push('/(tabs)/admin' as any);
    },
    onError: (error) => {
      console.error('Failed to save announcement:', error);
      showError(isEditMode ? 'Failed to update announcement. Please try again.' : 'Failed to create announcement. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      showError('Title is required');
      return;
    }

    if (formData.title.length > 200) {
      showError('Title is too long (max 200 characters)');
      return;
    }
    if (formData.body.length > 5000) {
      showError('Body is too long (max 5000 characters)');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleAddRoleChip = (role: string) => {
    if (!formData.roleChips.includes(role)) {
      setFormData(prev => ({
        ...prev,
        roleChips: [...prev.roleChips, role]
      }));
    }
  };

  const handleRemoveRoleChip = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roleChips: prev.roleChips.filter(r => r !== role)
    }));
  };

  const handleAddTagChip = (tagName: string) => {
    if (!formData.tagChips.includes(tagName)) {
      setFormData(prev => ({
        ...prev,
        tagChips: [...prev.tagChips, tagName]
      }));
    }
  };

  const handleRemoveTagChip = (tagName: string) => {
    setFormData(prev => ({
      ...prev,
      tagChips: prev.tagChips.filter(t => t !== tagName)
    }));
  };

  const formatDateForInput = (isoString: string) => {
    const date = new Date(isoString);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  };

  const handleDateTimeChange = (field: 'publishAt' | 'expiresAt', value: string) => {
    if (value) {
      const isoString = new Date(value).toISOString();
      setFormData(prev => ({ ...prev, [field]: isoString }));
    } else {
      setFormData(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDatePickerChange = (event: any, selectedDate?: Date, field?: 'publishAt' | 'expiresAt') => {
    // On Android, the picker closes automatically
    if (Platform.OS === 'android') {
      setShowExpiryDatePicker(null);
      setShowPublishDatePicker(null);
      
      // Only update if user didn't cancel (selectedDate exists)
      if (selectedDate && field) {
        setFormData(prev => ({ ...prev, [field]: selectedDate.toISOString() }));
      }
    } else {
      // On iOS, update the date immediately as user scrolls
      if (selectedDate && field) {
        setFormData(prev => ({ ...prev, [field]: selectedDate.toISOString() }));
      }
    }
  };

  const closeDatePicker = () => {
    setShowExpiryDatePicker(null);
    setShowPublishDatePicker(null);
  };

  const handleDatePickerDone = (field: 'publishAt' | 'expiresAt') => {
    // Close the picker
    setShowExpiryDatePicker(null);
    setShowPublishDatePicker(null);
  };

  const formatDateForDisplay = (isoString: string) => {
    if (!isoString) return 'Select date and time';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const clearExpiryDate = () => {
    setFormData(prev => ({ ...prev, expiresAt: '' }));
  };

  if (!isAdminOrLeader) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.unauthorizedTitle}>Unauthorized</Text>
          <Text style={styles.unauthorizedText}>
            You need admin or leader privileges to {isEditMode ? 'edit' : 'create'} announcements
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Show loading state when fetching existing announcement data
  if (isEditMode && (loadingAnnouncement || loadingTags || !isFormInitialized)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading Announcement...</Text>
          <View style={styles.publishButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading announcement data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditMode ? 'Edit Announcement' : 'Create Announcement'}</Text>
        <TouchableOpacity
          style={[styles.publishButton, saveMutation.isPending && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={saveMutation.isPending || (isEditMode && !isFormInitialized)}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size={16} color="#FFFFFF" />
          ) : (
            <Send size={16} color="#FFFFFF" />
          )}
          <Text style={styles.publishButtonText}>
            {isEditMode ? 'Update' : (formData.publishNow ? 'Publish' : 'Schedule')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.titleInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Enter announcement title"
              placeholderTextColor="#9CA3AF"
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {formData.title.length}/200
            </Text>
          </View>

          {/* Body */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Message *</Text>
            <TextInput
              style={styles.bodyInput}
              value={formData.body}
              onChangeText={(text) => setFormData(prev => ({ ...prev, body: text }))}
              placeholder="Write your announcement message here..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={5000}
            />
            <Text style={styles.characterCount}>
              {formData.body.length}/5000
            </Text>
          </View>

          {/* Publish Settings */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Publishing</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Publish now</Text>
                <Text style={styles.switchDescription}>
                  {formData.publishNow ? 'Will be published immediately' : 'Schedule for later'}
                </Text>
              </View>
              <Switch
                value={formData.publishNow}
                onValueChange={(value) => setFormData(prev => ({ ...prev, publishNow: value }))}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={formData.publishNow ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>

            {!formData.publishNow && (
              <View style={styles.dateTimeContainer}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.dateTimeLabel}>Publish at:</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowPublishDatePicker('date')}
                >
                  <Text style={styles.datePickerButtonText}>
                    {formatDateForDisplay(formData.publishAt)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Public Toggle */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Visibility</Text>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <View style={styles.switchLabelRow}>
                  <Globe size={16} color={formData.isPublic ? '#10B981' : '#6B7280'} />
                  <Text style={styles.switchLabel}>Public</Text>
                </View>
                <Text style={styles.switchDescription}>
                  {formData.isPublic 
                    ? 'Visible to all signed-in users (roles ignored, tags for filtering only)' 
                    : 'Visible based on roles and tags below'
                  }
                </Text>
              </View>
              <Switch
                value={formData.isPublic}
                onValueChange={(value) => setFormData(prev => ({ ...prev, isPublic: value }))}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={formData.isPublic ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>

          {/* Expiry */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Expiry (Optional)</Text>
            <View style={styles.dateTimeContainer}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.dateTimeLabel}>Expires at:</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowExpiryDatePicker('date')}
              >
                <Text style={[
                  styles.datePickerButtonText,
                  !formData.expiresAt && styles.datePickerPlaceholder
                ]}>
                  {formatDateForDisplay(formData.expiresAt)}
                </Text>
              </TouchableOpacity>
              {formData.expiresAt ? (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={clearExpiryDate}
                >
                  <X size={16} color="#EF4444" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Role Targeting */}
          {!formData.isPublic && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Roles (Optional)</Text>
              <Text style={styles.formDescription}>
                Leave empty to send to everyone, or select specific roles
              </Text>
              <View style={styles.chipContainer}>
                {['member', 'leader', 'admin'].map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.chip,
                      formData.roleChips.includes(role) && styles.chipSelected
                    ]}
                    onPress={() => 
                      formData.roleChips.includes(role) 
                        ? handleRemoveRoleChip(role)
                        : handleAddRoleChip(role)
                    }
                  >
                    <Users size={12} color={formData.roleChips.includes(role) ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[
                      styles.chipText,
                      formData.roleChips.includes(role) && styles.chipTextSelected
                    ]}>
                      {role}
                    </Text>
                    {formData.roleChips.includes(role) && (
                      <X size={12} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Tag Targeting */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Tags (Optional)</Text>
            <Text style={styles.formDescription}>
              {formData.isPublic 
                ? 'Add tags for filtering and organization (doesn\'t affect visibility)'
                : 'Send to people with specific tags'
              }
            </Text>
            <View style={styles.chipContainer}>
              {availableTags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.chip,
                    formData.tagChips.includes(tag.name) && styles.chipSelected,
                    { borderColor: tag.color || '#E5E7EB' }
                  ]}
                  onPress={() => 
                    formData.tagChips.includes(tag.name)
                      ? handleRemoveTagChip(tag.name)
                      : handleAddTagChip(tag.name)
                  }
                >
                  <TagIcon size={12} color={formData.tagChips.includes(tag.name) ? '#FFFFFF' : tag.color || '#6B7280'} />
                  <Text style={[
                    styles.chipText,
                    formData.tagChips.includes(tag.name) && styles.chipTextSelected
                  ]}>
                    {tag.name}
                  </Text>
                  {formData.tagChips.includes(tag.name) && (
                    <X size={12} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Image */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Image (Optional)</Text>
            <View style={styles.imageUploaderContainer}>
              <ImageUploader
                currentImageUrl={imageUri}
                onUpload={async (file) => {
                  console.log('[CreateAnnouncement] Image selected:', file.uri);
                  setImageUri(file.uri);
                  return file.uri;
                }}
                placeholder="Add Image"
                size={200}
                isCircular={false}
                aspectRatio={{ width: 16, height: 9 }}
                disabled={saveMutation.isPending}
              />
            </View>
          </View>

          {/* Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewCardTitle}>
                {formData.title || 'Announcement Title'}
              </Text>
              <Text style={styles.previewCardBody}>
                {formData.body || 'Your announcement message will appear here...'}
              </Text>
              {formData.isPublic ? (
                <View style={styles.previewTags}>
                  <Globe size={12} color="#10B981" />
                  <Text style={[styles.previewTagsText, { color: '#10B981' }]}>
                    Public - visible to all signed-in users
                  </Text>
                </View>
              ) : (formData.roleChips.length > 0 || formData.tagChips.length > 0) ? (
                <View style={styles.previewTags}>
                  <TagIcon size={12} color="#6B7280" />
                  <Text style={styles.previewTagsText}>
                    {[...formData.roleChips, ...formData.tagChips].join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showExpiryDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => {
                setShowExpiryDatePicker(null);
              }}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Expiry Date</Text>
              <TouchableOpacity onPress={() => {
                setShowExpiryDatePicker(null);
              }}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={formData.expiresAt ? new Date(formData.expiresAt) : new Date()}
              mode={showExpiryDatePicker}
              display="spinner"
              onChange={(event, selectedDate) => handleDatePickerChange(event, selectedDate, 'expiresAt')}
              minimumDate={new Date()}
              textColor="#1F2937"
              accentColor="#7C3AED"
            />
          </View>
        </View>
      )}

      {showExpiryDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={formData.expiresAt ? new Date(formData.expiresAt) : new Date()}
          mode={showExpiryDatePicker}
          display="default"
          onChange={(event, selectedDate) => handleDatePickerChange(event, selectedDate, 'expiresAt')}
          minimumDate={new Date()}
          textColor="#1F2937"
          accentColor="#7C3AED"
        />
      )}

      {showPublishDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => {
                setShowPublishDatePicker(null);
              }}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Select Publish Date</Text>
              <TouchableOpacity onPress={() => {
                setShowPublishDatePicker(null);
              }}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={new Date(formData.publishAt)}
              mode={showPublishDatePicker}
              display="spinner"
              onChange={(event, selectedDate) => handleDatePickerChange(event, selectedDate, 'publishAt')}
              minimumDate={new Date()}
              textColor="#1F2937"
              accentColor="#7C3AED"
            />
          </View>
        </View>
      )}

      {showPublishDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={new Date(formData.publishAt)}
          mode={showPublishDatePicker}
          display="default"
          onChange={(event, selectedDate) => handleDatePickerChange(event, selectedDate, 'publishAt')}
          minimumDate={new Date()}
          textColor="#1F2937"
          accentColor="#7C3AED"
        />
      )}
    </SafeAreaView>
  );
}