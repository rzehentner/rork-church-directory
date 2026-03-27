import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
// Lazy import — native module may not be in current binary (added via OTA)
let DocumentPicker: typeof import('expo-document-picker') | null = null;
try { DocumentPicker = require('expo-document-picker'); } catch { /* not available in this build */ }
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Music, Link, Upload, X, Check, Users, Trash2, FileText } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import DateTimePicker from '@/components/DateTimePicker';
import {
  getChoirNote,
  updateChoirNote,
  deleteChoirNote,
  listChoirMembers,
  uploadChoirFile,
} from '@/services/choir';
import type { ChoirMember } from '@/services/choir';
import { isValidUUID } from '@/utils/validation';

type SongSource = 'library' | 'external' | 'upload';

export default function EditChoirNoteScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [serviceDate, setServiceDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [songTitle, setSongTitle] = useState('');
  const [songSource, setSongSource] = useState<SongSource | null>(null);
  const [songUrl, setSongUrl] = useState('');
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [taggedMemberIds, setTaggedMemberIds] = useState<string[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch note
  const {
    data: note,
    isLoading: loadingNote,
    error: noteError,
  } = useQuery({
    queryKey: ['choir-note', id],
    queryFn: () => getChoirNote(id!),
    enabled: isValidUUID(id),
    staleTime: 0,
  });

  // Fetch choir members
  const { data: choirMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['choir-members'],
    queryFn: listChoirMembers,
    staleTime: 5 * 60 * 1000,
  });

  // Pre-fill form once note is loaded
  useEffect(() => {
    if (!note || initialized) return;

    setTitle(note.title);
    setBody(note.body ?? '');
    if (note.service_date) {
      // service_date is stored as YYYY-MM-DD; parse it as local midnight to avoid timezone shift
      const [year, month, day] = note.service_date.split('-').map(Number);
      setServiceDate(new Date(year, month - 1, day));
    }
    setSongTitle(note.song_title ?? '');
    setSongSource(note.song_source ?? null);
    // For upload source the stored value is a storage path, not a browsable URL
    if (note.song_source === 'upload') {
      setUploadedFilePath(note.song_url ?? null);
      // Extract filename from path (last segment)
      const segments = note.song_url?.split('/') ?? [];
      setUploadedFileName(segments[segments.length - 1] ?? null);
    } else {
      setSongUrl(note.song_url ?? '');
    }
    setTaggedMemberIds(note.tagged_members ?? []);
    setInitialized(true);
  }, [note, initialized]);

  const handlePickFile = async () => {
    try {
      if (!DocumentPicker) {
        Alert.alert('Not Available', 'File upload requires a newer app build. Please update the app.');
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'application/pdf'],
      });
      if (result.canceled || !result.assets[0]) return;

      const file = result.assets[0];
      setUploadingFile(true);
      const path = await uploadChoirFile(file.uri, file.name);
      setUploadedFilePath(path);
      setUploadedFileName(file.name);
    } catch (err) {
      Alert.alert('Upload Failed', 'Could not upload the file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleToggleMember = (memberId: string) => {
    setTaggedMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(m => m !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async () => {
    if (!isValidUUID(id)) {
      Alert.alert('Error', 'Invalid note ID.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title for this note.');
      return;
    }

    const resolvedSongUrl =
      songSource === 'upload' ? uploadedFilePath ?? undefined : songUrl.trim() || undefined;

    setSubmitting(true);
    try {
      await updateChoirNote(id!, {
        title: title.trim(),
        body: body.trim() || undefined,
        service_date: serviceDate ? serviceDate.toISOString().slice(0, 10) : undefined,
        song_title: songTitle.trim() || undefined,
        song_source: songSource ?? undefined,
        song_url: resolvedSongUrl,
        tagged_members: taggedMemberIds.length > 0 ? taggedMemberIds : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['choir-notes'] });
      queryClient.invalidateQueries({ queryKey: ['choir-note', id] });
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!isValidUUID(id)) return;

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteChoirNote(id!);
              queryClient.invalidateQueries({ queryKey: ['choir-notes'] });
              router.back();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Something went wrong.';
              Alert.alert('Error', message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const taggedNames = choirMembers
    .filter(m => taggedMemberIds.includes(m.id))
    .map(m => [m.first_name, m.last_name].filter(Boolean).join(' '));

  // Guard: invalid id
  if (!isValidUUID(id)) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Note', headerShown: true }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Invalid note ID.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading state
  if (loadingNote || !initialized) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Note', headerShown: true }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.navy} />
          <Text style={styles.loadingText}>Loading note…</Text>
        </View>
      </View>
    );
  }

  // Note not found
  if (noteError || !note) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Edit Note', headerShown: true }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Note not found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Edit Director's Note",
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting || submitting}
              style={styles.deleteHeaderButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.status.error} />
              ) : (
                <Trash2 size={20} color={Colors.status.error} />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sunday March 9 Rehearsal Notes"
              placeholderTextColor={Colors.text.muted}
            />
          </View>

          {/* Body */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder="Write notes, reminders, or instructions for the choir…"
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Service Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Service Date (Optional)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={18} color={Colors.navy} />
              <Text style={[styles.dateButtonText, !serviceDate && styles.placeholder]}>
                {serviceDate ? formatDate(serviceDate) : 'Select a service date'}
              </Text>
              {serviceDate && (
                <TouchableOpacity
                  onPress={() => setServiceDate(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={16} color={Colors.status.error} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Song Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Music size={18} color={Colors.navy} />
              <Text style={styles.sectionTitle}>Song (Optional)</Text>
            </View>

            <Text style={styles.label}>Song Title</Text>
            <TextInput
              style={[styles.input, styles.inputSpacing]}
              value={songTitle}
              onChangeText={setSongTitle}
              placeholder="e.g. How Great Thou Art"
              placeholderTextColor={Colors.text.muted}
            />

            <Text style={[styles.label, styles.labelSpacing]}>Song Source</Text>
            <View style={styles.sourceRow}>
              {(
                [
                  { key: 'library', label: 'From Library', icon: <FileText size={15} color={songSource === 'library' ? Colors.white : Colors.navy} /> },
                  { key: 'external', label: 'External Link', icon: <Link size={15} color={songSource === 'external' ? Colors.white : Colors.navy} /> },
                  { key: 'upload', label: 'Upload File', icon: <Upload size={15} color={songSource === 'upload' ? Colors.white : Colors.navy} /> },
                ] as { key: SongSource; label: string; icon: React.ReactNode }[]
              ).map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.sourceButton, songSource === key && styles.sourceButtonActive]}
                  onPress={() => {
                    setSongSource(prev => (prev === key ? null : key));
                    setSongUrl('');
                    setUploadedFilePath(null);
                    setUploadedFileName(null);
                  }}
                >
                  {icon}
                  <Text
                    style={[styles.sourceButtonText, songSource === key && styles.sourceButtonTextActive]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {songSource === 'library' && (
              <View style={styles.sourceDetail}>
                <Text style={styles.helperText}>Paste the link from the Song Library</Text>
                <TextInput
                  style={styles.input}
                  value={songUrl}
                  onChangeText={setSongUrl}
                  placeholder="https://drive.google.com/…"
                  placeholderTextColor={Colors.text.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            {songSource === 'external' && (
              <View style={styles.sourceDetail}>
                <Text style={styles.helperText}>Paste a YouTube, Spotify, or other link</Text>
                <TextInput
                  style={styles.input}
                  value={songUrl}
                  onChangeText={setSongUrl}
                  placeholder="https://youtube.com/…"
                  placeholderTextColor={Colors.text.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            )}

            {songSource === 'upload' && (
              <View style={styles.sourceDetail}>
                {uploadedFileName ? (
                  <View style={styles.uploadedFile}>
                    <FileText size={16} color={Colors.status.success} />
                    <Text style={styles.uploadedFileName} numberOfLines={1}>
                      {uploadedFileName}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setUploadedFilePath(null);
                        setUploadedFileName(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={16} color={Colors.status.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickFile}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <ActivityIndicator size="small" color={Colors.navy} />
                    ) : (
                      <Upload size={18} color={Colors.navy} />
                    )}
                    <Text style={styles.uploadButtonText}>
                      {uploadingFile ? 'Uploading…' : 'Choose Audio or PDF'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Tag Members */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={18} color={Colors.navy} />
              <Text style={styles.sectionTitle}>Tag Members (Optional)</Text>
            </View>

            <TouchableOpacity
              style={styles.tagMembersButton}
              onPress={() => setShowMemberPicker(true)}
            >
              <Users size={16} color={Colors.navy} />
              <Text style={styles.tagMembersButtonText}>
                {taggedMemberIds.length === 0
                  ? 'Select choir members…'
                  : `${taggedMemberIds.length} member${taggedMemberIds.length !== 1 ? 's' : ''} selected`}
              </Text>
            </TouchableOpacity>

            {taggedNames.length > 0 && (
              <View style={styles.memberChips}>
                {taggedNames.map((name, i) => (
                  <View key={i} style={styles.memberChip}>
                    <Text style={styles.memberChipText}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Submit */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (submitting || deleting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || deleting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* iOS Date Picker */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.datePickerTitle}>Service Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={serviceDate ?? new Date()}
              mode="date"
              display="spinner"
              onChange={(_, selected) => {
                if (selected) setServiceDate(selected);
              }}
              textColor={Colors.text.primary}
              accentColor={Colors.navy}
            />
          </View>
        </View>
      )}

      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={serviceDate ?? new Date()}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setShowDatePicker(false);
            if (selected) setServiceDate(selected);
          }}
          textColor={Colors.text.primary}
          accentColor={Colors.navy}
        />
      )}

      {/* Member Picker Modal */}
      <Modal
        visible={showMemberPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMemberPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tag Choir Members</Text>
            <TouchableOpacity
              onPress={() => setShowMemberPicker(false)}
              style={styles.modalCloseButton}
            >
              <X size={22} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {loadingMembers ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={Colors.navy} />
            </View>
          ) : choirMembers.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No choir members found.</Text>
              <Text style={styles.modalEmptySubtext}>
                Members are shown here once they are tagged with "choir".
              </Text>
            </View>
          ) : (
            <FlatList
              data={choirMembers}
              keyExtractor={item => item.id}
              renderItem={({ item }: { item: ChoirMember }) => {
                const selected = taggedMemberIds.includes(item.id);
                const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Unknown';
                return (
                  <TouchableOpacity
                    style={styles.memberRow}
                    onPress={() => handleToggleMember(item.id)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected && <Check size={14} color={Colors.white} />}
                    </View>
                    <Text style={styles.memberRowName}>{fullName}</Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.memberList}
            />
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowMemberPicker(false)}
            >
              <Text style={styles.modalDoneButtonText}>
                Done{taggedMemberIds.length > 0 ? ` (${taggedMemberIds.length} selected)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Loading / error states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.status.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.navy,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },

  // Header delete button
  deleteHeaderButton: {
    marginRight: 4,
    padding: 4,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Labels
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  labelSpacing: {
    marginTop: 12,
  },
  required: {
    color: Colors.status.error,
  },

  // Inputs
  input: {
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text.primary,
  },
  inputSpacing: {
    marginBottom: 0,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 10,
  },
  placeholder: {
    color: Colors.text.muted,
  },

  // Date button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background.card,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },

  // Song source buttons
  sourceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.card,
  },
  sourceButtonActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  sourceButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  sourceButtonTextActive: {
    color: Colors.white,
  },
  sourceDetail: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 6,
  },

  // Upload
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
    backgroundColor: Colors.background.elevated,
  },
  uploadButtonText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '500',
  },
  uploadedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.status.success,
    backgroundColor: Colors.background.card,
  },
  uploadedFileName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },

  // Member tagging
  tagMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.card,
  },
  tagMembersButtonText: {
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '500',
  },
  memberChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  memberChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.background.elevated,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  memberChipText: {
    fontSize: 12,
    color: Colors.text.primary,
  },

  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    backgroundColor: Colors.background.primary,
  },
  submitButton: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Date picker overlay (iOS)
  datePickerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: Colors.background.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  datePickerCancel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.navy,
  },

  // Member picker modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.background.card,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  memberList: {
    padding: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.card,
  },
  checkboxSelected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  memberRowName: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  modalDoneButton: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
