import { supabase } from '@/lib/supabase'

// Storage bucket name constant
export const STORAGE_BUCKET = 'event-images' as const

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rwbppxcusppltwkcjmdu.supabase.co'
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${encodeURIComponent(path)}`
}

export async function uploadEventImage(localUri: string, eventId: string): Promise<string> {
  console.log('Uploading event image:', { localUri, eventId })
  
  // Validate inputs
  if (!localUri?.trim() || !eventId?.trim()) {
    throw new Error('Missing required parameters: localUri and eventId')
  }
  
  const sanitizedUri = localUri.trim()
  const sanitizedEventId = eventId.trim()
  
  if (sanitizedUri.length > 2000) {
    throw new Error('URI too long')
  }
  
  if (sanitizedEventId.length > 100) {
    throw new Error('Event ID too long')
  }
  
  try {
    // 1) Convert local file URI to Blob (same as profile images)
    const resp = await fetch(sanitizedUri)
    if (!resp.ok) {
      throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
    }
    const blob = await resp.blob()
    
    console.log('Blob size:', blob.size, 'bytes')
    console.log('Blob type:', blob.type)
    
    if (!blob || blob.size === 0) {
      throw new Error('Image blob empty')
    }
    
    // 2) Generate unique filename to avoid collisions
    const timestamp = Date.now()
    const random = Math.random().toString(36).slice(2)
    const filename = `${timestamp}-${random}.jpg`
    const path = `events/${sanitizedEventId}/${filename}`
    
    console.log('Uploading to storage path:', path)
    
    // 3) Upload to event-images bucket
    const { data: uploadResult, error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { 
        contentType: 'image/jpeg',
        upsert: false, // Use false to avoid overwriting
        cacheControl: '3600'
      })
    
    if (upErr) {
      console.error('Storage upload error:', upErr)
      throw new Error(`Storage upload failed: ${upErr.message}`)
    }
    
    console.log('Upload successful!', uploadResult)
    
    // 4) Update the event record with the image path
    const { error: updErr } = await supabase
      .from('events')
      .update({ image_path: path })
      .eq('id', sanitizedEventId)
    
    if (updErr) {
      console.error('Error updating event image path:', updErr)
      throw new Error(`Failed to update event record: ${updErr.message}`)
    }

    // 5) Get public URL for display
    const { data: pub } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path)
    
    const publicUrl = pub?.publicUrl
    if (!publicUrl) {
      throw new Error('Failed to get public URL')
    }
    
    console.log('Generated public URL:', publicUrl)
    return publicUrl
  } catch (error) {
    console.error('uploadEventImage error:', error)
    throw error
  }
}

// Diagnostic probe function as suggested by backend developer
export async function runDiagnosticProbe(eventId: string): Promise<string> {
  try {
    console.log('=== DIAGNOSTIC PROBE START ===')
    
    // 1. Check auth session
    const { data: session } = await supabase.auth.getSession()
    console.log('Auth session?', !!session?.session, session?.session?.user?.id)
    
    if (!session?.session) {
      return '❌ No auth session found'
    }
    
    // 2. Test storage write with text probe
    const testPath = `events/${eventId}/${Date.now()}-probe.txt`
    const body = new Blob(['probe'], { type: 'text/plain' })
    const { error: probeErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(testPath, body, { upsert: false, contentType: 'text/plain' })
    
    console.log('Storage probe upload OK?', !probeErr, probeErr?.message)
    
    if (probeErr) {
      return `❌ Storage write blocked: ${probeErr.message}`
    }
    
    // 3. Test events table update
    const { error: updErr } = await supabase
      .from('events')
      .update({ image_path: testPath })
      .eq('id', eventId)
    
    console.log('Events update OK?', !updErr, updErr?.message)
    
    if (updErr) {
      return `❌ Events table update blocked: ${updErr.message}`
    }
    
    // 4. Clean up test file
    await supabase.storage.from(STORAGE_BUCKET).remove([testPath])
    
    console.log('=== DIAGNOSTIC PROBE END ===')
    return '✅ All checks passed - storage write and events update both work'
    
  } catch (error) {
    console.error('Diagnostic probe error:', error)
    return `❌ Probe failed: ${error}`
  }
}

// Test functions for debugging storage issues
export async function testStorageBucket(): Promise<string> {
  try {
    // Use the object API to match the upload path & auth
    const { error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 1 })

    if (error) {
      return `❌ Bucket check failed: ${error.message}`
    }
    return '✅ Storage bucket is accessible (object API).'
  } catch (error) {
    return `❌ Bucket check error: ${error}`
  }
}

export async function testStorageWrite(eventId: string): Promise<string> {
  try {
    const path = `events/${eventId}/test.txt`
    const body = new Blob(['test upload'], { type: 'text/plain' })

    const { error } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(path, body, { upsert: true, contentType: 'text/plain' })

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }
    return `✅ Test upload successful to: ${path}`
  } catch (error) {
    return `❌ Test upload failed: ${error}`
  }
}