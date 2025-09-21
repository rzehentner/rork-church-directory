import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { Plus, MapPin, Clock, Calendar as CalendarIcon, Filter, X } from 'lucide-react-native'
import { listEventsForDateRange, rsvpEvent, eventImageUrl, type RSVP } from '@/services/events'
import { addEventToDevice } from '@/utils/calendar'
import { useUser } from '@/hooks/user-context'
import { useToast } from '@/hooks/toast-context'
import { listTags, type Tag } from '@/services/tags'
import Calendar from '@/components/Calendar'


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
  audience_tags: string[]
}

type EventFilter = {
  rsvpStatus: RSVP | 'all'
  tagIds: string[]
}

export default function EventsScreen() {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'upcoming' | 'selected'>('upcoming')
  const [showFilters, setShowFilters] = useState(true)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [filters, setFilters] = useState<EventFilter>({
    rsvpStatus: 'all',
    tagIds: []
  })
  
  const { profile } = useUser()
  const { showToast } = useToast()
  const isStaff = profile?.role === 'admin' || profile?.role === 'leader'

  const loadAllEvents = useCallback(async () => {
    try {
      const currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 2, 0)
      const data = await listEventsForDateRange(currentMonth, nextMonth)
      setAllEvents(data as Event[])
    } catch (error) {
      console.error('Failed to load events:', error)
      showToast('error', 'Failed to load events')
    } finally {
      setRefreshing(false)
    }
  }, [selectedDate, showToast])

  const loadTags = useCallback(async () => {
    try {
      const tags = await listTags(true)
      setAvailableTags(tags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }, [])

  useEffect(() => {
    loadAllEvents()
    loadTags()
  }, [loadAllEvents, loadTags])

  const handleRefresh = () => {
    setRefreshing(true)
    loadAllEvents()
  }

  const handleRSVP = async (eventId: string, status: RSVP) => {
    try {
      setAllEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, my_rsvp: status } : event
      ))
      
      await rsvpEvent(eventId, status)
      showToast('success', `RSVP updated to ${status}`)
    } catch (error) {
      console.error('Failed to update RSVP:', error)
      setAllEvents(prev => prev.map(event => 
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

  // Filter events based on current filters and view mode
  const filteredEvents = useMemo(() => {
    let events = allEvents
    
    // Filter by view mode first
    if (viewMode === 'upcoming') {
      const now = new Date()
      events = events.filter(event => new Date(event.end_at) >= now)
    } else {
      // Filter by selected date
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      events = events.filter(event => {
        const eventStart = new Date(event.start_at)
        const eventEnd = new Date(event.end_at)
        return eventStart <= endOfDay && eventEnd >= startOfDay
      })
    }
    
    // Filter by RSVP status
    if (filters.rsvpStatus !== 'all') {
      events = events.filter(event => event.my_rsvp === filters.rsvpStatus)
    }
    
    // Filter by tags (if any tags are selected)
    if (filters.tagIds.length > 0) {
      events = events.filter(event => {
        if (!event.audience_tags || event.audience_tags.length === 0) {
          return false
        }
        // Check if event has any of the selected tags
        return event.audience_tags.some(tagId => filters.tagIds.includes(tagId))
      })
    }
    
    return events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [allEvents, viewMode, selectedDate, filters])
  
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
  
  const clearFilters = () => {
    setFilters({ rsvpStatus: 'all', tagIds: [] })
  }
  
  const hasActiveFilters = filters.rsvpStatus !== 'all' || filters.tagIds.length > 0
  
  const FilterSection = () => {
    if (!showFilters) return null
    
    return (
      <View style={styles.filtersContainer}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter Events</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {/* RSVP Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>My RSVP Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
            {(['all', 'going', 'maybe', 'declined'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filters.rsvpStatus === status && styles.filterChipActive,
                  status === 'going' && filters.rsvpStatus === status && styles.filterChipGoing,
                  status === 'maybe' && filters.rsvpStatus === status && styles.filterChipMaybe,
                  status === 'declined' && filters.rsvpStatus === status && styles.filterChipDeclined,
                ]}
                onPress={() => setFilters(prev => ({ ...prev, rsvpStatus: status }))}
              >
                <Text style={[
                  styles.filterChipText,
                  filters.rsvpStatus === status && styles.filterChipTextActive
                ]}>
                  {status === 'all' ? 'All Events' : 
                   status === 'going' ? 'Going' : 
                   status === 'maybe' ? 'Maybe' : "Can't Go"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Tags Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Event Tags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterOptions}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagFilterChip,
                  filters.tagIds.includes(tag.id) && styles.tagFilterChipActive,
                  filters.tagIds.includes(tag.id) && { backgroundColor: tag.color || '#7C3AED' }
                ]}
                onPress={() => {
                  setFilters(prev => ({
                    ...prev,
                    tagIds: prev.tagIds.includes(tag.id)
                      ? prev.tagIds.filter(id => id !== tag.id)
                      : [...prev.tagIds, tag.id]
                  }))
                }}
              >
                <Text style={[
                  styles.tagFilterText,
                  filters.tagIds.includes(tag.id) && styles.tagFilterTextActive,
                  { color: filters.tagIds.includes(tag.id) ? '#FFFFFF' : (tag.color || '#6B7280') }
                ]}>
                  {tag.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    )
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
      onPress={() => router.push(`/event-detail?id=${event.id}` as any)}
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
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={() => setShowFilters(!showFilters)}
                style={[
                  styles.headerButton,
                  hasActiveFilters && styles.headerButtonActive
                ]}
              >
                <Filter size={20} color={hasActiveFilters ? '#FFFFFF' : '#7C3AED'} />
              </TouchableOpacity>
              {isStaff && (
                <TouchableOpacity
                  onPress={() => router.push('/create-event' as any)}
                  style={styles.headerButton}
                >
                  <Plus size={20} color="#7C3AED" />
                </TouchableOpacity>
              )}
            </View>
          )
        }} 
      />
      
      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#7C3AED']}
            tintColor="#7C3AED"
          />
        }
        ListHeaderComponent={
          <View>
            <FilterSection />
            
            <Calendar
              events={allEvents}
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                console.log('Date selected:', date)
                setSelectedDate(date)
                setViewMode('selected')
              }}
              onMonthChange={(date) => {
                console.log('Month changed:', date)
                const newSelectedDate = new Date(date.getFullYear(), date.getMonth(), selectedDate.getDate())
                setSelectedDate(newSelectedDate)
              }}
            />
            
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'upcoming' && styles.toggleButtonActive
                ]}
                onPress={() => setViewMode('upcoming')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  viewMode === 'upcoming' && styles.toggleButtonTextActive
                ]}>
                  Upcoming
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'selected' && styles.toggleButtonActive
                ]}
                onPress={() => setViewMode('selected')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  viewMode === 'selected' && styles.toggleButtonTextActive
                ]}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
            </View>
            
            {hasActiveFilters && (
              <View style={styles.activeFiltersContainer}>
                <Text style={styles.activeFiltersText}>
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
                </Text>
                {filters.rsvpStatus !== 'all' && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      RSVP: {filters.rsvpStatus === 'going' ? 'Going' : 
                             filters.rsvpStatus === 'maybe' ? 'Maybe' : "Can't Go"}
                    </Text>
                  </View>
                )}
                {filters.tagIds.length > 0 && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      {filters.tagIds.length} tag{filters.tagIds.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CalendarIcon size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {viewMode === 'upcoming' ? 'No upcoming events' : `No events on ${selectedDate.toLocaleDateString()}`}
            </Text>
            <Text style={styles.emptySubtext}>
              {viewMode === 'upcoming' ? 'Check back later for new events' : 'Try selecting a different date'}
            </Text>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
  },
  headerButtonActive: {
    backgroundColor: '#7C3AED',
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
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#7C3AED',
  },
  filterChipGoing: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipMaybe: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterChipDeclined: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeFilterChipText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
  tagFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  tagFilterChipActive: {
    borderColor: 'transparent',
  },
  tagFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagFilterTextActive: {
    color: '#FFFFFF',
  },
})