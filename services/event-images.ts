// event-images.ts
import { supabase } from '@/lib/supabase'

export const STORAGE_BUCKET = 'event-images' as const

// Build a public URL for a stored object (bucket is public)
export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://rwbppxcusppltwkcjmdu.supabase.co'
  // Encode each path segment, not the slashes
  const safe = path.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${safe}`
}

// Small helpers
function randName(ext = 'jpg') {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
}

function extFromTypeOrUri(type: string | null | undefined, uri?: string) {
  if (type) {
    if (type.includes('png')) return { ext: 'png', contentType: 'image/png' }
    if (type.includes('webp')) return { ext: 'webp', contentType: 'image/webp' }
    if (type.includes('heic') || type.includes('hei')) return { ext: 'heic', contentType: 'image/heic' }
    if (type.includes('jpeg') || type.includes('jpg')) return { ext: 'jpg', contentType: 'image/jpeg' }
  }
  // Fall back to URI hint
  const lower = (uri || '').toLowerCase()
  if (lower.endsWith('.png')) return { ext: 'png', contentType: 'image/png' }
  if (lower.endsWith('.webp')) return { ext: 'webp', contentType: 'image/webp' }
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return { ext: 'heic', contentType: 'image/heic' }
  // Default
  return { ext: 'jpg', contentType: 'image/jpeg' }
}

/**
 * Upload an image for an event and save the storage path on the event row.
 * Returns the public URL (bucket is public) and the storage path we saved.
 */
export async function uploadEventImage(
  localUri: string,
  eventId: string
): Promise<{ publicUrl: string; path: string }> {
  const u = localUri?.trim()
  const id = eventId?.trim()
  if (!u || !id) throw new Error('Missing required parameters: localUri and eventId')
  if (u.length > 2000) throw new Error('URI too long')
  if (id.length > 100) throw new Error('Event ID too long')

  // Ensure we’re signed in (your storage write policy requires it)
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) throw new Error('Not authenticated')

  // Fetch -> Blob
  const resp = await fetch(u)
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  const blob = await resp.blob()
  if (!blob || blob.size === 0) throw new Error('Image blob empty')

  // Decide extension + contentType
  const { ext, contentType } = extFromTypeOrUri(blob.type, u)

  // Unique path
  const filename = randName(ext)
  const path = `events/${id}/${filename}`

  // Try direct upload first
  const tryDirect = async () => {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      })
    if (error) throw error
  }

  // Fallback: signed upload (often fixes Android content:// + odd CORS/device issues)
  const trySigned = async () => {
    const { data: signed, error: signErr } =
      await supabase.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path)
    if (signErr) throw signErr
    const { error: putErr } =
      await supabase.storage.from(STORAGE_BUCKET).uploadToSignedUrl(
        signed.path,
        signed.token,
        blob,
        { contentType }
      )
    if (putErr) throw putErr
  }

  // Execute upload with fallback
  try {
    await tryDirect()
  } catch (e: any) {
    console.warn('Direct upload failed, trying signed URL fallback:', e?.message || e)
    await trySigned()
  }

  // Save path on the event row (ensure events RLS allows this user to update)
  const { error: updErr } = await supabase
    .from('events')
    .update({ image_path: path })
    .eq('id', id)
  if (updErr) throw new Error(`Event update blocked by RLS: ${updErr.message}`)

  // Build a public URL for display
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) throw new Error('Failed to get public URL')

  return { publicUrl, path }
}

/** Minimal probe that works on client (does NOT call listBuckets) */
export async function storageWriteProbe(eventId: string) {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) return '❌ Not authenticated'
  const path = `events/${eventId}/${Date.now()}-probe.txt`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, new Blob(['probe'], { type: 'text/plain' }), { upsert: false })
  if (error) return `❌ Storage write blocked: ${error.message}`
  // clean up
  await supabase.storage.from(STORAGE_BUCKET).remove([path])
  return '✅ Storage write OK'
}

/** Quick end-to-end smoke test (client-safe) */
export async function smokeTest(eventId: string) {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) return '❌ Not authenticated'

  // 1) list a prefix (proves SELECT policy)
  const prefix = `events/${eventId}`
  const { error: listErr } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1 })
  if (listErr) return `❌ Bucket list failed: ${listErr.message}`

  // 2) probe upload
  const probePath = `events/${eventId}/${Date.now()}-probe.txt`
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(probePath, new Blob(['probe'], { type: 'text/plain' }), { upsert: false })
  if (upErr) return `❌ Probe upload failed: ${upErr.message}`

  // 3) DB update check
  const { error: updErr } = await supabase.from('events').update({ image_path: probePath }).eq('id', eventId)
  if (updErr) return `❌ Events update failed: ${updErr.message}`

  // 4) cleanup
  await supabase.storage.from(STORAGE_BUCKET).remove([probePath])
  return '✅ Smoke test passed'
}
