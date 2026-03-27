import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/utils/validation'

export interface ChoirNote {
  id: string
  title: string
  body: string | null
  song_title: string | null
  song_source: 'library' | 'external' | 'upload' | null
  song_url: string | null
  service_date: string | null
  tagged_members: string[] | null
  tagged_member_names?: string[]
  created_by: string | null
  created_by_name?: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface CreateChoirNoteInput {
  title: string
  body?: string
  song_title?: string
  song_source?: 'library' | 'external' | 'upload'
  song_url?: string
  service_date?: string
  tagged_members?: string[]
}

export interface UpdateChoirNoteInput extends Partial<CreateChoirNoteInput> {
  archived?: boolean
}

export interface ChoirMember {
  id: string
  first_name: string | null
  last_name: string | null
  user_id: string | null
}

const CHOIR_BUCKET = 'choir-uploads' as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolvePersonNames(
  personIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (personIds.length === 0) return map

  const { data, error } = await supabase
    .from('persons')
    .select('id, first_name, last_name')
    .in('id', personIds)

  if (error) throw error

  for (const person of data ?? []) {
    const name = [person.first_name, person.last_name].filter(Boolean).join(' ')
    map.set(person.id, name || person.id)
  }
  return map
}

async function hydrateNote(raw: ChoirNote): Promise<ChoirNote> {
  const idsToResolve: string[] = []

  if (raw.created_by && isValidUUID(raw.created_by)) {
    idsToResolve.push(raw.created_by)
  }
  for (const memberId of raw.tagged_members ?? []) {
    if (isValidUUID(memberId)) idsToResolve.push(memberId)
  }

  const nameMap = await resolvePersonNames([...new Set(idsToResolve)])

  return {
    ...raw,
    created_by_name: raw.created_by ? nameMap.get(raw.created_by) : undefined,
    tagged_member_names: (raw.tagged_members ?? []).map(
      id => nameMap.get(id) ?? id
    ),
  }
}

// ---------------------------------------------------------------------------
// Membership check
// ---------------------------------------------------------------------------

export async function checkIsChoirMember(personId: string): Promise<boolean> {
  if (!isValidUUID(personId)) return false

  const { data, error } = await supabase
    .from('taggings')
    .select('id, tags!inner(name)')
    .eq('person_id', personId)
    .ilike('tags.name', 'choir')
    .limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listChoirNotes(
  includeArchived = false
): Promise<ChoirNote[]> {
  let query = supabase
    .from('choir_director_notes')
    .select('*')
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.eq('archived', false)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as ChoirNote[]

  // Collect all person IDs that need names in a single batch request
  const allIds: string[] = []
  for (const note of rows) {
    if (note.created_by && isValidUUID(note.created_by)) allIds.push(note.created_by)
    for (const memberId of note.tagged_members ?? []) {
      if (isValidUUID(memberId)) allIds.push(memberId)
    }
  }

  const nameMap = await resolvePersonNames([...new Set(allIds)])

  return rows.map(note => ({
    ...note,
    created_by_name: note.created_by ? nameMap.get(note.created_by) : undefined,
    tagged_member_names: (note.tagged_members ?? []).map(
      id => nameMap.get(id) ?? id
    ),
  }))
}

// ---------------------------------------------------------------------------
// Get single
// ---------------------------------------------------------------------------

export async function getChoirNote(id: string): Promise<ChoirNote> {
  if (!isValidUUID(id)) throw new Error('Invalid choir note ID')

  const { data, error } = await supabase
    .from('choir_director_notes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) throw new Error('Choir note not found')

  return hydrateNote(data as ChoirNote)
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createChoirNote(
  note: CreateChoirNoteInput
): Promise<ChoirNote> {
  if (!note.title?.trim()) throw new Error('Title is required')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const payload = {
    title: note.title.trim(),
    body: note.body ?? null,
    song_title: note.song_title ?? null,
    song_source: note.song_source ?? null,
    song_url: note.song_url ?? null,
    service_date: note.service_date ?? null,
    tagged_members: note.tagged_members ?? null,
    created_by: user.id,
    archived: false,
  }

  const { data, error } = await supabase
    .from('choir_director_notes')
    .insert([payload])
    .select('*')
    .single()

  if (error) throw error
  return hydrateNote(data as ChoirNote)
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateChoirNote(
  id: string,
  updates: UpdateChoirNoteInput
): Promise<ChoirNote> {
  if (!isValidUUID(id)) throw new Error('Invalid choir note ID')

  const patch: Record<string, unknown> = {}
  if (updates.title !== undefined) patch.title = updates.title.trim()
  if (updates.body !== undefined) patch.body = updates.body ?? null
  if (updates.song_title !== undefined) patch.song_title = updates.song_title ?? null
  if (updates.song_source !== undefined) patch.song_source = updates.song_source ?? null
  if (updates.song_url !== undefined) patch.song_url = updates.song_url ?? null
  if (updates.service_date !== undefined) patch.service_date = updates.service_date ?? null
  if (updates.tagged_members !== undefined) patch.tagged_members = updates.tagged_members ?? null
  if (updates.archived !== undefined) patch.archived = updates.archived

  const { data, error } = await supabase
    .from('choir_director_notes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return hydrateNote(data as ChoirNote)
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteChoirNote(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('Invalid choir note ID')

  const { error } = await supabase
    .from('choir_director_notes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// Choir members (all persons tagged 'choir')
// ---------------------------------------------------------------------------

export async function listChoirMembers(): Promise<ChoirMember[]> {
  const { data, error } = await supabase
    .from('taggings')
    .select('persons!inner(id, first_name, last_name, user_id), tags!inner(name)')
    .ilike('tags.name', 'choir')

  if (error) throw error

  const members: ChoirMember[] = []
  for (const row of data ?? []) {
    const person = (row as any).persons
    if (person) {
      members.push({
        id: person.id,
        first_name: person.first_name ?? null,
        last_name: person.last_name ?? null,
        user_id: person.user_id ?? null,
      })
    }
  }

  members.sort((a, b) =>
    (a.last_name ?? '').localeCompare(b.last_name ?? '')
  )

  return members
}

// ---------------------------------------------------------------------------
// File upload
// ---------------------------------------------------------------------------

async function fetchUploadData(
  uri: string
): Promise<{ data: ArrayBuffer | Blob; contentType: string }> {
  const resp = await fetch(uri)
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  const blob = await resp.blob()
  if (!blob || blob.size === 0) throw new Error('File blob is empty')

  const contentType =
    blob.type && blob.type !== 'application/octet-stream'
      ? blob.type
      : 'application/octet-stream'

  if (Platform.OS === 'web') return { data: blob, contentType }

  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result)
      else reject(new Error('Failed to convert blob to ArrayBuffer'))
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsArrayBuffer(blob)
  })

  return { data: arrayBuffer, contentType }
}

export async function uploadChoirFile(
  uri: string,
  fileName: string
): Promise<string> {
  const u = uri?.trim()
  const name = fileName?.trim()
  if (!u || !name) throw new Error('Missing required parameters: uri and fileName')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const timestamp = Date.now()
  const path = `${user.id}/${timestamp}-${name}`
  const { data: uploadData, contentType } = await fetchUploadData(u)

  const { error } = await supabase.storage
    .from(CHOIR_BUCKET)
    .upload(path, uploadData, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    })

  if (error) throw error
  return path
}
