import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus, MapPin, Clock, Calendar as CalendarIcon, Filter, X, Search, ClipboardList, UtensilsCrossed } from 'lucide-react-native'
import { listEventsForDateRange, rsvpEvent, type RSVP } from '@/services/events'
import { eventImageUrl } from '@/services/event-images'
import { addEventToDevice } from '@/utils/calendar'
import { useUser } from '@/hooks/user-context'
import { useToast } from '@/hooks/toast-context'
import { listTags, type Tag } from '@/services/tags'
import { getFormSummaries } from '@/services/signup-forms'
import type { SignupFormSummary } from '@/types/supabase'
import Calendar from '@/components/Calendar'
import TagPill from '@/components/TagPill'
import { styles } from '@/styles/events.styles'


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
  tagNames: string[]
}

export default function EventsScreen() {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'upcoming' | 'selected'>('upcoming')
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [filters, setFilters] = useState<EventFilter>({
    rsvpStatus: 'all',
    tagNames: []
  })
  const [formsByEvent, setFormsByEvent] = useState<Record<string, SignupFormSummary>>({})
  
  const { profile } = useUser()
  const { showToast } = useToast()
  const insets = useSafeAreaInsets()
  const isStaff = profile?.role === 'admin' || profile?.role === 'leader'

  const loadAllEvents = useCallback(async () => {
    try {
      // Load a wider range: 3 months back and 6 months forward
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3)
      startDate.setDate(1)
      
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 6)
      endDate.setDate(0) // Last day of the month
      
      const data = await listEventsForDateRange(startDate, endDate)
      setAllEvents(data as Event[])
    } catch (error) {
      console.error('Failed to load events:', error)
      showToast('error', 'Failed to load events')
    } finally {
      setRefreshing(false)
    }
  }, [showToast])

  const loadTags = useCallback(async () => {
    try {
      const tags = await listTags(true)
      setAvailableTags(tags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }, [])

  const loadFormSummaries = useCallback(async () => {
    try {
      const summaries = await getFormSummaries()
      const map: Record<string, SignupFormSummary> = {}
      for (const s of summaries) {
        if (s.event_id) map[s.event_id] = s
      }
      setFormsByEvent(map)
    } catch (error) {
    }
  }, [])

  useEffect(() => {
    loadAllEvents()
    loadTags()
    loadFormSummaries()
  }, [loadAllEvents, loadTags, loadFormSummaries])
  
  // Add a simple interval to refresh events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllEvents()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [loadAllEvents])

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
    
    // Apply search filter first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      events = events.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.audience_tags?.some(tagName => tagName.toLowerCase().includes(query))
      )
    }
    
    // Filter by view mode
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
    if (filters.tagNames.length > 0) {
      events = events.filter(event => {
        if (!event.audience_tags || event.audience_tags.length === 0) {
          return false
        }
        // Check if event has any of the selected tag names
        return event.audience_tags.some(tagName => filters.tagNames.includes(tagName))
      })
    }
    
    return events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [allEvents, viewMode, selectedDate, filters, searchQuery])
  
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
    setFilters({ rsvpStatus: 'all', tagNames: [] })
  }
  
  const clearSearch = () => {
    setSearchQuery('')
  }
  
  const hasActiveFilters = filters.rsvpStatus !== 'all' || filters.tagNames.length > 0 || searchQuery.trim() !== ''
  
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
                  filters.tagNames.includes(tag.name) && styles.tagFilterChipActive,
                  filters.tagNames.includes(tag.name) && { backgroundColor: tag.color || '#7C3AED' }
                ]}
                onPress={() => {
                  setFilters(prev => ({
                    ...prev,
                    tagNames: prev.tagNames.includes(tag.name)
                      ? prev.tagNames.filter(name => name !== tag.name)
                      : [...prev.tagNames, tag.name]
                  }))
                }}
              >
                <Text style={[
                  styles.tagFilterText,
                  filters.tagNames.includes(tag.name) && styles.tagFilterTextActive,
                  { color: filters.tagNames.includes(tag.name) ? '#FFFFFF' : (tag.color || '#6B7280') }
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
      testID={`event-card-${event.id}`}
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
                  size="small"
                  testId={`event-tag-${tagName}`}
                />
              )
            })}
          </View>
        )}

        {formsByEvent[event.id] && (
          <TouchableOpacity
            style={[
              styles.formBadge,
              formsByEvent[event.id].form_type === 'potluck' ? styles.formBadgePotluck : styles.formBadgeSignup,
            ]}
            onPress={(e) => {
              e.stopPropagation()
              const form = formsByEvent[event.id]
              if (form.form_type === 'potluck') {
                router.push(`/potluck-sheet?formId=${form.form_id}` as any)
              } else {
                router.push(`/signup-form?formId=${form.form_id}` as any)
              }
            }}
            testID={`event-form-badge-${event.id}`}
          >
            {formsByEvent[event.id].form_type === 'potluck' ? (
              <UtensilsCrossed size={14} color="#92400E" />
            ) : (
              <ClipboardList size={14} color="#312E81" />
            )}
            <Text style={[
              styles.formBadgeText,
              formsByEvent[event.id].form_type === 'potluck' ? styles.formBadgeTextPotluck : styles.formBadgeTextSignup,
            ]}>
              {formsByEvent[event.id].form_type === 'potluck' ? 'Potluck Sign-Up' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false
        }} 
      />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CalendarIcon size={28} color="#7C3AED" />
          <Text style={styles.title}>Events</Text>
        </View>
        <View style={styles.headerButtons}>
          {isStaff && (
            <TouchableOpacity
              onPress={() => router.push('/create-event' as any)}
              style={styles.createButton}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            (hasActiveFilters || showFilters) && styles.filterButtonActive
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} color={(hasActiveFilters || showFilters) ? '#FFFFFF' : '#7C3AED'} />
          <Text style={[
            styles.filterButtonText,
            (hasActiveFilters || showFilters) && styles.filterButtonTextActive
          ]}>Filter</Text>
        </TouchableOpacity>
      </View>
      
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
                {filters.tagNames.length > 0 && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      {filters.tagNames.length} tag{filters.tagNames.length !== 1 ? 's' : ''}
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