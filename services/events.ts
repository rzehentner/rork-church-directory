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
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .eq('id', eventId)
    .single()
  if (error) throw error
  return data
}

export async function listEventsForDateRange(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .gte('start_at', startDate.toISOString())
    .lte('end_at', endDate.toISOString())
    .order('start_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listEventsForDate(date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .or(`and(start_at.lte.${endOfDay.toISOString()},end_at.gte.${startOfDay.toISOString()})`)
    .order('start_at', { ascending: true })
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
}) {
  const { data, error } = await supabase
    .from('events')
    .insert([{
      title: input.title,
      description: input.description ?? null,
      start_at: input.start_at,
      end_at: input.end_at,
      is_all_day: !!input.is_all_day,
      location: input.location ?? null,
      is_public: !!input.is_public,
      roles_allowed: input.roles_allowed ?? null,
    }])
    .select('*')
    .single()
  if (error) throw error
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

export async function setEventTags(eventId: string, tagIds: string[]) {
  const { data: curr, error: e1 } = await supabase
    .from('event_audience_tags')
    .select('tag_id')
    .eq('event_id', eventId)
  if (e1) throw e1
  const current = new Set((curr ?? []).map(r => r.tag_id))
  const next = new Set(tagIds)
  const toAdd = [...next].filter(id => !current.has(id))
  const toRemove = [...current].filter(id => !next.has(id))

  if (toRemove.length) {
    const { error } = await supabase
      .from('event_audience_tags')
      .delete()
      .eq('event_id', eventId)
      .in('tag_id', toRemove)
    if (error) throw error
  }
  if (toAdd.length) {
    const rows = toAdd.map(tag_id => ({ event_id: eventId, tag_id }))
    const { error } = await supabase.from('event_audience_tags').insert(rows)
    if (error) throw error
  }
}

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL!
  return `${base}/storage/v1/object/public/event-images/${encodeURIComponent(path)}`
}

export async function getEventICS(eventId: string) {
  const { data, error } = await supabase.rpc('get_event_ics', { p_event_id: eventId })
  if (error) throw error
  return data as string
}