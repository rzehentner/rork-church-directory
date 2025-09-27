import { supabase } from '@/lib/supabase'

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rwbppxcusppltwkcjmdu.supabase.co'
  return `${baseUrl}/storage/v1/object/public/event-images/${encodeURIComponent(path)}`
}

export async function uploadEventImage(localUri: string, eventId: string) {
  console.log('Uploading event image:', { localUri, eventId })
  
  if (!localUri?.trim() || !eventId?.trim()) {
    throw new Error('Missing required parameters: localUri and eventId')
  }
  
  try {
    // Validate and sanitize the URI
    const sanitizedUri = localUri.trim()
    if (sanitizedUri.length > 2000) {
      throw new Error('URI too long')
    }
    
    // Build a path for the event image
    const ext = (sanitizedUri.split('.').pop() || 'jpg').toLowerCase()
    const path = `events/${eventId}/cover.${ext}`
    console.log('Uploading to storage path:', path)
    
    // Use the same upload logic as profile images but for event-images bucket
    const res = await fetch(sanitizedUri)
    if (!res.ok) {
      throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`)
    }
    
    const blob = await res.blob()
    console.log('Blob size:', blob.size, 'bytes')
    console.log('Blob type:', blob.type)
    
    if (!blob || blob.size === 0) {
      throw new Error('Image blob empty')
    }
    
    // Upload to event-images bucket
    const { data: uploadResult, error: upErr } = await supabase.storage
      .from('event-images')
      .upload(path, blob, { 
        contentType: blob.type || 'image/jpeg', 
        upsert: true,
        cacheControl: '0'
      })
    
    if (upErr) {
      console.error('Storage upload error:', upErr)
      throw new Error(`Storage upload failed: ${upErr.message}`)
    }
    
    console.log('Upload successful!', uploadResult)
    
    // Update the event record with the image path
    const { error: updErr } = await supabase
      .from('events')
      .update({ image_path: path })
      .eq('id', eventId)
    
    if (updErr) {
      console.error('Error updating event image path:', updErr)
      throw new Error(`Failed to update event record: ${updErr.message}`)
    }

    // Get signed URL for immediate display
    const { data, error: sErr } = await supabase.storage
      .from('event-images')
      .createSignedUrl(path, 60 * 60)
      
    if (sErr) {
      console.error('Signed URL error:', sErr)
      throw sErr
    }

    // Add timestamp to force refresh
    const urlWithTimestamp = `${data.signedUrl}&t=${Date.now()}`
    console.log('Generated signed URL with timestamp:', urlWithTimestamp)
    return urlWithTimestamp
  } catch (error) {
    console.error('uploadEventImage error:', error)
    throw error
  }
}