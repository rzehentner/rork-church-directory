// event-images.ts
import { supabase } from '@/lib/supabase'

export const STORAGE_BUCKET = 'event-images' as const

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://rwbppxcusppltwkcjmdu.supabase.co'
  const safe = path.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${safe}`
}

// --- helpers ---------------------------------------------------------------

function randName(ext = 'jpg') {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
}

function extFromTypeOrUri(type: string | null | undefined, uri?: string) {
  if (type) {
    const t = type.toLowerCase()
    if (t.includes('png')) return { ext: 'png', contentType: 'image/png' }
    if (t.includes('webp')) return { ext: 'webp', contentType: 'image/webp' }
    if (t.includes('heic') || t.includes('hei')) return { ext: 'heic', contentType: 'image/heic' }
    if (t.includes('jpeg') || t.includes('jpg')) return { ext: 'jpg', contentType: 'image/jpeg' }
  }
  const lower = (uri || '').toLowerCase()
  if (lower.endsWith('.png')) return { ext: 'png', contentType: 'image/png' }
  if (lower.endsWith('.webp')) return { ext: 'webp', contentType: 'image/webp' }
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return { ext: 'heic', contentType: 'image/heic' }
  return { ext: 'jpg', contentType: 'image/jpeg' }
}

async function fetchBlob(uri: string): Promise<Blob> {
  const resp = await fetch(uri)
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  const blob = await resp.blob()
  if (!blob || blob.size === 0) throw new Error('Image blob empty')
  return blob
}

// --- main API --------------------------------------------------------------

/**
 * Upload an image for an event and save its storage path on the event row.
 * Returns { publicUrl, path }.
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

  // Must be signed in (your RLS requires admin/leader)
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) throw new Error('Not authenticated')

  // Build blob + file naming
  const blob = await fetchBlob(u)
  const { ext, contentType } = extFromTypeOrUri(blob.type, u)
  const filename = randName(ext)
  const path = `events/${id}/${filename}`

  // Upload strategies
  const directUpload = async () => {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType, upsert: false, cacheControl: '3600' })
    if (error) throw error
  }

  const signedUpload = async () => {
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

  // Try direct upload; if it fails for transient/device reasons, retry once, then fall back
  try {
    await directUpload()
  } catch (errFirst: any) {
    // retry once (helps with flaky network/content:// races)
    try {
      await directUpload()
    } catch (errSecond: any) {
      console.warn(
        'Direct upload failed twice, switching to signed upload:',
        (errSecond && (errSecond.statusCode ?? errSecond.message)) ?? errSecond
      )
      await signedUpload()
    }
  }

  // DB: save the path on the event row
  const { error: updErr } = await supabase
    .from('events')
    .update({ image_path: path })
    .eq('id', id)
  if (updErr) {
    // optional: cleanup the uploaded object if DB update fails
    await supabase.storage.from(STORAGE_BUCKET).remove([path]).catch(() => {})
    throw new Error(`Event update blocked by RLS: ${updErr.message}`)
  }

  // Public URL (bucket is public)
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) throw new Error('Failed to get public URL')

  return { publicUrl, path }
}

/** Minimal probe to confirm write is permitted for the current user. */
export async function storageWriteProbe(eventId: string) {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) return '❌ Not authenticated'
  const probePath = `events/${eventId}/${Date.now()}-probe.txt`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(probePath, new Blob(['probe'], { type: 'text/plain' }), { upsert: false })
  if (error) return `❌ Storage write blocked: ${error.message} ${(error as any)?.statusCode ?? ''}`
  await supabase.storage.from(STORAGE_BUCKET).remove([probePath]).catch(() => {})
  return '✅ Storage write OK'
}

/** End-to-end smoke test to catch RLS issues on the events table. */
export async function smokeTest(eventId: string) {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) return '❌ Not authenticated'

  const prefix = `events/${eventId}`
  const { error: listErr } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1 })
  if (listErr) return `❌ Bucket list failed: ${listErr.message}`

  const probePath = `events/${eventId}/${Date.now()}-probe.txt`
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(probePath, new Blob(['probe'], { type: 'text/plain' }), { upsert: false })
  if (upErr) return `❌ Probe upload failed: ${upErr.message} ${(upErr as any)?.statusCode ?? ''}`

  const { error: updErr } = await supabase.from('events').update({ image_path: probePath }).eq('id', eventId)
  if (updErr) return `❌ Events update failed: ${updErr.message}`

  await supabase.storage.from(STORAGE_BUCKET).remove([probePath]).catch(() => {})
  return '✅ Smoke test passed'
}
