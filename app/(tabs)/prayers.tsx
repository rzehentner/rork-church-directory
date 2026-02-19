import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Plus,
  Heart,
  Trash2,
  Edit,
  Clock,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarArrowDown,
  CalendarArrowUp,
  CheckSquare,
  Square,
  X,
  Archive,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPrayers,
  markPrayed,
  unmarkPrayedToday,
  deletePrayer,
  bulkUpdatePrayerStatus,
  bulkDeletePrayers,
  type PrayerRequest,
} from '@/services/prayer';
import { useMe } from '@/hooks/me-context';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { styles } from '@/styles/prayers.styles';

type TabStatus = 'open' | 'answered' | 'archived';
type SortMode = 'date_desc' | 'date_asc' | 'subject_asc' | 'subject_desc';

const SORT_OPTIONS: { key: SortMode; label: string; icon: typeof ArrowDownAZ }[] = [
  { key: 'date_desc', label: 'Newest', icon: CalendarArrowDown },
  { key: 'date_asc', label: 'Oldest', icon: CalendarArrowUp },
  { key: 'subject_asc', label: 'A → Z', icon: ArrowDownAZ },
  { key: 'subject_desc', label: 'Z → A', icon: ArrowUpAZ },
];

export default function PrayersScreen() {
  const router = useRouter();
  const { myRole } = useMe();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>('open');
  const [sortMode, setSortMode] = useState<SortMode>('date_desc');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);
  const insets = useSafeAreaInsets();
  const [barAnim] = useState(() => new Animated.Value(0));

  const { data: prayers = [], isLoading, refetch } = useQuery({
    queryKey: ['prayers', activeTab],
    queryFn: () => listPrayers(activeTab),
    staleTime: 30 * 1000,
  });

  const sortedPrayers = useMemo(() => {
    const copy = [...prayers];
    switch (sortMode) {
      case 'date_desc':
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date_asc':
        return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'subject_asc':
        return copy.sort((a, b) => a.subject.localeCompare(b.subject));
      case 'subject_desc':
        return copy.sort((a, b) => b.subject.localeCompare(a.subject));
      default:
        return copy;
    }
  }, [prayers, sortMode]);

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

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TabStatus }) =>
      bulkUpdatePrayerStatus(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      exitSelectMode();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeletePrayers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      exitSelectMode();
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

  useEffect(() => {
    Animated.spring(barAnim, {
      toValue: selectMode && selectedIds.size > 0 ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [selectMode, selectedIds.size, barAnim]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    exitSelectMode();
  }, [activeTab, exitSelectMode]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedPrayers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedPrayers.map((p) => p.id)));
    }
  }, [selectedIds.size, sortedPrayers]);

  const handlePrayToggle = (prayer: PrayerRequest) => {
    prayedMutation.mutate({ id: prayer.id, currentState: prayer.i_prayed_today });
  };

  const handleDelete = (prayer: PrayerRequest) => {
    Alert.alert('Delete Prayer Request', 'Are you sure you want to delete this prayer request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(prayer.id) },
    ]);
  };

  const handleBulkStatusChange = (status: TabStatus) => {
    const count = selectedIds.size;
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    Alert.alert(
      `Mark as ${label}`,
      `Change ${count} prayer${count > 1 ? 's' : ''} to "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          onPress: () => bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status }),
        },
      ]
    );
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    Alert.alert(
      'Delete Selected',
      `Delete ${count} prayer request${count > 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => bulkDeleteMutation.mutate(Array.from(selectedIds)),
        },
      ]
    );
  };

  const canEdit = (prayer: PrayerRequest) => {
    return prayer.is_owner || myRole === 'admin' || myRole === 'leader';
  };

  const isAdmin = myRole === 'admin' || myRole === 'leader';
  const isBulkBusy = bulkStatusMutation.isPending || bulkDeleteMutation.isPending;

  const renderPrayerCard = ({ item }: { item: PrayerRequest }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={selectMode ? 0.7 : 1}
        onPress={selectMode ? () => toggleSelect(item.id) : undefined}
        onLongPress={isAdmin && !selectMode ? () => { setSelectMode(true); toggleSelect(item.id); } : undefined}
      >
        <View style={[styles.card, isSelected && styles.cardSelected]}>
          {selectMode && (
            <View style={styles.checkboxCol}>
              {isSelected ? (
                <CheckSquare size={22} color="#7C3AED" />
              ) : (
                <Square size={22} color="#D1D5DB" />
              )}
            </View>
          )}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
                {item.is_owner && (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerBadgeText}>mine</Text>
                  </View>
                )}
              </View>
              {!selectMode && canEdit(item) && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => router.push(`/edit-prayer?id=${item.id}` as any)}
                    style={styles.actionButton}
                    hitSlop={8}
                  >
                    <Edit size={17} color="#9CA3AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    style={styles.actionButton}
                    hitSlop={8}
                  >
                    <Trash2 size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {item.details ? (
              <Text style={styles.details} numberOfLines={2}>{item.details}</Text>
            ) : null}

            <View style={styles.cardFooter}>
              <View style={styles.metaRow}>
                <View style={styles.statItem}>
                  <Heart size={14} color="#7C3AED" fill="#EDE9FE" />
                  <Text style={styles.statText}>{item.total_prayers}</Text>
                </View>
                <Text style={styles.dateSeparator}>·</Text>
                <Text style={styles.dateText}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </Text>
              </View>

              {!selectMode && (
                <TouchableOpacity
                  style={[styles.prayButton, item.i_prayed_today && styles.prayButtonActive]}
                  onPress={() => handlePrayToggle(item)}
                  disabled={prayedMutation.isPending}
                  activeOpacity={0.7}
                >
                  <Heart
                    size={15}
                    color={item.i_prayed_today ? '#FFFFFF' : '#7C3AED'}
                    fill={item.i_prayed_today ? '#FFFFFF' : 'transparent'}
                  />
                  <Text style={[styles.prayButtonText, item.i_prayed_today && styles.prayButtonTextActive]}>
                    {item.i_prayed_today ? 'Prayed' : 'Pray'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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

  const activeSortOption = SORT_OPTIONS.find((s) => s.key === sortMode)!;
  const ActiveSortIcon = activeSortOption.icon;
  const allSelected = sortedPrayers.length > 0 && selectedIds.size === sortedPrayers.length;

  const bulkBarTranslate = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const bulkStatusTargets = (['open', 'answered', 'archived'] as TabStatus[]).filter(
    (s) => s !== activeTab
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Heart size={26} color="#7C3AED" />
          <Text style={styles.headerTitle}>Prayers</Text>
        </View>
        <View style={styles.headerRight}>
          {isAdmin && !selectMode && (
            <TouchableOpacity
              onPress={() => { setSelectMode(true); }}
              style={styles.headerIconBtn}
              hitSlop={8}
            >
              <CheckSquare size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
          {selectMode ? (
            <TouchableOpacity onPress={exitSelectMode} style={styles.headerIconBtn} hitSlop={8}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/create-prayer' as any)}
              style={styles.createButton}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
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

      <View style={styles.toolbar}>
        {selectMode && sortedPrayers.length > 0 && (
          <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn} activeOpacity={0.7}>
            {allSelected ? (
              <CheckSquare size={18} color="#7C3AED" />
            ) : (
              <Square size={18} color="#9CA3AF" />
            )}
            <Text style={[styles.selectAllText, allSelected && styles.selectAllTextActive]}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </Text>
          </TouchableOpacity>
        )}
        {selectMode && selectedIds.size > 0 && (
          <Text style={styles.selectedCount}>{selectedIds.size} selected</Text>
        )}
        {!selectMode && (
          <View style={styles.sortRow}>
            {showSortMenu ? (
              <View style={styles.sortChips}>
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = sortMode === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.sortChip, active && styles.sortChipActive]}
                      onPress={() => {
                        setSortMode(opt.key);
                        setShowSortMenu(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon size={14} color={active ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowSortMenu(true)}
                style={styles.sortTrigger}
                activeOpacity={0.7}
              >
                <ActiveSortIcon size={15} color="#7C3AED" />
                <Text style={styles.sortTriggerText}>{activeSortOption.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : sortedPrayers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={48} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>
            {activeTab === 'open' ? 'No active prayers' : `No ${activeTab} prayers`}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'open' ? 'Tap "New" to add a prayer request' : ''}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedPrayers}
          renderItem={renderPrayerCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, selectMode && selectedIds.size > 0 && { paddingBottom: 100 }]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <Animated.View
          style={[
            styles.bulkBar,
            { paddingBottom: insets.bottom + 12, transform: [{ translateY: bulkBarTranslate }] },
          ]}
        >
          {isBulkBusy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.bulkActions}>
              {bulkStatusTargets.map((status) => {
                let Icon = RotateCcw;
                let color = '#F59E0B';
                if (status === 'answered') { Icon = CheckCircle2; color = '#10B981'; }
                if (status === 'archived') { Icon = Archive; color = '#6B7280'; }
                if (status === 'open') { Icon = RotateCcw; color = '#3B82F6'; }
                return (
                  <TouchableOpacity
                    key={status}
                    style={styles.bulkActionBtn}
                    onPress={() => handleBulkStatusChange(status)}
                    activeOpacity={0.7}
                  >
                    <Icon size={20} color={color} />
                    <Text style={[styles.bulkActionLabel, { color }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.bulkActionBtn}
                onPress={handleBulkDelete}
                activeOpacity={0.7}
              >
                <Trash2 size={20} color="#EF4444" />
                <Text style={[styles.bulkActionLabel, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}
