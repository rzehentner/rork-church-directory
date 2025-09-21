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
} from 'react-native'
import { Stack, router } from 'expo-router'
import { MapPin } from 'lucide-react-native'
import { createEvent, setEventTags } from '@/services/events'
import { uploadEventImage } from '@/utils/uploadEventImage'
import { useToast } from '@/hooks/toast-context'
import { useUser } from '@/hooks/user-context'



export default function CreateEventScreen() {
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

    setLoading(true)
    try {
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_at: startDate,
        end_at: endDate,
        is_all_day: isAllDay,
        location: location.trim() || null,
        is_public: isPublic,
        roles_allowed: isPublic ? null : selectedRoles.length > 0 ? selectedRoles : null,
      }

      const event = await createEvent(eventData)

      if (!isPublic && selectedTags.length > 0) {
        await setEventTags(event.id, selectedTags)
      }

      if (imageUri) {
        await uploadEventImage(imageUri, event.id)
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
              <>
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

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Target Audience Tags</Text>
                  <Text style={styles.switchDescription}>
                    Tag selection will be available in a future update
                  </Text>
                </View>
              </>
            )}
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
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
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
})