import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/utils/validation'

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
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID provided')

  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (fallbackError) throw fallbackError
  if (!fallbackData) throw new Error('Event not found or you do not have permission to view it')
  return { ...fallbackData, my_rsvp: null }
}

export async function listEventsInRange(startISO: string, endISO: string) {
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .lt('start_at', endISO)
    .gte('end_at', startISO)
    .order('start_at', { ascending: true })

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
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .contains('audience_tags', tagNames)
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function rsvpEvent(eventId: string, status: RSVP) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
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
  roles?: ('admin'|'leader'|'member'|'visitor')[]
  created_by?: string
}) {
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
    created_by: input.created_by ?? user.id,
  }

  const { data, error } = await supabase
    .from('events')
    .insert([payload])
    .select('*')
    .single()

  if (error) throw error

  // Write role access to junction table
  const roles = input.is_public ? [] : (input.roles ?? [])
  if (roles.length > 0) {
    await setEventRoles(data.id, roles)
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
  image_path: string | null
}>, roles?: ('admin'|'leader'|'member'|'visitor')[]) {
  if (!isValidUUID(id)) throw new Error('Invalid event ID')
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  // Update role access junction table if roles provided
  if (roles !== undefined) {
    await setEventRoles(id, patch.is_public ? [] : roles)
  }

  return data
}

export async function setEventRoles(eventId: string, roles: string[]) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')

  // Delete existing role access rows
  const { error: deleteError } = await supabase
    .from('event_role_access')
    .delete()
    .eq('event_id', eventId)
  if (deleteError) throw deleteError

  // Insert new role access rows
  if (roles.length > 0) {
    const rows = roles.map(role => ({ event_id: eventId, role }))
    const { error: insertError } = await supabase
      .from('event_role_access')
      .insert(rows)
    if (insertError) throw insertError
  }
}

export async function setEventTags(eventId: string, tagIds: string[]) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  const { data: curr, error: e1 } = await supabase
    .from('event_audience_tags')
    .select('tag_id')
    .eq('event_id', eventId)
  if (e1) throw e1

  const have = new Set((curr ?? []).map(r => r.tag_id))
  const want = new Set(tagIds)
  const toAdd = [...want].filter(x => !have.has(x))
  const toDel = [...have].filter(x => !want.has(x))

  if (toDel.length) {
    const { error } = await supabase.from('event_audience_tags')
      .delete().eq('event_id', eventId).in('tag_id', toDel)
    if (error) throw error
  }
  if (toAdd.length) {
    const rows = toAdd.map(tag_id => ({ event_id: eventId, tag_id }))
    const { error } = await supabase.from('event_audience_tags').insert(rows)
    if (error) throw error
  }
}

export async function getEventTags(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  const { data, error } = await supabase
    .from('event_audience_tags')
    .select('tag_id, tags (id, name, color, namespace)')
    .eq('event_id', eventId)
  if (error) throw error

  const tags: { id: string; name: string; color: string | null; namespace: string | null }[] = []
  for (const row of data ?? []) {
    if (row.tags) {
      tags.push(row.tags as unknown as { id: string; name: string; color: string | null; namespace: string | null })
    }
  }
  return tags
}

export async function scheduleReminder(eventId: string, minutesBefore = 60, attendeesOnly = true) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  const { data, error } = await supabase.rpc('schedule_event_reminder', {
    p_event_id: eventId,
    p_minutes_before: minutesBefore,
    p_attendees_only: attendeesOnly,
  })
  if (error) throw error
  return data
}

export async function getEventICS(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  const { data, error } = await supabase.rpc('get_event_ics', { p_event_id: eventId })
  if (error) throw error
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
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('person_id, first_name, last_name, email, phone, family_name, status, responded_at')
      .eq('event_id', eventId)
      .order('last_name', { ascending: true })

    if (!error && data) return data
  } catch {}

  try {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('event_attendees')
      .select('person_id, status, responded_at, persons!inner (first_name, last_name, email, phone, families (family_name))')
      .eq('event_id', eventId)

    if (fallbackError) return []

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
    return transformedData
  } catch {
    return []
  }
}

export async function archiveEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  const { data, error } = await supabase.rpc('archive_event', { p_event_id: eventId })
  if (error) throw error
  return data
}

export async function unarchiveEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')
  const { data, error } = await supabase.rpc('unarchive_event', { p_event_id: eventId })
  if (error) throw error
  return data
}

export async function listArchivedEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*, profiles!events_archived_by_fkey(id, persons(first_name, last_name))')
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
