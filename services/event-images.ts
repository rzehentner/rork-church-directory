import { supabase } from '@/lib/supabase'

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rwbppxcusppltwkcjmdu.supabase.co'
  return `${baseUrl}/storage/v1/object/public/event-images/${encodeURIComponent(path)}`
}

/** Upload a picked image and save the path into events.image_path. */
export async function uploadEventImage(localUri: string, eventId: string) {
  console.log('Uploading event image:', { localUri, eventId })
  
  if (!localUri || !eventId) {
    throw new Error('Missing required parameters: localUri and eventId')
  }
  
  try {
    console.log('Fetching image from local URI...')
    const res = await fetch(localUri)
    
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
    }
    
    const blob = await res.blob()
    console.log('Image blob details:', { size: blob.size, type: blob.type })
    
    if (!blob || blob.size === 0) {
      throw new Error('Image blob empty (URI fetch failed)')
    }
    
    if (blob.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Image file is too large (max 10MB)')
    }
    
    // Build a path; no leading slash; deterministic per event
    const ext = (localUri.split('.').pop() || 'jpg').toLowerCase()
    const path = `events/${eventId}/cover.${ext}`
    console.log('Uploading to storage path:', path)

    // Upload (staff-only; must be logged in; RLS enforces role)
    const { error: upErr } = await supabase.storage
      .from('event-images')
      .upload(path, blob, { 
        upsert: true, 
        contentType: blob.type || 'image/jpeg'
      })
    
    if (upErr) {
      console.error('Storage upload error:', upErr)
      throw new Error(`Storage upload failed: ${upErr.message}`)
    }
    
    console.log('Storage upload successful, updating event record...')
    // Persist path on the event row
    const { error: updErr } = await supabase
      .from('events')
      .update({ image_path: path })
      .eq('id', eventId)
    
    if (updErr) {
      console.error('Error updating event image path:', updErr)
      throw new Error(`Failed to update event record: ${updErr.message}`)
    }

    // Return public URL for UI
    const finalUrl = eventImageUrl(path)
    console.log('Event image uploaded successfully:', { path, url: finalUrl })
    return finalUrl
  } catch (error) {
    console.error('uploadEventImage error:', error)
    throw error
  }
}

/** Test if the storage bucket exists and is accessible */
export async function testStorageBucket() {
  try {
    console.log('Testing storage bucket access...')
    const { data, error } = await supabase.storage.from('event-images').list('', { limit: 1 })
    
    if (error) {
      console.error('Storage bucket test failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('Storage bucket test successful')
    return { success: true, data }
  } catch (error: any) {
    console.error('Storage bucket test error:', error)
    return { success: false, error: error.message }
  }
}