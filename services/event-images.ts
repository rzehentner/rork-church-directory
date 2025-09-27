import { supabase } from '@/lib/supabase'

export const STORAGE_BUCKET = 'event-images' as const

// ✅ Keep slashes; only encode unsafe chars
export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
  // encode each segment, not the slashes
  const safe = path.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${safe}`
}

// small helper
function randName(ext = 'jpg') {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
}

async function uriToBlob(uri: string): Promise<Blob> {
  const resp = await fetch(uri)
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  return await resp.blob()
}

export async function uploadEventImage(localUri: string, eventId: string): Promise<{ path: string; publicUrl: string }> {
  if (!localUri?.trim() || !eventId?.trim()) throw new Error('Missing required parameters: localUri and eventId')

  // 1) Blob
  const blob = await uriToBlob(localUri.trim())
  if (!blob || blob.size === 0) throw new Error('Image blob empty')

  // 2) Extension + contentType
  const type = blob.type || 'image/jpeg'           // RN often returns ''
  const ext = type.includes('png') ? 'png'
            : type.includes('webp') ? 'webp'
            : 'jpg'                                // default to jpg
  const filename = randName(ext)
  const path = `events/${eventId.trim()}/${filename}`

  // 3) Upload
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, blob, {
      contentType: type,
      upsert: false,              // avoid needing UPDATE permission
      cacheControl: '3600',
    })
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

  // 4) Update event row (requires events RLS to permit this user)
  const { error: updErr } = await supabase.from('events')
    .update({ image_path: path })
    .eq('id', eventId.trim())
  if (updErr) throw new Error(`Failed to update event record: ${updErr.message}`)

  // 5) Public URL (requires SELECT policy on bucket for anon if you plan to show publicly)
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) throw new Error('Failed to get public URL')

  return { path, publicUrl }
}

// Diagnostics (safe tweaks)
export async function testStorageBucket(): Promise<string> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).list('events', { limit: 1 })
  return error ? `❌ Bucket check failed: ${error.message}` : '✅ Storage bucket is accessible (object API).'
}

export async function testStorageWrite(eventId: string): Promise<string> {
  try {
    const testPath = `events/${eventId}/${randName('txt')}`
    const body = new Blob(['test upload'], { type: 'text/plain' })
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(testPath, body, { upsert: false })
    if (error) throw error
    return `✅ Test upload successful to: ${testPath}`
  } catch (e: any) {
    return `❌ Test upload failed: ${e?.message ?? e}`
  }
}
