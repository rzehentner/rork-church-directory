import * as Calendar from 'expo-calendar'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { getEventICS } from '@/services/events'

async function ensureCalendarId() {
  if (Platform.OS === 'web') {
    throw new Error('Calendar access not available on web')
  }
  
  const { status } = await Calendar.requestCalendarPermissionsAsync()
  if (status !== 'granted') throw new Error('Calendar permission denied')
  const cal = await Calendar.getDefaultCalendarAsync()
  return cal.id
}

export async function addEventToDevice(ev: any) {
  if (Platform.OS === 'web') {
    await shareICS(ev.id, ev.title)
    return
  }
  
  const calendarId = await ensureCalendarId()
  const id = await Calendar.createEventAsync(calendarId, {
    title: ev.title,
    startDate: new Date(ev.start_at),
    endDate: new Date(ev.end_at),
    location: ev.location ?? undefined,
    allDay: !!ev.is_all_day,
    notes: ev.description ?? undefined,
    timeZone: 'UTC',
  })
  return id
}

export async function shareICS(eventId: string, title: string) {
  const ics = await getEventICS(eventId)
  const fileUri = `${FileSystem.cacheDirectory}${title.replace(/\W+/g,'_')}.ics`
  await FileSystem.writeAsStringAsync(fileUri, ics, { encoding: FileSystem.EncodingType.UTF8 })
  
  if (Platform.OS === 'web') {
    const link = document.createElement('a')
    link.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
    link.download = `${title.replace(/\W+/g,'_')}.ics`
    link.click()
  } else {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/calendar' })
  }
}