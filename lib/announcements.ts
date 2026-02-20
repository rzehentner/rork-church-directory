import { supabase } from '@/lib/supabase'

type Role = 'admin'|'leader'|'member'|'visitor'|'pending'

export type Announcement = {
  id: string
  title: string
  body: string | null
  image_path: string | null
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  roles_allowed: Role[] | null
  is_public: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export async function createAnnouncement(input: {
  title: string
  body?: string | null
  roles_allowed?: Role[] | null
  is_public?: boolean
  published_at?: string | null
  expires_at?: string | null
  publish_immediately?: boolean
  created_by: string
}) {
  const { data, error } = await supabase
    .from('announcements')
    .insert([{
      title: input.title,
      body: input.body ?? null,
      roles_allowed: input.roles_allowed ?? null,
      is_public: !!input.is_public,
      is_published: !!input.publish_immediately,
      published_at: input.publish_immediately ? new Date().toISOString() : input.published_at,
      expires_at: input.expires_at ?? null,
      created_by: input.created_by,
    }])
    .select('*')
    .single()

  if (error) throw error
  return data as Announcement
}

export async function getAnnouncement(id: string) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Announcement
}

export async function updateAnnouncement(id: string, patch: Partial<Announcement>) {
  const { data, error } = await supabase
    .from('announcements')
    .update({
      title: patch.title,
      body: patch.body,
      roles_allowed: patch.roles_allowed ?? null,
      is_public: patch.is_public,
      published_at: patch.published_at ?? null,
      expires_at: patch.expires_at ?? null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Announcement
}

export async function publishAnnouncement(id: string, when: string | null = null) {
  const { data, error } = await supabase
    .from('announcements')
    .update({
      is_published: true,
      published_at: when ?? new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Announcement
}

export async function unpublishAnnouncement(id: string) {
  const { data, error } = await supabase
    .from('announcements')
    .update({ is_published: false })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Announcement
}

export async function getAnnouncementTags(announcementId: string) {
  const { data, error } = await supabase
    .from('announcement_audience_tags')
    .select('tag_id, tags!inner(id, name, color)')
    .eq('announcement_id', announcementId)

  if (error) throw error
  return data?.map(item => item.tags).filter(Boolean) || [];
}

export async function setAnnouncementTags(announcementId: string, tagIds: string[]) {
  const { data: curr, error: e1 } = await supabase
    .from('announcement_audience_tags')
    .select('tag_id')
    .eq('announcement_id', announcementId)
  if (e1) throw e1
  const current = new Set((curr ?? []).map(r => r.tag_id))
  const next = new Set(tagIds)
  const toAdd = [...next].filter(id => !current.has(id))
  const toRemove = [...current].filter(id => !next.has(id))

  if (toRemove.length) {
    const { error } = await supabase
      .from('announcement_audience_tags')
      .delete()
      .eq('announcement_id', announcementId)
      .in('tag_id', toRemove)
    if (error) throw error
  }
  if (toAdd.length) {
    const rows = toAdd.map(tag_id => ({ announcement_id: announcementId, tag_id }))
    const { error } = await supabase.from('announcement_audience_tags').insert(rows)
    if (error) throw error
  }
}

export async function listAnnouncementsForMe(limit = 20, from = 0) {
  const { data, error } = await supabase
    .from('announcements_for_me')
    .select('id, title, body, published_at, expires_at, author_name, is_read, is_public, created_by')
    .order('published_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) throw new Error(`Database error: ${error.message}${error.details ? ` (${error.details})` : ''}`)
  if (!data) return []

  return data.map((announcement) => ({
    ...announcement,
    role_tags: [] as string[],
    person_tags: [] as string[]
  }))
}

export async function markAnnouncementRead(announcementId: string) {
  const { data, error } = await supabase.rpc('mark_announcement_read', {
    p_announcement_id: announcementId
  })
  if (error) throw error
  return data
}
