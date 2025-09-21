import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { Plus, MapPin, Clock, Calendar as CalendarIcon } from 'lucide-react-native'
import { listUpcomingEvents, rsvpEvent, eventImageUrl, type RSVP } from '@/services/events'
import { addEventToDevice } from '@/utils/calendar'
import { useUser } from '@/hooks/user-context'
import { useToast } from '@/hooks/toast-context'

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

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { profile } = useUser()
  const { showToast } = useToast()
  const isStaff = profile?.role === 'admin' || profile?.role === 'leader'

  const loadEvents = async () => {
    try {
      const data = await listUpcomingEvents()
      setEvents(data as Event[])
    } catch (error) {
      console.error('Failed to load events:', error)
      showToast('error', 'Failed to load events')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadEvents()
  }

  const handleRSVP = async (eventId: string, status: RSVP) => {
    try {
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, my_rsvp: status } : event
      ))
      
      await rsvpEvent(eventId, status)
      showToast('success', `RSVP updated to ${status}`)
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, my_rsvp: null } : event
      ))
      showToast('error', 'Failed to update RSVP')
    }
  }

  const handleAddToCalendar = async (event: Event) => {
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

  const RSVPButtons = ({ event }: { event: Event }) => (
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
          onPress={() => handleRSVP(event.id, status)}
        >
          <Text style={[
            styles.rsvpButtonText,
            event.my_rsvp === status && styles.rsvpButtonTextActive
          ]}>
            {status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : "Can't Go"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderEvent = ({ item: event }: { item: Event }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => router.push(`/(tabs)/event-detail?id=${event.id}` as any)}
    >
      {event.image_path && (
        <Image 
          source={{ uri: eventImageUrl(event.image_path)! }} 
          style={styles.eventImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        
        <View style={styles.eventMeta}>
          <View style={styles.metaRow}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.metaText}>{formatEventTime(event)}</Text>
          </View>
          
          {event.location && (
            <View style={styles.metaRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText}>{event.location}</Text>
            </View>
          )}
        </View>

        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        <View style={styles.eventActions}>
          <RSVPButtons event={event} />
          
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => handleAddToCalendar(event)}
          >
            <CalendarIcon size={16} color="#7C3AED" />
            <Text style={styles.calendarButtonText}>Add to Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Events',
          headerRight: isStaff ? () => (
            <TouchableOpacity
              onPress={() => router.push('/create-event' as any)}
              style={styles.headerButton}
            >
              <Plus size={24} color="#7C3AED" />
            </TouchableOpacity>
          ) : undefined
        }} 
      />
      
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}

        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CalendarIcon size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No upcoming events</Text>
            <Text style={styles.emptySubtext}>Check back later for new events</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  eventMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventActions: {
    gap: 12,
  },
  rsvpContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  rsvpButtonTextActive: {
    color: '#FFFFFF',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    gap: 8,
  },
  calendarButtonText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
})