import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import type { Tag } from '@/services/tags';

interface TagPillProps {
  tag: Tag;
  size?: 'small' | 'medium';
  testId?: string;
  onRemove?: () => void;
  showRemove?: boolean;
}

export default function TagPill({ tag, size = 'small', testId, onRemove, showRemove = false }: TagPillProps) {
  return (
    <View
      style={[
        styles.pill,
        size === 'medium' && styles.pillMedium,
        { backgroundColor: tag.color || '#7C3AED' },
      ]}
      testID={testId}
    >
      <Text
        style={[
          styles.text,
          size === 'medium' && styles.textMedium,
        ]}
      >
        {tag.name}
      </Text>
      {showRemove && onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          testID={`${testId}-remove`}
        >
          <X size={size === 'medium' ? 14 : 12} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  textMedium: {
    fontSize: 12,
  },
  removeButton: {
    padding: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});