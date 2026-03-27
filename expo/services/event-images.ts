import { supabase } from '@/lib/supabase'
import { Platform } from 'react-native'

const BUCKET = 'event-images' as const

export function eventImageUrl(path?: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

export function announcementImageUrl(path?: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

async function fetchUploadData(uri: string): Promise<{ data: ArrayBuffer | Blob; contentType: string }> {
  const resp = await fetch(uri)
  if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  const blob = await resp.blob()
  if (!blob || blob.size === 0) throw new Error('Image blob is empty')

  const contentType = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg'

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

async function uploadToBucket(path: string, uploadData: ArrayBuffer | Blob, contentType: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, uploadData, {
    contentType, upsert: true, cacheControl: '3600',
  })
  if (error) throw error
}

export async function uploadEventImage(localUri: string, eventId: string): Promise<{ publicUrl: string; path: string }> {
  const u = localUri?.trim()
  const id = eventId?.trim()
  if (!u || !id) throw new Error('Missing required parameters: localUri and eventId')

  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) throw new Error('Not authenticated')

  const path = `${id}/cover.jpg`
  const { data: uploadData, contentType } = await fetchUploadData(u)
  await uploadToBucket(path, uploadData, contentType)

  const { error: updErr } = await supabase.from('events').update({ image_path: path }).eq('id', id)
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw new Error(`Event update failed: ${updErr.message}`)
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!pub?.publicUrl) throw new Error('Failed to get public URL')
  return { publicUrl: pub.publicUrl, path }
}

export async function uploadAnnouncementImage(localUri: string, announcementId: string): Promise<{ publicUrl: string; path: string }> {
  const u = localUri?.trim()
  const id = announcementId?.trim()
  if (!u || !id) throw new Error('Missing required parameters: localUri and announcementId')

  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) throw new Error('Not authenticated')

  const path = `announcements/${id}/image.jpg`
  const { data: uploadData, contentType } = await fetchUploadData(u)
  await uploadToBucket(path, uploadData, contentType)

  const { error: updErr } = await supabase.from('announcements').update({ image_path: path }).eq('id', id)
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw new Error(`Announcement update failed: ${updErr.message}`)
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!pub?.publicUrl) throw new Error('Failed to get public URL')
  return { publicUrl: pub.publicUrl, path }
}
