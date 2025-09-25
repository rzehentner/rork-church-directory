import { supabase } from '@/lib/supabase'

export type RSVP = 'going'|'maybe'|'declined'

export async function listUpcomingEvents(limit = 100) {
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getEvent(eventId: string) {
  console.log('getEvent called with ID:', eventId)
  console.log('getEvent ID type:', typeof eventId)
  console.log('getEvent ID length:', eventId?.length)
  
  if (!eventId || typeof eventId !== 'string') {
    throw new Error('Invalid event ID provided')
  }
  
  // Trim and validate the ID
  const cleanId = eventId.trim()
  if (cleanId.length === 0) {
    throw new Error('Empty event ID provided')
  }
  
  console.log('Clean event ID:', cleanId)
  
  // First try events_for_me view
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .eq('id', cleanId)
    .maybeSingle()
  
  console.log('getEvent response from events_for_me:', { data, error })
  console.log('getEvent error details:', error ? JSON.stringify(error, null, 2) : 'no error')
  
  if (error) {
    console.error('getEvent error from events_for_me:', error)
    throw error
  }
  
  if (data) {
    console.log('Event found in events_for_me:', data.id, data.title)
    return data
  }
  
  // If not found in events_for_me, try the events table directly as fallback
  console.log('Event not found in events_for_me, trying fallback query to events table...')
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('events')
    .select('*')
    .eq('id', cleanId)
    .maybeSingle()
  
  console.log('getEvent fallback response:', { data: fallbackData, error: fallbackError })
  
  if (fallbackError) {
    console.error('getEvent fallback error:', fallbackError)
    throw fallbackError
  }
  
  if (!fallbackData) {
    console.error('Event not found in either events_for_me or events table')
    throw new Error('Event not found or you do not have permission to view it')
  }
  
  console.log('Event found in events table:', fallbackData.id, fallbackData.title)
  // Add my_rsvp field as null since events table doesn't have it
  return { ...fallbackData, my_rsvp: null }
}

export async function listEventsInRange(startISO: string, endISO: string) {
  console.log('listEventsInRange called with:', { startISO, endISO })
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .lt('start_at', endISO)
    .gte('end_at', startISO)
    .order('start_at', { ascending: true })
  
  console.log('listEventsInRange response:', { data: data?.length, error })
  if (error) throw error
  return data ?? []
}

export async function listEventsForDateRange(startDate: Date, endDate: Date) {
  return listEventsInRange(startDate.toISOString(), endDate.toISOString())
}

export async function listEventsForDate(date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  return listEventsInRange(startOfDay.toISOString(), endOfDay.toISOString())
}

export async function listByTagsAny(tagNames: string[]) {
  console.log('listByTagsAny called with:', tagNames)
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .contains('audience_tags', tagNames)
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })
  
  console.log('listByTagsAny response:', { data: data?.length, error })
  if (error) throw error
  return data ?? []
}

export async function rsvpEvent(eventId: string, status: RSVP) {
  const { data, error } = await supabase.rpc('rsvp_event', {
    p_event_id: eventId,
    p_status: status
  })
  if (error) throw error
  return !!data
}

export async function createEvent(input: {
  title: string
  description?: string | null
  start_at: string
  end_at: string
  is_all_day?: boolean
  location?: string | null
  is_public?: boolean
  roles_allowed?: ('admin'|'leader'|'member'|'visitor')[] | null
  created_by?: string
}) {
  // Basic validation
  if (!input.title) throw new Error('Title is required')
  if (!input.start_at || !input.end_at) throw new Error('Start/End are required')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const payload: any = {
    title: input.title,
    description: input.description ?? null,
    start_at: input.start_at,
    end_at: input.end_at,
    is_all_day: !!input.is_all_day,
    location: input.location ?? null,
    is_public: !!input.is_public,
    roles_allowed: input.is_public ? null : (input.roles_allowed ?? null),
    created_by: input.created_by ?? user.id, // safe even if trigger later sets it
  }

  console.log('Creating event with payload:', payload)
  const { data, error } = await supabase
    .from('events')
    .insert([payload])
    .select('*')
    .single()
  
  console.log('Create event response:', { data, error })
  if (error) {
    console.error('Create event error:', error)
    throw error
  }
  return data
}

export async function updateEvent(id: string, patch: Partial<{
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
  location: string | null
  is_public: boolean
  roles_allowed: ('admin'|'leader'|'member'|'visitor')[] | null
  image_path: string | null
}>) {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/** Replace audience tags for an event (staff only). Pass tag IDs. */
export async function setEventTags(eventId: string, tagIds: string[]) {
  console.log('Setting event tags:', { eventId, tagIds })
  const { data: curr, error: e1 } = await supabase
    .from('event_audience_tags')
    .select('tag_id')
    .eq('event_id', eventId)
  if (e1) {
    console.error('Error fetching current tags:', e1)
    throw e1
  }
  
  const have = new Set((curr ?? []).map(r => r.tag_id))
  const want = new Set(tagIds)
  const toAdd = [...want].filter(x => !have.has(x))
  const toDel = [...have].filter(x => !want.has(x))

  console.log('Tag changes:', { toAdd, toDel })

  if (toDel.length) {
    const { error } = await supabase.from('event_audience_tags')
      .delete().eq('event_id', eventId).in('tag_id', toDel)
    if (error) {
      console.error('Error deleting tags:', error)
      throw error
    }
  }
  if (toAdd.length) {
    const rows = toAdd.map(tag_id => ({ event_id: eventId, tag_id }))
    const { error } = await supabase.from('event_audience_tags').insert(rows)
    if (error) {
      console.error('Error adding tags:', error)
      throw error
    }
  }
  console.log('Event tags updated successfully')
}

export async function getEventTags(eventId: string) {
  const { data, error } = await supabase
    .from('event_audience_tags')
    .select(`
      tag_id,
      tags (
        id,
        name,
        color,
        namespace
      )
    `)
    .eq('event_id', eventId)
  if (error) throw error
  
  const tags: {
    id: string
    name: string
    color: string | null
    namespace: string | null
  }[] = []
  
  for (const row of data ?? []) {
    if (row.tags) {
      tags.push(row.tags as unknown as {
        id: string
        name: string
        color: string | null
        namespace: string | null
      })
    }
  }
  
  return tags
}

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/${encodeURIComponent(path)}`
}

/** Upload an image and persist its path on the event. (Avoid 0-byte uploads.) */
export async function uploadEventImage(localUri: string, eventId: string) {
  console.log('Uploading event image:', { localUri, eventId })
  const res = await fetch(localUri)
  const blob = await res.blob()
  
  if (blob.size === 0) {
    throw new Error('Cannot upload empty image file')
  }
  
  const ext = (localUri.split('.').pop() || 'jpg').toLowerCase()
  const path = `events/${eventId}/cover.${ext}`

  const up = await supabase.storage.from('event-images')
    .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })
  if (up.error) {
    console.error('Storage upload error:', up.error)
    throw up.error
  }

  const { error } = await supabase.from('events').update({ image_path: path }).eq('id', eventId)
  if (error) {
    console.error('Error updating event image path:', error)
    throw error
  }

  console.log('Event image uploaded successfully:', path)
  return eventImageUrl(path)
}

/** Optional: schedule reminder N minutes before start (attendees only by default) */
export async function scheduleReminder(eventId: string, minutesBefore = 60, attendeesOnly = true) {
  console.log('Scheduling reminder:', { eventId, minutesBefore, attendeesOnly })
  const { data, error } = await supabase.rpc('schedule_event_reminder', {
    p_event_id: eventId,
    p_minutes_before: minutesBefore,
    p_attendees_only: attendeesOnly,
  })
  if (error) {
    console.error('Error scheduling reminder:', error)
    throw error
  }
  console.log('Reminder scheduled successfully:', data)
  return data // integer count enqueued
}

export async function getEventICS(eventId: string) {
  console.log('getEventICS called with eventId:', eventId)
  const { data, error } = await supabase.rpc('get_event_ics', { p_event_id: eventId })
  console.log('getEventICS response:', { data: data?.substring(0, 100) + '...', error })
  if (error) {
    console.error('getEventICS error:', error)
    throw error
  }
  return data as string
}

export type EventRSVP = {
  person_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  family_name: string
  status: RSVP
  responded_at: string
}

export async function getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
  console.log('getEventRSVPs called with eventId:', eventId)
  
  // First try the event_rsvps view
  const { data, error } = await supabase
    .from('event_rsvps')
    .select('person_id, first_name, last_name, email, phone, family_name, status, responded_at')
    .eq('event_id', eventId)
    .order('last_name', { ascending: true })
  
  console.log('getEventRSVPs response from event_rsvps view:', { data: data?.length, error })
  
  // If the view doesn't exist (PGRST205) or other permission issues, try fallback
  if (error) {
    console.error('getEventRSVPs error from event_rsvps view:', error)
    console.log('Error code:', error.code, 'Error details:', error.details)
    
    // If it's a "relation does not exist" error (PGRST205), try fallback query
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      console.log('event_rsvps view not found, trying fallback query...')
      
      // Fallback: Query event_attendees directly with JOIN to persons
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('event_attendees')
        .select(`
          person_id,
          status,
          responded_at,
          persons!inner (
            first_name,
            last_name,
            email,
            phone,
            families (
              family_name
            )
          )
        `)
        .eq('event_id', eventId)
        .order('persons(last_name)', { ascending: true })
      
      console.log('getEventRSVPs fallback response:', { data: fallbackData?.length, error: fallbackError })
      
      if (fallbackError) {
        console.error('getEventRSVPs fallback error:', fallbackError)
        throw fallbackError
      }
      
      // Transform the fallback data to match EventRSVP format
      const transformedData: EventRSVP[] = (fallbackData ?? []).map(item => ({
        person_id: item.person_id,
        first_name: (item.persons as any).first_name,
        last_name: (item.persons as any).last_name,
        email: (item.persons as any).email,
        phone: (item.persons as any).phone,
        family_name: (item.persons as any).families?.family_name || '',
        status: item.status,
        responded_at: item.responded_at
      }))
      
      console.log('getEventRSVPs transformed fallback data:', transformedData.length, 'items')
      return transformedData
    }
    
    // For other errors, throw them
    throw error
  }
  
  return data ?? []
}