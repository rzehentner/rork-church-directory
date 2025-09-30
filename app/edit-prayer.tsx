import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrayer, updatePrayer } from '@/services/prayer';

export default function EditPrayerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [status, setStatus] = useState<'open' | 'answered' | 'archived'>('open');

  const { data: prayer, isLoading } = useQuery({
    queryKey: ['prayer', id],
    queryFn: () => getPrayer(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (prayer) {
      setSubject(prayer.subject);
      setDetails(prayer.details || '');
      setIsAnonymous(prayer.is_anonymous);
      setStatus(prayer.status);
    }
  }, [prayer]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePrayer(id, {
        subject: subject.trim(),
        details: details.trim() || null,
        for_person_id: null,
        is_anonymous: isAnonymous,
        status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      queryClient.invalidateQueries({ queryKey: ['prayer', id] });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to update prayer request');
    },
  });

  const handleSubmit = () => {
    if (!subject.trim()) {
      Alert.alert('Required', 'Please enter a subject for the prayer request');
      return;
    }

    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Prayer', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Prayer Request',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={updateMutation.isPending || !subject.trim()}
              style={styles.saveButton}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <Text
                  style={[
                    styles.saveButtonText,
                    (!subject.trim() || updateMutation.isPending) && styles.saveButtonTextDisabled,
                  ]}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.label}>
            Subject <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g., Surgery tomorrow"
            placeholderTextColor="#9CA3AF"
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Details (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={details}
            onChangeText={setDetails}
            placeholder="Add more context about this prayer request..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            {(['open', 'answered', 'archived'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusButton, status === s && styles.statusButtonActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.statusButtonText, status === s && styles.statusButtonTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Post anonymously</Text>
              <Text style={styles.hint}>Your name will not be shown</Text>
            </View>
            <Switch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
              thumbColor={isAnonymous ? '#7C3AED' : '#F3F4F6'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  saveButton: {
    marginRight: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  saveButtonTextDisabled: {
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  statusButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center' as const,
  },
  statusButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  switchLabel: {
    flex: 1,
  },
});
