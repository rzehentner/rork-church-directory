import { supabase } from '@/lib/supabase'
import { STORAGE_BUCKET } from '@/lib/constants'

// Use the proper event-images bucket
const EVENT_IMAGES_BUCKET = STORAGE_BUCKET

export function eventImageUrl(path?: string | null) {
  if (!path) return null
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rwbppxcusppltwkcjmdu.supabase.co'
  return `${baseUrl}/storage/v1/object/public/${EVENT_IMAGES_BUCKET}/${encodeURIComponent(path)}`
}

/** Upload a picked image and save the path into events.image_path. */
export async function uploadEventImage(localUri: string, eventId: string) {
  console.log('Uploading event image:', { localUri, eventId })
  
  if (!localUri || !eventId) {
    throw new Error('Missing required parameters: localUri and eventId')
  }
  
  try {
    console.log('Preparing image for upload...')
    
    // Handle iOS ph:// URIs that fetch() can't read
    let uri = localUri
    if (uri.startsWith('ph://')) {
      try {
        const MediaLibrary = await import('expo-media-library')
        const assetId = uri.replace('ph://', '')
        const asset = await MediaLibrary.getAssetInfoAsync(assetId)
        uri = asset.localUri || asset.uri
      } catch (e) {
        console.warn('Could not resolve ph:// URI, trying original:', e)
        // Continue with original URI and let fetch() handle it
      }
    }
    
    // Convert URI -> Blob (reliable on RN/Expo)
    const res = await fetch(uri)
    if (!res.ok) {
      throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`)
    }
    
    const blob = await res.blob()
    console.log('Blob size:', blob.size, 'bytes')
    console.log('Blob type:', blob.type)
    
    if (!blob || blob.size === 0) {
      throw new Error('Image blob empty')
    }
    
    // Build a path; no leading slash; deterministic per event
    const ext = (uri.split('.').pop() || 'jpg').toLowerCase()
    const path = `events/${eventId}/cover.${ext}`
    console.log('Uploading to storage path:', path)

    // Upload to the event-images bucket using blob directly (works on both web and mobile)
    const { data: uploadResult, error: upErr } = await supabase.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(path, blob, { 
        contentType: blob.type || 'image/jpeg', 
        upsert: true
      })
    
    console.log('upload error', upErr)
    if (upErr) {
      console.error('Storage upload error:', upErr)
      throw new Error(`Storage upload failed: ${upErr.message}`)
    }
    
    console.log('Upload successful!', uploadResult)
    console.log('Updating event record...')
    
    // Persist path on the event row
    const { error: updErr } = await supabase
      .from('events')
      .update({ image_path: path })
      .eq('id', eventId)
    
    console.log('event update error', updErr)
    if (updErr) {
      console.error('Error updating event image path:', updErr)
      throw new Error(`Failed to update event record: ${updErr.message}`)
    }

    // Build public URL for display
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EVENT_IMAGES_BUCKET}/${encodeURIComponent(path)}`
  } catch (error) {
    console.error('uploadEventImage error:', error)
    throw error
  }
}

/** Test if the storage bucket exists and is accessible using the same client as uploads */
export async function testStorageBucket(): Promise<string> {
  // Use the *object* API so it matches the upload path & auth
  const { error } = await supabase
    .storage
    .from(EVENT_IMAGES_BUCKET)
    .list('', { limit: 1 })

  if (error) {
    // This is the error we care about (must not be "Bucket not found")
    return `❌ Bucket check failed: ${error.message}`
  }
  return '✅ Storage bucket is accessible (object API).'
}

/** Test storage write with a small text file */
export async function testStorageWrite(eventId: string) {
  try {
    console.log('Testing storage write with eventId:', eventId)
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }
    console.log('User authenticated:', user.id)
    
    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      throw new Error(`Profile error: ${profileError.message}`)
    }
    
    console.log('User role:', profile?.role)
    
    // Make a small blob ("hello world") - use string source for RN/Expo compatibility
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    const path = `test/${eventId}/test.txt`
    
    console.log('Uploading test file to path:', path)
    console.log('Blob details:', { size: blob.size, type: blob.type })

    const { error: upErr } = await supabase
      .storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'text/plain' })

    console.log('UPLOAD ERR:', upErr)
    if (upErr) {
      throw new Error(`Storage upload failed: ${upErr.message}`)
    }

    // Don't try to update a non-existent event record for test
    // Just verify the file was uploaded by trying to get its public URL
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${EVENT_IMAGES_BUCKET}/${encodeURIComponent(path)}`
    console.log('TEST URL:', url)
    
    // Clean up the test file
    try {
      await supabase.storage.from(EVENT_IMAGES_BUCKET).remove([path])
      console.log('Test file cleaned up successfully')
    } catch (cleanupError) {
      console.warn('Failed to clean up test file:', cleanupError)
    }
    
    return { success: true, url }
  } catch (error: any) {
    console.error('testStorageWrite error:', error)
    const errorMessage = error?.message || 'Unknown error occurred'
    return { success: false, error: errorMessage }
  }
}