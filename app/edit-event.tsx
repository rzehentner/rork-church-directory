import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { MapPin, Trash2 } from 'lucide-react-native'
import { getEvent, updateEvent, setEventTags, getEventTags, setEventRoles } from '@/services/events'
import { eventImageUrl, uploadEventImage } from '@/services/event-images'
import { useToast } from '@/hooks/toast-context'
import { useMe } from '@/hooks/me-context'
import { supabase } from '@/lib/supabase'
import EventTagPicker from '@/components/EventTagPicker'
import ImageUploader from '@/components/ImageUploader'
import { createEventStyles as styles } from '@/styles/create-event.styles'

type Event = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
  location: string | null
  image_path: string | null
  is_public: boolean
  role_tags?: string[] | null
}

export default function EditEventScreen() {
  const params = useLocalSearchParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [event, setEvent] = useState<Event | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<('admin'|'leader'|'member'|'visitor')[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const { myRole } = useMe()
  const { showToast } = useToast()

  const canEdit = myRole === 'admin' || myRole === 'leader'

  useEffect(() => {
    if (!canEdit) {
      showToast('error', 'You do not have permission to edit events')
      router.back()
      return
    }

    if (id && typeof id === 'string') {
      loadEvent(id)
    }
  }, [id, canEdit])

  const loadEvent = async (eventId: string) => {
    try {
      const [eventData, eventTags] = await Promise.all([
        getEvent(eventId),
        getEventTags(eventId)
      ])
      
      setEvent(eventData)
      setTitle(eventData.title)
      setDescription(eventData.description || '')
      setLocation(eventData.location || '')
      setStartDate(formatDateForInput(new Date(eventData.start_at)))
      setEndDate(formatDateForInput(new Date(eventData.end_at)))
      setIsAllDay(eventData.is_all_day)
      setIsPublic(eventData.is_public)
      setSelectedRoles((eventData.role_tags || []) as ('admin'|'leader'|'member'|'visitor')[])
      setCurrentImagePath(eventData.image_path)
      setSelectedTags(eventTags.map(tag => tag.id))
    } catch (error) {
      showToast('error', 'Failed to load event')
      router.back()
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSave = async () => {
    if (!event) return

    if (!title.trim()) {
      showToast('error', 'Please enter an event title')
      return
    }

    if (!startDate || !endDate) {
      showToast('error', 'Please select start and end dates')
      return
    }

    setLoading(true)
    try {
      const updateData = {
        title: title.trim(),
        description: description.trim() || null,
        start_at: startDate,
        end_at: endDate,
        is_all_day: isAllDay,
        location: location.trim() || null,
        is_public: isPublic,
      }

      const roles = isPublic ? [] : selectedRoles
      await updateEvent(event.id, updateData, roles)

      await setEventTags(event.id, selectedTags)

      // Upload image (optional)
      if (imageUri) {
        try {
          await uploadEventImage(imageUri, event.id)
        } catch {
          // Don't fail the entire event update if image upload fails
          showToast('warning', 'Event updated but image upload failed')
        }
      }

      showToast('success', 'Event updated successfully')
      router.back()
    } catch (error) {
      showToast('error', 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id)
              
              if (error) throw error
              
              showToast('success', 'Event deleted successfully')
              router.back()
            } catch (error) {
              showToast('error', 'Failed to delete event')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 16)
  }

  const handleStartDateChange = (text: string) => {
    setStartDate(text)
    if (!endDate || new Date(text) > new Date(endDate)) {
      const start = new Date(text)
      start.setHours(start.getHours() + 1)
      setEndDate(formatDateForInput(start))
    }
  }

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Event' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    )
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Event Not Found' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <Stack.Screen
        options={{
          title: 'Edit Event',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={loading}
                style={styles.deleteButton}
              >
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              >
                <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter event title"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter event description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWithIcon}>
                <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIconText]}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Enter event location"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>All Day Event</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
                trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
                thumbColor={isAllDay ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateInput}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={handleStartDateChange}
                  placeholder="YYYY-MM-DDTHH:MM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              
              <View style={styles.dateInput}>
                <Text style={styles.label}>End Date *</Text>
                <TextInput
                  style={styles.input}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DDTHH:MM"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Image</Text>
            <View style={styles.imageUploaderContainer}>
              <ImageUploader
                currentImageUrl={imageUri || (currentImagePath ? eventImageUrl(currentImagePath) : null)}
                onUpload={async (file) => {
                  // Store the local URI for later upload
                  setImageUri(file.uri)
                  // Return the local URI to show in the UI
                  return file.uri
                }}
                placeholder="Add Event Photo"
                size={200}
                isCircular={false}
                aspectRatio={{ width: 16, height: 9 }}
                disabled={loading}
              />
            </View>
            <Text style={styles.imageHelpText}>
              Tap to select an event photo. You can crop and adjust it before saving.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visibility</Text>
            
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Public Event</Text>
                <Text style={styles.switchDescription}>
                  Public events are visible to all signed-in users
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#D1D5DB', true: '#7C3AED' }}
                thumbColor={isPublic ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            {!isPublic && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Allowed Roles</Text>
                <View style={styles.roleContainer}>
                  {(['admin', 'leader', 'member', 'visitor'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        selectedRoles.includes(role) && styles.roleChipSelected
                      ]}
                      onPress={() => {
                        setSelectedRoles(prev => 
                          prev.includes(role) 
                            ? prev.filter(r => r !== role)
                            : [...prev, role]
                        )
                      }}
                    >
                      <Text style={[
                        styles.roleChipText,
                        selectedRoles.includes(role) && styles.roleChipTextSelected
                      ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <EventTagPicker
              selectedTagIds={selectedTags}
              onTagsChange={setSelectedTags}
              disabled={false}
              testId="edit-event-tag-picker"
            />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}