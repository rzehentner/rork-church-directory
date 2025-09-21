import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'

type Event = {
  id: string
  title: string
  start_at: string
  end_at: string
  is_all_day: boolean
}

type CalendarProps = {
  events: Event[]
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onMonthChange?: (date: Date) => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar({ events, selectedDate, onDateSelect, onMonthChange }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    events.forEach(event => {
      const startDate = new Date(event.start_at)
      const endDate = new Date(event.end_at)
      
      // Add event to all dates it spans
      const current = new Date(startDate)
      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0]
        if (!map.has(dateKey)) {
          map.set(dateKey, [])
        }
        map.get(dateKey)!.push(event)
        current.setDate(current.getDate() + 1)
      }
    })
    return map
  }, [events])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(current)
        const dateKey = date.toISOString().split('T')[0]
        const dayEvents = eventsByDate.get(dateKey) || []
        const isCurrentMonth = date.getMonth() === month
        const isToday = date.toDateString() === new Date().toDateString()
        const isSelected = date.toDateString() === selectedDate.toDateString()
        
        days.push({
          date,
          dateKey,
          day: date.getDate(),
          events: dayEvents,
          isCurrentMonth,
          isToday,
          isSelected,
        })
        
        current.setDate(current.getDate() + 1)
      }
    }
    
    return days
  }, [currentMonth, eventsByDate, selectedDate])

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  const handleDatePress = (date: Date) => {
    onDateSelect(date)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateMonth('prev')}
        >
          <ChevronLeft size={20} color="#7C3AED" />
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateMonth('next')}
        >
          <ChevronRight size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      {/* Days of week */}
      <View style={styles.daysHeader}>
        {DAYS.map(day => (
          <Text key={day} style={styles.dayHeaderText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendar}>
        {calendarDays.map((dayData, index) => (
          <TouchableOpacity
            key={`${dayData.dateKey}-${index}`}
            style={[
              styles.dayCell,
              !dayData.isCurrentMonth && styles.dayCellInactive,
              dayData.isToday && styles.dayCellToday,
              dayData.isSelected && styles.dayCellSelected,
            ]}
            onPress={() => handleDatePress(dayData.date)}
          >
            <Text style={[
              styles.dayText,
              !dayData.isCurrentMonth && styles.dayTextInactive,
              dayData.isToday && styles.dayTextToday,
              dayData.isSelected && styles.dayTextSelected,
            ]}>
              {dayData.day}
            </Text>
            
            {dayData.events.length > 0 && (
              <View style={styles.eventIndicators}>
                {dayData.events.slice(0, 3).map((event, eventIndex) => (
                  <View key={`${event.id}-${eventIndex}`} style={styles.eventDot} />
                ))}
                {dayData.events.length > 3 && (
                  <Text style={styles.moreEventsText}>+{dayData.events.length - 3}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
    position: 'relative',
  },
  dayCellInactive: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: '#EDE9FE',
  },
  dayCellSelected: {
    backgroundColor: '#7C3AED',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  dayTextInactive: {
    color: '#9CA3AF',
  },
  dayTextToday: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventIndicators: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#7C3AED',
  },
  moreEventsText: {
    fontSize: 8,
    color: '#7C3AED',
    fontWeight: '600',
  },
})