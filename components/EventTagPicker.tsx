import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { listTags, type Tag } from '@/services/tags'
import { X, Plus } from 'lucide-react-native'

interface EventTagPickerProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  disabled?: boolean
  testId?: string
}

export default function EventTagPicker({ 
  selectedTagIds, 
  onTagsChange, 
  disabled = false,
  testId 
}: EventTagPickerProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      const tags = await listTags(true) // Only active tags
      setAvailableTags(tags)
    } catch (error) {
      console.error('Failed to load tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTag = useCallback((tagId: string) => {
    if (disabled) return
    
    const isSelected = selectedTagIds.includes(tagId)
    if (isSelected) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }, [selectedTagIds, onTagsChange, disabled])

  if (loading) {
    return (
      <View style={styles.container} testID={testId}>
        <Text style={styles.label}>Target Audience Tags</Text>
        <Text style={styles.loadingText}>Loading tags...</Text>
      </View>
    )
  }

  if (availableTags.length === 0) {
    return (
      <View style={styles.container} testID={testId}>
        <Text style={styles.label}>Target Audience Tags</Text>
        <Text style={styles.emptyText}>No tags available</Text>
      </View>
    )
  }

  return (
    <View style={styles.container} testID={testId}>
      <Text style={styles.label}>Target Audience Tags</Text>
      <Text style={styles.description}>
        Select tags to target specific audience groups. Public events ignore these for visibility but keep them for analytics.
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tagsScrollView}
        contentContainerStyle={styles.tagsContainer}
      >
        {availableTags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id)
          
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagChip,
                isSelected && styles.tagChipSelected,
                isSelected && { backgroundColor: tag.color || '#7C3AED' },
                disabled && styles.tagChipDisabled
              ]}
              onPress={() => handleToggleTag(tag.id)}
              disabled={disabled}
              testID={`event-tag-${tag.id}`}
            >
              <Text style={[
                styles.tagText,
                isSelected && styles.tagTextSelected,
                disabled && styles.tagTextDisabled
              ]}>
                {tag.name}
              </Text>
              
              <View style={styles.tagIcon}>
                {isSelected ? (
                  <X size={14} color={isSelected ? '#FFFFFF' : '#6B7280'} />
                ) : (
                  <Plus size={14} color="#6B7280" />
                )}
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
      
      {selectedTagIds.length > 0 && (
        <Text style={styles.selectedCount}>
          {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  tagsScrollView: {
    marginBottom: 8,
  },
  tagsContainer: {
    paddingRight: 16,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  tagChipSelected: {
    borderColor: 'transparent',
  },
  tagChipDisabled: {
    opacity: 0.5,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  tagTextDisabled: {
    color: '#9CA3AF',
  },
  tagIcon: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '500',
  },
})