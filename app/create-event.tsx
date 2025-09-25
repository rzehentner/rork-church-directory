import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Image,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Stack, router } from 'expo-router'
import { MapPin } from 'lucide-react-native'
import { createEvent, setEventTags, uploadEventImage, scheduleReminder } from '@/services/events'
import { useToast } from '@/hooks/toast-context'
import { useUser } from '@/hooks/user-context'
import EventTagPicker from '@/components/EventTagPicker'



export default function CreateEventScreen() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000)) // 1 hour later
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [tempStartDate, setTempStartDate] = useState(new Date())
  const [tempEndDate, setTempEndDate] = useState(new Date())
  const [isAllDay, setIsAllDay] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [selectedRoles, setSelectedRoles] = useState<('admin'|'leader'|'member'|'visitor')[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [enableReminders, setEnableReminders] = useState(true)
  const [reminderMinutes, setReminderMinutes] = useState(60)
  const [loading, setLoading] = useState(false)
  const { profile } = useUser()
  const { showToast } = useToast()

  const isStaff = profile?.role === 'admin' || profile?.role === 'leader'

  useEffect(() => {
    if (!isStaff) {
      showToast('error', 'You do not have permission to create events')
      router.back()
    }
  }, [isStaff])

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('error', 'Please enter an event title')
      return
    }

    if (!startDate || !endDate) {
      showToast('error', 'Please select start and end dates')
      return
    }

    if (startDate >= endDate) {
      showToast('error', 'End date must be after start date')
      return
    }

    setLoading(true)
    try {
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        is_all_day: isAllDay,
        location: location.trim() || null,
        is_public: isPublic,
        roles_allowed: isPublic ? null : selectedRoles.length > 0 ? selectedRoles : null,
      }

      console.log('Creating event with data:', eventData)
      const event = await createEvent(eventData)
      console.log('Event created successfully:', event.id)

      // Set audience tags (only matter when private; we still keep them on public)
      if (selectedTags.length > 0) {
        console.log('Setting event tags:', selectedTags)
        await setEventTags(event.id, selectedTags)
      }

      // Upload image (optional)
      if (imageUri) {
        console.log('Uploading event image')
        await uploadEventImage(imageUri, event.id)
      }

      // Schedule event reminder if enabled
      if (enableReminders) {
        try {
          console.log(`Scheduling reminder ${reminderMinutes} minutes before event`)
          await scheduleReminder(event.id, reminderMinutes, true)
          console.log('Event reminder scheduled successfully')
        } catch (error) {
          console.error('Failed to schedule event reminder:', error)
          // Don't fail the event creation if reminder scheduling fails
        }
      }

      showToast('success', 'Event created successfully')
      router.back()
    } catch (error) {
      console.error('Failed to create event:', error)
      showToast('error', 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false)
      if (selectedDate) {
        const newStartDate = new Date(startDate)
        newStartDate.setFullYear(selectedDate.getFullYear())
        newStartDate.setMonth(selectedDate.getMonth())
        newStartDate.setDate(selectedDate.getDate())
        setStartDate(newStartDate)
        
        // Auto-adjust end date if it's before the new start date
        if (newStartDate >= endDate) {
          const newEndDate = new Date(newStartDate)
          newEndDate.setHours(newEndDate.getHours() + 1)
          setEndDate(newEndDate)
        }
      }
    } else {
      // iOS - just update temp date, don't close picker
      if (selectedDate) {
        setTempStartDate(selectedDate)
      }
    }
  }

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartTimePicker(false)
      if (selectedTime) {
        const newStartDate = new Date(startDate)
        newStartDate.setHours(selectedTime.getHours())
        newStartDate.setMinutes(selectedTime.getMinutes())
        setStartDate(newStartDate)
        
        // Auto-adjust end date if it's before the new start date
        if (newStartDate >= endDate) {
          const newEndDate = new Date(newStartDate)
          newEndDate.setHours(newEndDate.getHours() + 1)
          setEndDate(newEndDate)
        }
      }
    } else {
      // iOS - just update temp date, don't close picker
      if (selectedTime) {
        setTempStartDate(selectedTime)
      }
    }
  }

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false)
      if (selectedDate) {
        const newEndDate = new Date(endDate)
        newEndDate.setFullYear(selectedDate.getFullYear())
        newEndDate.setMonth(selectedDate.getMonth())
        newEndDate.setDate(selectedDate.getDate())
        setEndDate(newEndDate)
      }
    } else {
      // iOS - just update temp date, don't close picker
      if (selectedDate) {
        setTempEndDate(selectedDate)
      }
    }
  }

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false)
      if (selectedTime) {
        const newEndDate = new Date(endDate)
        newEndDate.setHours(selectedTime.getHours())
        newEndDate.setMinutes(selectedTime.getMinutes())
        setEndDate(newEndDate)
      }
    } else {
      // iOS - just update temp date, don't close picker
      if (selectedTime) {
        setTempEndDate(selectedTime)
      }
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Create Event',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            >
              <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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

            <View style={styles.dateTimeSection}>
              <View style={styles.dateTimeGroup}>
                <Text style={styles.label}>Start Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.dateButton]}
                    onPress={() => {
                      setTempStartDate(startDate)
                      setShowStartDatePicker(true)
                    }}
                  >
                    <Text style={styles.dateTimeButtonText}>{formatDate(startDate)}</Text>
                  </TouchableOpacity>
                  {!isAllDay && (
                    <TouchableOpacity
                      style={[styles.dateTimeButton, styles.timeButton]}
                      onPress={() => {
                        setTempStartDate(startDate)
                        setShowStartTimePicker(true)
                      }}
                    >
                      <Text style={styles.dateTimeButtonText}>{formatTime(startDate)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <View style={styles.dateTimeGroup}>
                <Text style={styles.label}>End Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.dateTimeButton, styles.dateButton]}
                    onPress={() => {
                      setTempEndDate(endDate)
                      setShowEndDatePicker(true)
                    }}
                  >
                    <Text style={styles.dateTimeButtonText}>{formatDate(endDate)}</Text>
                  </TouchableOpacity>
                  {!isAllDay && (
                    <TouchableOpacity
                      style={[styles.dateTimeButton, styles.timeButton]}
                      onPress={() => {
                        setTempEndDate(endDate)
                        setShowEndTimePicker(true)
                      }}
                    >
                      <Text style={styles.dateTimeButtonText}>{formatTime(endDate)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {showStartDatePicker && (
              <View style={styles.datePickerContainer}>
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={() => setShowStartDatePicker(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.confirmButton]}
                      onPress={() => {
                        const newStartDate = new Date(startDate)
                        newStartDate.setFullYear(tempStartDate.getFullYear())
                        newStartDate.setMonth(tempStartDate.getMonth())
                        newStartDate.setDate(tempStartDate.getDate())
                        setStartDate(newStartDate)
                        
                        // Auto-adjust end date if it's before the new start date
                        if (newStartDate >= endDate) {
                          const newEndDate = new Date(newStartDate)
                          newEndDate.setHours(newEndDate.getHours() + 1)
                          setEndDate(newEndDate)
                        }
                        setShowStartDatePicker(false)
                      }}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={Platform.OS === 'ios' ? tempStartDate : startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                  minimumDate={new Date()}
                  style={styles.datePicker}
                  textColor="#111827"
                  accentColor="#7C3AED"
                />
              </View>
            )}
            
            {showStartTimePicker && (
              <View style={styles.datePickerContainer}>
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={() => setShowStartTimePicker(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.confirmButton]}
                      onPress={() => {
                        const newStartDate = new Date(startDate)
                        newStartDate.setHours(tempStartDate.getHours())
                        newStartDate.setMinutes(tempStartDate.getMinutes())
                        setStartDate(newStartDate)
                        
                        // Auto-adjust end date if it's before the new start date
                        if (newStartDate >= endDate) {
                          const newEndDate = new Date(newStartDate)
                          newEndDate.setHours(newEndDate.getHours() + 1)
                          setEndDate(newEndDate)
                        }
                        setShowStartTimePicker(false)
                      }}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={Platform.OS === 'ios' ? tempStartDate : startDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartTimeChange}
                  style={styles.datePicker}
                  textColor="#111827"
                  accentColor="#7C3AED"
                />
              </View>
            )}
            
            {showEndDatePicker && (
              <View style={styles.datePickerContainer}>
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={() => setShowEndDatePicker(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.confirmButton]}
                      onPress={() => {
                        const newEndDate = new Date(endDate)
                        newEndDate.setFullYear(tempEndDate.getFullYear())
                        newEndDate.setMonth(tempEndDate.getMonth())
                        newEndDate.setDate(tempEndDate.getDate())
                        setEndDate(newEndDate)
                        setShowEndDatePicker(false)
                      }}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={Platform.OS === 'ios' ? tempEndDate : endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                  minimumDate={startDate}
                  style={styles.datePicker}
                  textColor="#111827"
                  accentColor="#7C3AED"
                />
              </View>
            )}
            
            {showEndTimePicker && (
              <View style={styles.datePickerContainer}>
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.cancelButton]}
                      onPress={() => setShowEndTimePicker(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.datePickerButton, styles.confirmButton]}
                      onPress={() => {
                        const newEndDate = new Date(endDate)
                        newEndDate.setHours(tempEndDate.getHours())
                        newEndDate.setMinutes(tempEndDate.getMinutes())
                        setEndDate(newEndDate)
                        setShowEndTimePicker(false)
                      }}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={Platform.OS === 'ios' ? tempEndDate : endDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndTimeChange}
                  style={styles.datePicker}
                  textColor="#111827"
                  accentColor="#7C3AED"
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Image</Text>
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={async () => {
                const ImagePicker = await import('expo-image-picker')
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
                if (status !== 'granted') {
                  showToast('error', 'Permission needed to access photos')
                  return
                }
                
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [16, 9],
                  quality: 0.8,
                })
                
                if (!result.canceled && result.assets[0]) {
                  setImageUri(result.assets[0].uri)
                }
              }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>Tap to add event image</Text>
                </View>
              )}
            </TouchableOpacity>
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
              testId="create-event-tag-picker"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#7C3AED',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonTextDisabled: {
    color: '#D1D5DB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 16,
    zIndex: 1,
  },
  inputWithIconText: {
    paddingLeft: 44,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  dateTimeSection: {
    gap: 16,
  },
  dateTimeGroup: {
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    flex: 2,
  },
  timeButton: {
    flex: 1,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  roleChipSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  roleChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
  },
  datePicker: {
    height: 120,
    width: '100%',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  datePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
})