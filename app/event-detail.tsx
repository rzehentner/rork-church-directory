import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { 
  MapPin, 
  Clock, 
  Calendar as CalendarIcon, 
  Users, 
  Edit3,
  Share2,
  ExternalLink,
  ChevronLeft
} from 'lucide-react-native'
import { 
  getEvent, 
  rsvpEvent, 
  eventImageUrl, 
  getEventRSVPs,
  type RSVP, 
  type EventRSVP 
} from '@/services/events'
import { addEventToDevice } from '@/utils/calendar'
import { useMe } from '@/hooks/me-context'
import { useToast } from '@/hooks/toast-context'
import { listTags, type Tag } from '@/services/tags'
import TagPill from '@/components/TagPill'

type EventDetail = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
  location: string | null
  image_path: string | null
  my_rsvp: RSVP | null
  audience_tags: string[]
  author_name: string | null
  is_public: boolean
  created_by: string
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [rsvps, setRSVPs] = useState<EventRSVP[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRSVPLoading] = useState(false)
  
  const { profile, myRole, isLoading: meLoading } = useMe()
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()
  const isStaff = myRole === 'admin' || myRole === 'leader'
  const canViewRSVPs = isStaff
  const canEdit = isStaff && event?.created_by === profile?.id



  const loadTags = async () => {
    try {
      const tags = await listTags(true)
      setAvailableTags(tags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const loadEventCallback = useCallback(async () => {
    if (!id) {
      showToast('error', 'Invalid event ID')
      router.back()
      return
    }

    try {
      console.log('Loading event with ID:', id)
      const eventData = await getEvent(id)
      console.log('Event loaded:', eventData)
      setEvent(eventData as EventDetail)
    } catch (error) {
      console.error('Failed to load event:', error)
      showToast('error', 'Failed to load event details')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id, showToast])

  useEffect(() => {
    loadEventCallback()
    loadTags()
  }, [loadEventCallback])

  // Load RSVPs separately when role is loaded and user is staff
  useEffect(() => {
    const loadRSVPs = async () => {
      if (!id || !event || meLoading || !canViewRSVPs) return
      
      try {
        console.log('Loading RSVPs for event:', id, 'as staff user with role:', myRole)
        const rsvpData = await getEventRSVPs(id)
        console.log('RSVPs loaded:', rsvpData)
        setRSVPs(rsvpData)
      } catch (error) {
        console.error('Failed to load RSVPs:', error)
        // Don't show error for RSVPs as it's not critical
      }
    }
    
    loadRSVPs()
  }, [id, event, meLoading, canViewRSVPs, myRole])



  const handleRSVP = async (status: RSVP) => {
    if (!event || !status?.trim()) return
    
    const validStatuses: RSVP[] = ['going', 'maybe', 'declined']
    if (!validStatuses.includes(status)) return
    
    setRSVPLoading(true)
    try {
      // Optimistic update
      setEvent(prev => prev ? { ...prev, my_rsvp: status } : null)
      
      await rsvpEvent(event.id, status)
      showToast('success', `RSVP updated to ${status}`)
      
      // Reload RSVPs if staff to see updated list
      if (canViewRSVPs) {
        const rsvpData = await getEventRSVPs(event.id)
        setRSVPs(rsvpData)
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      // Revert optimistic update
      setEvent(prev => prev ? { ...prev, my_rsvp: event.my_rsvp } : null)
      showToast('error', 'Failed to update RSVP')
    } finally {
      setRSVPLoading(false)
    }
  }

  const handleAddToCalendar = async () => {
    if (!event) return
    
    try {
      console.log('Adding event to calendar:', event.id, event.title)
      await addEventToDevice(event)
      showToast('success', 'Event added to calendar')
    } catch (error) {
      console.error('Failed to add to calendar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add to calendar'
      showToast('error', errorMessage)
    }
  }

  const handleShare = async () => {
    if (!event) return
    
    try {
      const message = `Check out this event: ${event.title}\n\n${formatEventTime(event)}${event.location ? `\nLocation: ${event.location}` : ''}${event.description ? `\n\n${event.description}` : ''}`
      
      // For web, copy to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message)
        showToast('success', 'Event details copied to clipboard')
      } else {
        // For mobile, use native sharing if available
        showToast('info', 'Sharing not available')
      }
    } catch (error) {
      console.error('Failed to share event:', error)
      showToast('error', 'Failed to share event')
    }
  }

  const handleLocationPress = () => {
    if (!event?.location) return
    
    const encodedLocation = encodeURIComponent(event.location)
    const url = `https://maps.google.com/?q=${encodedLocation}`
    
    Linking.openURL(url).catch(() => {
      showToast('error', 'Could not open maps')
    })
  }

  const formatEventTime = (event: EventDetail) => {
    const start = new Date(event.start_at)
    const end = new Date(event.end_at)
    
    if (event.is_all_day) {
      const sameDay = start.toDateString() === end.toDateString()
      if (sameDay) {
        return `All day • ${start.toLocaleDateString()}`
      }
      return `All day • ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }
    
    const sameDay = start.toDateString() === end.toDateString()
    if (sameDay) {
      return `${start.toLocaleDateString()} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    
    return `${start.toLocaleString()} - ${end.toLocaleString()}`
  }

  const getRSVPCounts = () => {
    const counts = { going: 0, maybe: 0, declined: 0 }
    rsvps.forEach(rsvp => {
      counts[rsvp.status]++
    })
    return counts
  }

  const RSVPButtons = () => {
    if (!event) return null
    
    return (
      <View style={styles.rsvpContainer}>
        <Text style={styles.sectionTitle}>Your RSVP</Text>
        <View style={styles.rsvpButtons}>
          {(['going', 'maybe', 'declined'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.rsvpButton,
                event.my_rsvp === status && styles.rsvpButtonActive,
                status === 'going' && event.my_rsvp === status && styles.rsvpButtonGoing,
                status === 'maybe' && event.my_rsvp === status && styles.rsvpButtonMaybe,
                status === 'declined' && event.my_rsvp === status && styles.rsvpButtonDeclined,
              ]}
              onPress={() => handleRSVP(status)}
              disabled={rsvpLoading}
            >
              {rsvpLoading && event.my_rsvp === status ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[
                  styles.rsvpButtonText,
                  event.my_rsvp === status && styles.rsvpButtonTextActive
                ]}>
                  {status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Can\'t Go'}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  const RSVPList = () => {
    console.log('RSVPList render - canViewRSVPs:', canViewRSVPs, 'rsvps.length:', rsvps.length, 'myRole:', myRole, 'isStaff:', isStaff)
    
    // Show debug info for admins when no RSVPs
    if (canViewRSVPs && rsvps.length === 0) {
      return (
        <View style={styles.rsvpListContainer}>
          <Text style={styles.sectionTitle}>RSVPs (Debug Info)</Text>
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>Role: {myRole}</Text>
            <Text style={styles.debugText}>Is Staff: {isStaff ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Can View RSVPs: {canViewRSVPs ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>RSVPs Length: {rsvps.length}</Text>
            <Text style={styles.debugText}>Event ID: {event?.id}</Text>
            <Text style={styles.debugText}>Me Loading: {meLoading ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      )
    }
    
    if (!canViewRSVPs || rsvps.length === 0) return null
    
    const counts = getRSVPCounts()
    
    return (
      <View style={styles.rsvpListContainer}>
        <Text style={styles.sectionTitle}>RSVPs ({rsvps.length})</Text>
        
        {/* RSVP Summary */}
        <View style={styles.rsvpSummary}>
          <View style={styles.rsvpSummaryItem}>
            <View style={[styles.rsvpSummaryDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.rsvpSummaryText}>{counts.going} Going</Text>
          </View>
          <View style={styles.rsvpSummaryItem}>
            <View style={[styles.rsvpSummaryDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.rsvpSummaryText}>{counts.maybe} Maybe</Text>
          </View>
          <View style={styles.rsvpSummaryItem}>
            <View style={[styles.rsvpSummaryDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.rsvpSummaryText}>{counts.declined} Can&apos;t Go</Text>
          </View>
        </View>
        
        {/* RSVP List */}
        <View style={styles.rsvpList}>
          {rsvps.map((rsvp) => (
            <View key={rsvp.person_id} style={styles.rsvpItem}>
              <View style={styles.rsvpItemInfo}>
                <Text style={styles.rsvpItemName}>
                  {`${rsvp.first_name} ${rsvp.last_name}`.trim()}
                </Text>
                {rsvp.family_name && (
                  <Text style={styles.rsvpItemFamily}>{rsvp.family_name}</Text>
                )}
                <Text style={styles.rsvpItemDate}>
                  {new Date(rsvp.responded_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.rsvpItemStatus,
                rsvp.status === 'going' && styles.rsvpStatusGoing,
                rsvp.status === 'maybe' && styles.rsvpStatusMaybe,
                rsvp.status === 'declined' && styles.rsvpStatusDeclined,
              ]}>
                <Text style={styles.rsvpItemStatusText}>
                  {rsvp.status === 'going' ? 'Going' : 
                   rsvp.status === 'maybe' ? 'Maybe' : 'Can\'t Go'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Event Details' }} />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    )
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Event Not Found' }} />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#7C3AED" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: event.title,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Share2 size={20} color="#7C3AED" />
              </TouchableOpacity>
              {canEdit && (
                <TouchableOpacity 
                  onPress={() => router.push(`/edit-event?id=${event.id}` as any)}
                  style={styles.headerButton}
                >
                  <Edit3 size={20} color="#7C3AED" />
                </TouchableOpacity>
              )}
            </View>
          )
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Event Image */}
        {event.image_path && (
          <Image 
            source={{ uri: eventImageUrl(event.image_path)! }} 
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.content}>
          {/* Event Title */}
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          {/* Event Meta */}
          <View style={styles.eventMeta}>
            <View style={styles.metaRow}>
              <Clock size={20} color="#6B7280" />
              <Text style={styles.metaText}>{formatEventTime(event)}</Text>
            </View>
            
            {event.location && (
              <TouchableOpacity style={styles.metaRow} onPress={handleLocationPress}>
                <MapPin size={20} color="#6B7280" />
                <Text style={[styles.metaText, styles.locationText]}>{event.location}</Text>
                <ExternalLink size={16} color="#7C3AED" style={styles.locationIcon} />
              </TouchableOpacity>
            )}
            
            {event.author_name && (
              <View style={styles.metaRow}>
                <Users size={20} color="#6B7280" />
                <Text style={styles.metaText}>Created by {event.author_name}</Text>
              </View>
            )}
          </View>

          {/* Event Tags */}
          {event.audience_tags && event.audience_tags.length > 0 && (
            <View style={styles.eventTags}>
              {event.audience_tags.map((tagName) => {
                const tag = availableTags.find(t => t.name === tagName)
                if (!tag) return null
                return (
                  <TagPill
                    key={tagName}
                    tag={tag}
                    size="medium"
                    testId={`event-tag-${tagName}`}
                  />
                )
              })}
            </View>
          )}

          {/* Event Description */}
          {event.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>
            </View>
          )}

          {/* RSVP Buttons */}
          <RSVPButtons />
          
          {/* Add to Calendar Button */}
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={handleAddToCalendar}
          >
            <CalendarIcon size={20} color="#7C3AED" />
            <Text style={styles.calendarButtonText}>Add to Calendar</Text>
          </TouchableOpacity>

          {/* RSVP List for Staff */}
          <RSVPList />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  eventImage: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 36,
  },
  eventMeta: {
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },
  locationIcon: {
    marginLeft: 8,
  },
  eventTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  descriptionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  eventDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  rsvpContainer: {
    marginBottom: 20,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  rsvpButtonActive: {
    borderColor: '#7C3AED',
  },
  rsvpButtonGoing: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  rsvpButtonMaybe: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  rsvpButtonDeclined: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  rsvpButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  rsvpButtonTextActive: {
    color: '#FFFFFF',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    backgroundColor: '#FFFFFF',
    gap: 12,
    marginBottom: 32,
  },
  calendarButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  rsvpListContainer: {
    marginTop: 8,
  },
  rsvpSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rsvpSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rsvpSummaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rsvpSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  rsvpList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rsvpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rsvpItemInfo: {
    flex: 1,
  },
  rsvpItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  rsvpItemFamily: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  rsvpItemDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  rsvpItemStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  rsvpStatusGoing: {
    backgroundColor: '#D1FAE5',
  },
  rsvpStatusMaybe: {
    backgroundColor: '#FEF3C7',
  },
  rsvpStatusDeclined: {
    backgroundColor: '#FEE2E2',
  },
  rsvpItemStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  debugText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
})