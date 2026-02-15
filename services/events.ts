import { supabase } from '@/lib/supabase'

export type RSVP = 'going'|'maybe'|'declined'

export async function listUpcomingEvents(limit = 100) {
  console.log('listUpcomingEvents called with limit:', limit)
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit)
  
  console.log('listUpcomingEvents response:', { data: data?.length, error })
  if (error) {
    console.error('listUpcomingEvents error:', error)
    throw error
  }
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
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('person_id, first_name, last_name, email, phone, family_name, status, responded_at')
      .eq('event_id', eventId)
      .order('last_name', { ascending: true })
    
    console.log('getEventRSVPs response from event_rsvps view:', { count: data?.length, error: error ? JSON.stringify(error) : null })
    
    if (!error && data) {
      return data
    }
    
    if (error) {
      console.warn('getEventRSVPs event_rsvps view error:', JSON.stringify(error))
    }
  } catch (viewError) {
    console.warn('getEventRSVPs view exception:', viewError instanceof Error ? viewError.message : String(viewError))
  }

  // Fallback: Query event_attendees directly with JOIN to persons
  console.log('Trying fallback query via event_attendees...')
  try {
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
    
    console.log('getEventRSVPs fallback response:', { count: fallbackData?.length, error: fallbackError ? JSON.stringify(fallbackError) : null })
    
    if (fallbackError) {
      console.warn('getEventRSVPs fallback error:', JSON.stringify(fallbackError))
      return []
    }
    
    const transformedData: EventRSVP[] = (fallbackData ?? []).map(item => {
      const person = item.persons as any
      return {
        person_id: item.person_id,
        first_name: person?.first_name ?? '',
        last_name: person?.last_name ?? '',
        email: person?.email ?? null,
        phone: person?.phone ?? null,
        family_name: person?.families?.family_name ?? '',
        status: item.status,
        responded_at: item.responded_at
      }
    })
    
    transformedData.sort((a, b) => (a.last_name ?? '').localeCompare(b.last_name ?? ''))
    console.log('getEventRSVPs transformed fallback data:', transformedData.length, 'items')
    return transformedData
  } catch (fallbackException) {
    console.warn('getEventRSVPs fallback exception:', fallbackException instanceof Error ? fallbackException.message : String(fallbackException))
    return []
  }
}