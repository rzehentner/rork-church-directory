import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useMe } from '@/hooks/me-context';
import { listTags, getPersonWithTags } from '@/services/tags';
import { useQuery } from '@tanstack/react-query';

export default function ExampleUsage() {
  const { myRole, myPersonId, isLoading: meLoading, error: meError } = useMe();

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const personWithTagsQuery = useQuery({
    queryKey: ['person-with-tags', myPersonId],
    queryFn: () => getPersonWithTags(myPersonId!),
    enabled: !!myPersonId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleShowInfo = () => {
    Alert.alert(
      'My Info',
      `Role: ${myRole || 'Unknown'}\nPerson ID: ${myPersonId || 'Unknown'}`,
      [{ text: 'OK' }]
    );
  };

  if (meLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading user info...</Text>
      </View>
    );
  }

  if (meError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {meError.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Layer Example</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Info (from useMe hook):</Text>
        <Text style={styles.infoText}>Role: {myRole || 'Unknown'}</Text>
        <Text style={styles.infoText}>Person ID: {myPersonId || 'Unknown'}</Text>
        <TouchableOpacity style={styles.button} onPress={handleShowInfo}>
          <Text style={styles.buttonText}>Show Alert</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Tags:</Text>
        {tagsQuery.isLoading ? (
          <Text style={styles.loadingText}>Loading tags...</Text>
        ) : tagsQuery.error ? (
          <Text style={styles.errorText}>Error loading tags</Text>
        ) : (
          tagsQuery.data?.map((tag) => (
            <View key={tag.id} style={styles.tagItem}>
              <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
              <Text style={styles.tagName}>{tag.name}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Tags:</Text>
        {personWithTagsQuery.isLoading ? (
          <Text style={styles.loadingText}>Loading person tags...</Text>
        ) : personWithTagsQuery.error ? (
          <Text style={styles.errorText}>Error loading person tags</Text>
        ) : personWithTagsQuery.data ? (
          <Text style={styles.infoText}>
            {personWithTagsQuery.data.tags.length === 0 
              ? 'No tags assigned' 
              : `${personWithTagsQuery.data.tags.length} tags assigned`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic' as const,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center' as const,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tagItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  tagColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  tagName: {
    fontSize: 16,
    color: '#333',
  },
});