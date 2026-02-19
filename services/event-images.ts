// event-images.ts
import { supabase } from '@/lib/supabase'

export const STORAGE_BUCKET = 'event-images' as const
const BUCKET_ALIASES = ['event-images', 'event_images', 'events', 'images'] as const

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    'https://rwbppxcusppltwkcjmdu.supabase.co'
  const bucket = _resolvedBucket ?? STORAGE_BUCKET
  const safe = path.split('/').map(encodeURIComponent).join('/')
  return `${baseUrl}/storage/v1/object/public/${bucket}/${safe}`
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
  console.log('📥 Fetching blob from:', uri)
  const resp = await fetch(uri)
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  const blob = await resp.blob()
  if (!blob || blob.size === 0) throw new Error('Image blob empty')
  console.log('✅ Blob fetched:', { size: blob.size, type: blob.type })
  return blob
}

// --- bucket resolution -----------------------------------------------------

let _resolvedBucket: string | null = null

async function resolveStorageBucket(): Promise<string> {
  if (_resolvedBucket) return _resolvedBucket

  console.log('🪣 Resolving storage bucket...')
  const { data: buckets, error } = await supabase.storage.listBuckets()
  
  if (error) {
    console.error('❌ Failed to list buckets:', error.message)
    console.log('⚠️  Falling back to default bucket name:', STORAGE_BUCKET)
    return STORAGE_BUCKET
  }

  const bucketNames = buckets?.map(b => b.name) ?? []
  console.log('🪣 Available buckets:', bucketNames)

  for (const alias of BUCKET_ALIASES) {
    if (bucketNames.includes(alias)) {
      console.log('✅ Matched bucket:', alias)
      _resolvedBucket = alias
      return alias
    }
  }

  // If no alias matches, check if there's any bucket with "event" or "image" in the name
  const fuzzy = bucketNames.find(
    n => n.toLowerCase().includes('event') || n.toLowerCase().includes('image')
  )
  if (fuzzy) {
    console.log('✅ Fuzzy matched bucket:', fuzzy)
    _resolvedBucket = fuzzy
    return fuzzy
  }

  console.warn(
    `⚠️  No matching bucket found. Available: [${bucketNames.join(', ')}]. ` +
    `Please create a bucket named "${STORAGE_BUCKET}" in your Supabase dashboard.`
  )
  return STORAGE_BUCKET
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
  console.log('🚀 uploadEventImage called', { localUri, eventId })
  
  const u = localUri?.trim()
  const id = eventId?.trim()
  if (!u || !id) throw new Error('Missing required parameters: localUri and eventId')
  if (u.length > 2000) throw new Error('URI too long')
  if (id.length > 100) throw new Error('Event ID too long')

  // Must be signed in
  const { data: sess } = await supabase.auth.getSession()
  console.log('🔐 Auth check:', sess?.session ? '✅ Authenticated' : '❌ Not authenticated')
  if (!sess?.session) throw new Error('Not authenticated')

  // Build blob + file naming
  const blob = await fetchBlob(u)
  const { ext, contentType } = extFromTypeOrUri(blob.type, u)
  const filename = randName(ext)
  const path = `events/${id}/${filename}`
  console.log('📁 Upload path:', path, '| Content-Type:', contentType)

  // Resolve the actual bucket name
  const bucket = await resolveStorageBucket()
  console.log('🪣 Using storage bucket:', bucket)

  // Upload with resolved bucket
  const directUpload = async () => {
    console.log('⬆️  Attempting direct upload...')
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType, upsert: false, cacheControl: '3600' })
    if (error) {
      console.error('❌ Direct upload error:', error)
      throw error
    }
    console.log('✅ Direct upload succeeded')
  }

  const signedUpload = async () => {
    console.log('🔏 Attempting signed upload...')
    const { data: signed, error: signErr } =
      await supabase.storage.from(bucket).createSignedUploadUrl(path)
    if (signErr) {
      console.error('❌ Signed URL creation error:', signErr)
      throw signErr
    }
    console.log('✅ Signed URL created')
    
    const { error: putErr } =
      await supabase.storage.from(bucket).uploadToSignedUrl(
        signed.path,
        signed.token,
        blob,
        { contentType }
      )
    if (putErr) {
      console.error('❌ Signed upload error:', putErr)
      throw putErr
    }
    console.log('✅ Signed upload succeeded')
  }

  // Try direct upload; if it fails for transient/device reasons, retry once, then fall back
  try {
    await directUpload()
  } catch {
    console.warn('⚠️  First upload attempt failed, retrying...')
    try {
      await directUpload()
    } catch (errSecond: any) {
      console.warn(
        '⚠️  Direct upload failed twice, switching to signed upload:',
        (errSecond && (errSecond.statusCode ?? errSecond.message)) ?? errSecond
      )
      await signedUpload()
    }
  }

  console.log('💾 Updating events table with image_path...')
  // DB: save the path on the event row
  const { error: updErr } = await supabase
    .from('events')
    .update({ image_path: path })
    .eq('id', id)
  if (updErr) {
    console.error('❌ Events table update error:', updErr)
    // optional: cleanup the uploaded object if DB update fails
    await supabase.storage.from(bucket).remove([path]).catch(() => {})
    throw new Error(`Event update blocked by RLS: ${updErr.message}`)
  }
  console.log('✅ Events table updated successfully')

  // Public URL (bucket is public)
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) throw new Error('Failed to get public URL')

  console.log('🎉 Upload complete!', { publicUrl, path })
  return { publicUrl, path }
}

