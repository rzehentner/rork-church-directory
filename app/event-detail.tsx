import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { MapPin, Clock, Calendar as CalendarIcon, ArrowLeft, Edit3, Users, AlertTriangle, Info } from 'lucide-react-native'
import { getEvent, rsvpEvent, eventImageUrl, getEventTags, getEventRSVPs, type RSVP, type EventRSVP } from '@/services/events'
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
  const params = useLocalSearchParams()
  console.log('EventDetailScreen params:', params)
  console.log('EventDetailScreen params.id:', params.id)
  console.log('EventDetailScreen params.id type:', typeof params.id)
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  console.log('EventDetailScreen extracted id:', id)
  console.log('EventDetailScreen extracted id type:', typeof id)
  const [event, setEvent] = useState<Event | null>(null)
  const [eventTags, setEventTags] = useState<Tag[]>([])
  const [eventRSVPs, setEventRSVPs] = useState<EventRSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(true)
  const [isLoadingRef, setIsLoadingRef] = useState(false)
  const [networkInfo, setNetworkInfo] = useState<any>(null)
  const { showToast } = useToast()
  const { myRole, isLoading: meLoading } = useMe()

  const loadEvent = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef) {
      console.log('Load already in progress, skipping...')
      return
    }
    
    // Wait for me context to load first
    if (meLoading) {
      console.log('Waiting for me context to load...')
      return
    }
    
    try {
      setIsLoadingRef(true)
      setLoading(true)
      setError(null)
      
      console.log('=== EVENT DETAIL LOAD START ===')
      console.log('Loading event with ID:', id)
      console.log('ID type:', typeof id)
      console.log('ID value (JSON):', JSON.stringify(id))
      console.log('My role:', myRole)
      console.log('Me loading:', meLoading)
      
      // Collect comprehensive debug information
      const debugData: any = {
        timestamp: new Date().toISOString(),
        extractedId: id,
        idType: typeof id,
        idLength: id?.length,
        idTrimmed: id?.trim(),
        myRole: myRole,
        meLoading: meLoading,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        platform: Platform.OS,
        routeParams: params,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
        networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        memoryUsage: typeof performance !== 'undefined' && (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : 'not available',
        loadAttempts: 1
      }
      
      setNetworkInfo(debugData)
      
      if (!id) {
        console.error('No event ID provided - throwing error')
        const errorMsg = 'No event ID provided'
        setError(errorMsg)
        setDebugInfo({ ...debugData, error: errorMsg, step: 'validation' })
        throw new Error(errorMsg)
      }
      
      console.log('About to call getEvent with ID:', id)
      debugData.step = 'fetching_event'
      debugData.requestStartTime = Date.now()
      
      try {
        const eventData = await getEvent(id)
        debugData.requestEndTime = Date.now()
        debugData.requestDuration = debugData.requestEndTime - debugData.requestStartTime
        console.log('getEvent returned successfully:', !!eventData)
        console.log('Event data:', JSON.stringify(eventData, null, 2))
        debugData.eventDataReceived = !!eventData
        debugData.eventDataKeys = eventData ? Object.keys(eventData) : null
      
        if (!eventData) {
          console.error('getEvent returned null/undefined')
          const errorMsg = 'Event data is null - this could indicate the event does not exist or you lack permission to view it'
          setError(errorMsg)
          setDebugInfo({ ...debugData, error: errorMsg, step: 'event_null', possibleCauses: [
            'Event ID does not exist in database',
            'User lacks permission to view this event',
            'Event is not visible due to role restrictions',
            'Event is not visible due to tag restrictions',
            'Database connection issue'
          ] })
          throw new Error(errorMsg)
        }
      
      setEvent(eventData as Event)
      console.log('Event state set successfully')
      
        // Load tags
        console.log('Loading event tags...')
        debugData.step = 'fetching_tags'
        debugData.tagsRequestStartTime = Date.now()
        const tags = await getEventTags(eventData.id)
        debugData.tagsRequestEndTime = Date.now()
        debugData.tagsRequestDuration = debugData.tagsRequestEndTime - debugData.tagsRequestStartTime
        console.log('Event tags loaded:', tags.length, 'tags')
        debugData.tagsCount = tags.length
        setEventTags(tags as Tag[])
      
        // Load RSVPs for admins and leaders
        if (myRole === 'admin' || myRole === 'leader') {
          console.log('Loading RSVPs for admin/leader...')
          debugData.step = 'fetching_rsvps'
          debugData.rsvpsRequestStartTime = Date.now()
          const rsvps = await getEventRSVPs(eventData.id)
          debugData.rsvpsRequestEndTime = Date.now()
          debugData.rsvpsRequestDuration = debugData.rsvpsRequestEndTime - debugData.rsvpsRequestStartTime
          console.log('RSVPs loaded:', rsvps.length, 'RSVPs')
          debugData.rsvpsCount = rsvps.length
          setEventRSVPs(rsvps)
        }
      
        setError(null)
        debugData.totalLoadTime = Date.now() - debugData.requestStartTime
        setDebugInfo({ ...debugData, success: true, eventId: eventData.id, eventTitle: eventData.title })
        console.log('=== EVENT DETAIL LOAD SUCCESS ===')
      } catch (fetchError) {
        debugData.requestEndTime = Date.now()
        debugData.requestDuration = debugData.requestEndTime - debugData.requestStartTime
        debugData.fetchError = fetchError
        throw fetchError
      }
    } catch (error) {
      console.error('=== EVENT DETAIL LOAD FAILED ===')
      console.error('Failed to load event:', error)
      console.error('Event ID was:', id)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      // Enhanced error debugging
      const errorDebugInfo = {
        timestamp: new Date().toISOString(),
        extractedId: id,
        idType: typeof id,
        idLength: id?.length,
        idTrimmed: id?.trim(),
        myRole: myRole,
        meLoading: meLoading,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        platform: Platform.OS,
        routeParams: params,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
        networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : null,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorDetails: error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        supabaseError: error && typeof error === 'object' && 'code' in error ? {
          code: (error as any).code,
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint
        } : null,
        networkStatus: typeof navigator !== 'undefined' ? {
          onLine: navigator.onLine,
          connection: (navigator as any).connection ? {
            effectiveType: (navigator as any).connection.effectiveType,
            downlink: (navigator as any).connection.downlink,
            rtt: (navigator as any).connection.rtt
          } : null
        } : null,
        troubleshootingSteps: [
          '1. Check if the event ID is valid',
          '2. Verify you have permission to view this event',
          '3. Check your internet connection',
          '4. Try refreshing the page',
          '5. Check if you are logged in properly',
          '6. Contact support if the issue persists'
        ]
      }
      
      setDebugInfo(errorDebugInfo)
      
      showToast('error', `Failed to load event: ${errorMessage}`)
      setEvent(null)
    } finally {
      setLoading(false)
      setIsLoadingRef(false)
    }
  }, [id, myRole, meLoading, showToast, isLoadingRef])

  useEffect(() => {
    if (id && !isLoadingRef && !meLoading) {
      console.log('useEffect triggered for event ID:', id)
      loadEvent()
    }
  }, [id, myRole, meLoading, loadEvent]) // Now safe to include loadEvent

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

  if (loading || meLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Event Details' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
          {meLoading && <Text style={styles.loadingSubtext}>Loading user profile...</Text>}
          {loading && !meLoading && <Text style={styles.loadingSubtext}>Loading event details...</Text>}
        </View>
      </View>
    )
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Event Error' }} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.errorContainer}>
          <View style={styles.errorHeader}>
            <AlertTriangle size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Unable to Load Event</Text>
            <Text style={styles.errorText}>{error || 'Event not found'}</Text>
          </View>
          
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#7C3AED" />
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setIsLoadingRef(false) // Reset loading ref first
                setLoading(false)
                loadEvent()
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => setShowDebug(!showDebug)}
            >
              <Info size={16} color="#6B7280" />
              <Text style={styles.debugButtonText}>Debug Info</Text>
            </TouchableOpacity>
          </View>
          
          {showDebug && debugInfo && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Information</Text>
              
              {/* Quick Summary */}
              <View style={styles.debugSummary}>
                <Text style={styles.debugSummaryTitle}>Quick Summary:</Text>
                <Text style={styles.debugSummaryText}>• Event ID: {debugInfo?.extractedId || 'N/A'}</Text>
                <Text style={styles.debugSummaryText}>• User Role: {debugInfo?.myRole || 'N/A'}</Text>
                <Text style={styles.debugSummaryText}>• Me Loading: {debugInfo?.meLoading ? 'Yes' : 'No'}</Text>
                <Text style={styles.debugSummaryText}>• Platform: {debugInfo?.platform || 'N/A'}</Text>
                <Text style={styles.debugSummaryText}>• Network: {debugInfo?.networkStatus?.onLine ? 'Online' : 'Offline/Unknown'}</Text>
                <Text style={styles.debugSummaryText}>• Error: {debugInfo?.error || 'N/A'}</Text>
                {debugInfo?.requestDuration && (
                  <Text style={styles.debugSummaryText}>• Request Time: {debugInfo.requestDuration}ms</Text>
                )}
              </View>
              
              {/* Troubleshooting */}
              {debugInfo?.troubleshootingSteps && (
                <View style={styles.troubleshootingContainer}>
                  <Text style={styles.troubleshootingTitle}>Troubleshooting Steps:</Text>
                  {debugInfo.troubleshootingSteps.map((step: string, index: number) => (
                    <Text key={index} style={styles.troubleshootingStep}>{step}</Text>
                  ))}
                </View>
              )}
              
              {/* Full Debug Data */}
              <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                <Text style={styles.debugText}>{JSON.stringify(debugInfo, null, 2)}</Text>
              </ScrollView>
              
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  const debugString = JSON.stringify(debugInfo, null, 2)
                  Alert.alert(
                    'Full Debug Information', 
                    debugString,
                    [
                      { text: 'Close', style: 'cancel' },
                      { 
                        text: 'Copy to Share', 
                        onPress: () => {
                          // In a real app, you'd copy to clipboard here
                          console.log('Debug info for sharing:', debugString)
                        }
                      }
                    ],
                    { cancelable: true }
                  )
                }}
              >
                <Text style={styles.copyButtonText}>Show Full Debug Info</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  loadingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
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
  errorHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorActions: {
    gap: 16,
    width: '100%',
    alignItems: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  debugButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  debugContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  debugScroll: {
    maxHeight: 200,
    backgroundColor: '#1F2937',
    borderRadius: 6,
    padding: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#F9FAFB',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  copyButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#374151',
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 14,
    color: '#F9FAFB',
    fontWeight: '500',
  },
  debugSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  debugSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  debugSummaryText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  troubleshootingContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  troubleshootingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  troubleshootingStep: {
    fontSize: 12,
    color: '#78350F',
    marginBottom: 4,
  },
})