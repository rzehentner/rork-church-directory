import { supabase } from '@/lib/supabase'
import { updateEvent, eventImageUrl } from '@/services/events'

export async function uploadEventImage(localUri: string, eventId: string) {
  const res = await fetch(localUri)
  const blob = await res.blob()
  const ext = (localUri.split('.').pop() || 'jpg').toLowerCase()
  const path = `events/${eventId}/cover.${ext}`

  const { error } = await supabase.storage
    .from('event-images')
    .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' })
  if (error) throw error

  await updateEvent(eventId, { image_path: path })
  return eventImageUrl(path)
}