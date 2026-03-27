import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface TagSkeletonProps {
  count?: number;
}

export function TagSkeleton({ count = 3 }: TagSkeletonProps) {
  return (
    <View style={styles.tagContainer}>
      {Array.from({ length: count }).map((_, index) => {
        const uniqueKey = `tag-skeleton-${count}-${index}`;
        return (
          <Skeleton
            key={uniqueKey}
            width={60 + Math.random() * 40} // Random width between 60-100
            height={32}
            borderRadius={16}
            style={styles.tagSkeleton}
          />
        );
      })}
    </View>
  );
}

export function PersonCardSkeleton() {
  return (
    <View style={styles.personCard}>
      <Skeleton width={40} height={40} borderRadius={20} style={styles.avatar} />
      <View style={styles.personInfo}>
        <Skeleton width="60%" height={16} style={styles.name} />
        <Skeleton width="40%" height={12} style={styles.detail} />
        <Skeleton width="80%" height={12} style={styles.detail} />
      </View>
    </View>
  );
}

export function TagPickerSkeleton() {
  return (
    <View style={styles.tagPickerContainer}>
      <Skeleton width={60} height={16} style={styles.title} />
      <TagSkeleton count={5} />
      <Skeleton width="100%" height={12} style={styles.helpText} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E7EB',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  tagSkeleton: {
    marginRight: 8,
    marginBottom: 8,
  },
  personCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
  },
  name: {
    marginBottom: 8,
  },
  detail: {
    marginBottom: 4,
  },
  tagPickerContainer: {
    marginVertical: 16,
  },
  title: {
    marginBottom: 12,
  },
  helpText: {
    marginTop: 8,
  },
});