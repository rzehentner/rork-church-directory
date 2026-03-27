import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Music,
  Plus,
  ExternalLink,
  Calendar,
  User,
  Trash2,
  Edit3,
  FolderOpen,
  Archive,
  AlertCircle,
  FileText,
} from 'lucide-react-native';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useMe } from '@/hooks/me-context';
import { useChurchSettings } from '@/hooks/church-settings-context';
import { listChoirNotes, deleteChoirNote, checkIsChoirMember } from '@/services/choir';
import type { ChoirNote } from '@/services/choir';
import { Colors } from '@/constants/colors';
import HeaderBackButton from '@/components/HeaderBackButton';
import { styles } from '@/styles/choir.styles';

// ---------------------------------------------------------------------------
// Song Library Card
// ---------------------------------------------------------------------------

interface SongLibraryCardProps {
  driveUrl: string | null | undefined;
}

function SongLibraryCard({ driveUrl }: SongLibraryCardProps) {
  const hasUrl = !!driveUrl;

  const handlePress = useCallback(() => {
    if (!driveUrl) return;
    Linking.openURL(driveUrl).catch(() =>
      Alert.alert('Error', 'Could not open the song library link.')
    );
  }, [driveUrl]);

  return (
    <TouchableOpacity
      style={[styles.songLibraryCard, !hasUrl && styles.songLibraryCardDisabled]}
      onPress={handlePress}
      activeOpacity={hasUrl ? 0.7 : 1}
      disabled={!hasUrl}
    >
      <View style={styles.songLibraryInner}>
        <View style={[styles.songLibraryIconWrapper, !hasUrl && styles.songLibraryIconWrapperDisabled]}>
          <FolderOpen size={26} color={hasUrl ? Colors.gold : Colors.text.muted} />
        </View>
        <View style={styles.songLibraryTextGroup}>
          <Text style={styles.songLibraryTitle}>Song Library</Text>
          <Text style={styles.songLibrarySubtitle}>
            {hasUrl ? 'Access sheet music and recordings' : 'Song library not configured'}
          </Text>
        </View>
        {hasUrl && <ExternalLink size={18} color={Colors.text.secondary} />}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function NoteCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={[styles.skeletonLine, { width: '60%', height: 14 }]} />
      <View style={[styles.skeletonLine, { width: '40%', height: 12 }]} />
      <View style={[styles.skeletonLine, { width: '100%', height: 12 }]} />
      <View style={[styles.skeletonLine, { width: '85%', height: 12 }]} />
      <View style={[styles.skeletonLine, { width: '70%', height: 12 }]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Note Card
// ---------------------------------------------------------------------------

function songSourceIcon(source: string | null | undefined, size: number, color: string) {
  if (source === 'library') return <FolderOpen size={size} color={color} />;
  if (source === 'upload') return <FileText size={size} color={color} />;
  return <ExternalLink size={size} color={color} />;
}

interface NoteCardProps {
  note: ChoirNote;
  isAdminOrLeader: boolean;
  onDelete: (id: string) => void;
}

function NoteCard({ note, isAdminOrLeader, onDelete }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleSongPress = useCallback(() => {
    if (!note.song_url) return;
    Linking.openURL(note.song_url).catch(() =>
      Alert.alert('Error', 'Could not open the song link.')
    );
  }, [note.song_url]);

  const handleEdit = useCallback(() => {
    router.push({ pathname: '/edit-choir-note', params: { id: note.id } } as any);
  }, [note.id]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this director\'s note? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(note.id) },
      ]
    );
  }, [note.id, onDelete]);

  const timeAgo = formatDistanceToNow(new Date(note.created_at), { addSuffix: true });

  const hasSong = !!(note.song_title);
  const songIsTappable = !!(note.song_url);

  return (
    <View style={[styles.card, note.archived && styles.cardArchived]}>
      <View style={styles.cardInner}>
        <Text style={styles.cardTitle}>{note.title}</Text>

        {!!note.service_date && (
          <View style={styles.serviceDate}>
            <Calendar size={13} color={Colors.gold} />
            <Text style={styles.serviceDateText}>
              For {format(parseISO(note.service_date), 'EEEE, MMM d')}
            </Text>
          </View>
        )}

        {hasSong && (
          <TouchableOpacity
            style={styles.songRow}
            onPress={songIsTappable ? handleSongPress : undefined}
            activeOpacity={songIsTappable ? 0.7 : 1}
            disabled={!songIsTappable}
          >
            {songSourceIcon(note.song_source, 14, Colors.navy)}
            <Text style={[styles.songTitle, songIsTappable && styles.songTitleTappable]}>
              {note.song_title}
            </Text>
            {songIsTappable && <ExternalLink size={12} color={Colors.steelBlue} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
          <Text style={styles.bodyText} numberOfLines={expanded ? undefined : 4}>
            {note.body}
          </Text>
        </TouchableOpacity>

        {!!note.tagged_member_names && note.tagged_member_names.length > 0 && (
          <Text style={styles.taggedMembers}>
            For: {note.tagged_member_names.join(', ')}
          </Text>
        )}

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerMeta}>
            <User size={12} color={Colors.text.muted} />
            <Text style={styles.footerMetaText}>
              {note.created_by_name ?? 'Director'} · {timeAgo}
            </Text>
          </View>

          {isAdminOrLeader && (
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEdit} activeOpacity={0.7}>
                <Edit3 size={12} color={Colors.text.secondary} />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDelete]}
                onPress={handleDelete}
                activeOpacity={0.7}
              >
                <Trash2 size={12} color={Colors.status.error} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextDelete]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ChoirScreen() {
  const insets = useSafeAreaInsets();
  const { isAdminOrLeader, myPersonId } = useMe();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);

  // Choir notes
  const {
    data: notes = [],
    isLoading: notesLoading,
    isError: notesError,
    refetch: refetchNotes,
    isFetching: notesFetching,
  } = useQuery({
    queryKey: ['choir-notes', showArchived],
    queryFn: () => listChoirNotes(showArchived),
    staleTime: 2 * 60 * 1000,
  });

  // Choir membership check
  const { data: isChoirMember = false } = useQuery({
    queryKey: ['choir-membership', myPersonId],
    queryFn: async () => {
      if (!myPersonId) return false;
      return checkIsChoirMember(myPersonId);
    },
    enabled: !!myPersonId,
    staleTime: 5 * 60 * 1000,
  });

  // Choir drive URL from church settings context
  const { settings: churchSettings } = useChurchSettings();
  const choirDriveUrl = churchSettings.choirDriveUrl || null;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteChoirNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choir-notes'] });
    },
    onError: () => {
      Alert.alert('Error', 'Could not delete the note. Please try again.');
    },
  });

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['choir-notes'] });
  }, [queryClient]);

  const handleCreateNote = useCallback(() => {
    router.push('/create-choir-note' as any);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChoirNote }) => (
      <NoteCard note={item} isAdminOrLeader={isAdminOrLeader} onDelete={handleDelete} />
    ),
    [isAdminOrLeader, handleDelete]
  );

  const keyExtractor = useCallback((item: ChoirNote) => item.id, []);

  const ListHeader = (
    <>
      <SongLibraryCard driveUrl={choirDriveUrl} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Director's Notes</Text>
        {isAdminOrLeader && (
          <TouchableOpacity
            style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
            onPress={() => setShowArchived((v) => !v)}
            activeOpacity={0.7}
          >
            <Archive size={12} color={showArchived ? Colors.text.inverse : Colors.text.secondary} />
            <Text style={[styles.archiveToggleText, showArchived && styles.archiveToggleTextActive]}>
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const ListEmpty = (
    <View style={styles.emptyContainer}>
      <Music size={48} color={Colors.border.light} />
      <Text style={styles.emptyTitle}>No notes yet</Text>
      <Text style={styles.emptySubtext}>
        {isAdminOrLeader
          ? 'Post the first director\'s note for your choir.'
          : 'Check back for updates from the choir director.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <HeaderBackButton />
          <Music size={22} color={Colors.navy} />
          <Text style={styles.headerTitle}>Choir</Text>
        </View>
        {isAdminOrLeader && (
          <TouchableOpacity style={styles.addButton} onPress={handleCreateNote} activeOpacity={0.8}>
            <Plus size={16} color={Colors.text.inverse} />
            <Text style={styles.addButtonText}>Add Note</Text>
          </TouchableOpacity>
        )}
      </View>

      {notesLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <NoteCardSkeleton />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={ListHeader}
          scrollEnabled={false}
        />
      ) : notesError ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={Colors.status.error} />
          <Text style={styles.errorBannerText}>
            Could not load choir notes. Check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetchNotes()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={notesFetching && !notesLoading}
              onRefresh={handleRefresh}
              tintColor={Colors.navy}
              colors={[Colors.navy]}
            />
          }
        />
      )}
    </View>
  );
}
