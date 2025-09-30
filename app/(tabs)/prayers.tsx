import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { Plus, Heart, Trash2, Edit, Clock } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPrayers, markPrayed, unmarkPrayedToday, deletePrayer, type PrayerRequest } from '@/services/prayer';
import { useMe } from '@/hooks/me-context';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

type TabStatus = 'open' | 'answered' | 'archived';

export default function PrayersScreen() {
  const router = useRouter();
  const { myRole } = useMe();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>('open');
  const insets = useSafeAreaInsets();

  const { data: prayers = [], isLoading, refetch } = useQuery({
    queryKey: ['prayers', activeTab],
    queryFn: () => listPrayers(activeTab),
    staleTime: 30 * 1000,
  });

  const prayedMutation = useMutation({
    mutationFn: async ({ id, currentState }: { id: string; currentState: boolean }) => {
      if (currentState) {
        await unmarkPrayedToday(id);
      } else {
        await markPrayed(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrayer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel('prayers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_requests' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_prayed' }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetch]);

  const handlePrayToggle = (prayer: PrayerRequest) => {
    prayedMutation.mutate({ id: prayer.id, currentState: prayer.i_prayed_today });
  };

  const handleDelete = (prayer: PrayerRequest) => {
    Alert.alert(
      'Delete Prayer Request',
      'Are you sure you want to delete this prayer request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(prayer.id),
        },
      ]
    );
  };

  const canEdit = (prayer: PrayerRequest) => {
    return prayer.is_owner || myRole === 'admin' || myRole === 'leader';
  };

  const renderPrayerCard = ({ item }: { item: PrayerRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.subject}>{item.subject}</Text>
          {item.is_owner && (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>by me</Text>
            </View>
          )}
        </View>
        {canEdit(item) && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => router.push(`/edit-prayer?id=${item.id}`)}
              style={styles.actionButton}
            >
              <Edit size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.actionButton}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.details && (
        <Text style={styles.details} numberOfLines={3}>
          {item.details}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Heart size={16} color="#7C3AED" />
            <Text style={styles.statText}>{item.total_prayers}</Text>
          </View>
          {item.last_prayed_at && (
            <View style={styles.statItem}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.lastPrayed}>
                {formatDistanceToNow(new Date(item.last_prayed_at), { addSuffix: true })}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.prayButton, item.i_prayed_today && styles.prayButtonActive]}
          onPress={() => handlePrayToggle(item)}
          disabled={prayedMutation.isPending}
        >
          <Heart
            size={18}
            color={item.i_prayed_today ? '#FFFFFF' : '#7C3AED'}
            fill={item.i_prayed_today ? '#FFFFFF' : 'transparent'}
          />
          <Text style={[styles.prayButtonText, item.i_prayed_today && styles.prayButtonTextActive]}>
            {item.i_prayed_today ? 'Prayed' : 'I Prayed'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (myRole === 'pending') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Heart size={28} color="#7C3AED" />
            <Text style={styles.headerTitle}>Prayer List</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Become a member to participate in the prayer list</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Heart size={28} color="#7C3AED" />
          <Text style={styles.headerTitle}>Prayer List</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/create-prayer')} style={styles.createButton}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['open', 'answered', 'archived'] as TabStatus[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : prayers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === 'open' ? 'No active prayer requests' : `No ${activeTab} requests`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={prayers}
          renderItem={renderPrayerCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  tabs: {
    flexDirection: 'row' as const,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center' as const,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#7C3AED',
    fontWeight: '600' as const,
  },
  createButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center' as const,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  subject: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    flex: 1,
  },
  ownerBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  actions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  details: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  stats: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  lastPrayed: {
    fontSize: 12,
    color: '#6B7280',
  },
  prayButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  prayButtonActive: {
    backgroundColor: '#7C3AED',
  },
  prayButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#7C3AED',
  },
  prayButtonTextActive: {
    color: '#FFFFFF',
  },
});
