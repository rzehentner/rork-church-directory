import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { MapPin, Clock, Calendar as CalendarIcon, ArrowLeft, Edit3, Users } from 'lucide-react-native'
import { listUpcomingEvents, rsvpEvent, eventImageUrl, getEventTags, getEventRSVPs, type RSVP, type EventRSVP } from '@/services/events'
import { addEventToDevice } from '@/utils/calendar'
import { useToast } from '@/hooks/toast-context'
import { useMe } from '@/hooks/me-context'
import { type Tag } from '@/services/tags'

type Event = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
  location: string | null
  image_path: string | null
  my_rsvp: RSVP | null
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [eventTags, setEventTags] = useState<Tag[]>([])
  const [eventRSVPs, setEventRSVPs] = useState<EventRSVP[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()
  const { myRole } = useMe()

  const loadEvent = async () => {
    try {
      const events = await listUpcomingEvents()
      const foundEvent = events.find(e => e.id === id) as Event | undefined
      setEvent(foundEvent || null)
      
      if (foundEvent) {
        const tags = await getEventTags(foundEvent.id)
        setEventTags(tags as Tag[])
        
        // Load RSVPs for admins and leaders
        if (myRole === 'admin' || myRole === 'leader') {
          const rsvps = await getEventRSVPs(foundEvent.id)
          setEventRSVPs(rsvps)
        }
      }
    } catch (error) {
      console.error('Failed to load event:', error)
      showToast('error', 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadEvent()
    }
  }, [id])

  const handleRSVP = async (status: RSVP) => {
    if (!event) return
    
    try {
      setEvent(prev => prev ? { ...prev, my_rsvp: status } : null)
      await rsvpEvent(event.id, status)
      showToast('success', `RSVP updated to ${status}`)
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      setEvent(prev => prev ? { ...prev, my_rsvp: null } : null)
      showToast('error', 'Failed to update RSVP')
    }
  }

  const handleAddToCalendar = async () => {
    if (!event) return
    
    try {
      await addEventToDevice(event)
      showToast('success', 'Event added to calendar')
    } catch (error) {
      console.error('Failed to add to calendar:', error)
      showToast('error', 'Failed to add to calendar')
    }
  }

  const formatEventTime = (event: Event) => {
    const start = new Date(event.start_at)
    const end = new Date(event.end_at)
    
    if (event.is_all_day) {
      return start.toLocaleDateString()
    }
    
    const sameDay = start.toDateString() === end.toDateString()
    if (sameDay) {
      return `${start.toLocaleDateString()} • ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    
    return `${start.toLocaleString()} - ${end.toLocaleString()}`
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Event Details' }} />
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#7C3AED" />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const canEdit = myRole === 'admin' || myRole === 'leader'
  const canViewRSVPs = myRole === 'admin' || myRole === 'leader'
  
  const rsvpCounts = {
    going: eventRSVPs.filter(r => r.status === 'going').length,
    maybe: eventRSVPs.filter(r => r.status === 'maybe').length,
    declined: eventRSVPs.filter(r => r.status === 'declined').length,
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: event.title,
          headerRight: canEdit ? () => (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/edit-event?id=${event.id}`)}
            >
              <Edit3 size={20} color="#7C3AED" />
            </TouchableOpacity>
          ) : undefined
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {event.image_path && (
          <Image 
            source={{ uri: eventImageUrl(event.image_path)! }} 
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Clock size={20} color="#6B7280" />
              <Text style={styles.metaText}>{formatEventTime(event)}</Text>
            </View>
            
            {event.location && (
              <View style={styles.metaRow}>
                <MapPin size={20} color="#6B7280" />
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
            )}
          </View>

          {event.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}
          
          {eventTags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsTitle}>Event Tags</Text>
              <View style={styles.tagsRow}>
                {eventTags.map((tag) => (
                  <View 
                    key={tag.id} 
                    style={[
                      styles.tagChip,
                      { backgroundColor: tag.color || '#7C3AED' }
                    ]}
                  >
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionsContainer}>
            <Text style={styles.rsvpTitle}>Will you be attending?</Text>
            <View style={styles.rsvpContainer}>
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
                >
                  <Text style={[
                    styles.rsvpButtonText,
                    event.my_rsvp === status && styles.rsvpButtonTextActive
                  ]}>
                    {status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Cannot Go'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={handleAddToCalendar}
            >
              <CalendarIcon size={20} color="#7C3AED" />
              <Text style={styles.calendarButtonText}>Add to Calendar</Text>
            </TouchableOpacity>
          </View>
          
          {canViewRSVPs && eventRSVPs.length > 0 && (
            <View style={styles.rsvpListContainer}>
              <View style={styles.rsvpListHeader}>
                <Users size={20} color="#111827" />
                <Text style={styles.rsvpListTitle}>RSVPs ({eventRSVPs.length})</Text>
              </View>
              
              <View style={styles.rsvpSummary}>
                <View style={styles.rsvpSummaryItem}>
                  <View style={[styles.rsvpSummaryDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.rsvpSummaryText}>Going: {rsvpCounts.going}</Text>
                </View>
                <View style={styles.rsvpSummaryItem}>
                  <View style={[styles.rsvpSummaryDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.rsvpSummaryText}>Maybe: {rsvpCounts.maybe}</Text>
                </View>
                <View style={styles.rsvpSummaryItem}>
                  <View style={[styles.rsvpSummaryDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.rsvpSummaryText}>Cannot Go: {rsvpCounts.declined}</Text>
                </View>
              </View>
              
              <View style={styles.rsvpList}>
                {eventRSVPs.map((rsvp) => (
                  <View key={rsvp.person_id} style={styles.rsvpItem}>
                    <View style={styles.rsvpItemLeft}>
                      <Text style={styles.rsvpPersonName}>{rsvp.person_name}</Text>
                      <Text style={styles.rsvpDate}>
                        {new Date(rsvp.updated_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[
                      styles.rsvpStatus,
                      rsvp.status === 'going' && styles.rsvpStatusGoing,
                      rsvp.status === 'maybe' && styles.rsvpStatusMaybe,
                      rsvp.status === 'declined' && styles.rsvpStatusDeclined,
                    ]}>
                      <Text style={[
                        styles.rsvpStatusText,
                        rsvp.status !== 'declined' && styles.rsvpStatusTextActive
                      ]}>
                        {rsvp.status === 'going' ? 'Going' : rsvp.status === 'maybe' ? 'Maybe' : 'Cannot Go'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  metaContainer: {
    marginBottom: 24,
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
  descriptionContainer: {
    marginBottom: 32,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  actionsContainer: {
    gap: 16,
  },
  rsvpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  rsvpContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    gap: 12,
  },
  calendarButtonText: {
    fontSize: 16,
    color: '#7C3AED',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  editButton: {
    padding: 8,
    borderRadius: 8,
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tagsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  rsvpListContainer: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rsvpListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  rsvpListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  rsvpSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  rsvpSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rsvpSummaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rsvpSummaryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  rsvpList: {
    gap: 12,
  },
  rsvpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  rsvpItemLeft: {
    flex: 1,
  },
  rsvpPersonName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  rsvpDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rsvpStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  rsvpStatusGoing: {
    backgroundColor: '#10B981',
  },
  rsvpStatusMaybe: {
    backgroundColor: '#F59E0B',
  },
  rsvpStatusDeclined: {
    backgroundColor: '#E5E7EB',
  },
  rsvpStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  rsvpStatusTextActive: {
    color: '#FFFFFF',
  },
})