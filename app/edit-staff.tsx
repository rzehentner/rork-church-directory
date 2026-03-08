import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useMe } from '@/hooks/me-context';
import { ArrowLeft, Save, Trash2, User, Search } from 'lucide-react-native';
import ImageUploader from '@/components/ImageUploader';
import { Colors } from '@/constants/colors';
import { useQueryClient } from '@tanstack/react-query';
import { isValidUUID } from '@/utils/validation';

type StaffRecord = {
  id: string;
  person_id: string | null;
  title: string | null;
  first_name: string;
  last_name: string;
  public_email: string | null;
  public_phone: string | null;
  bio: string | null;
  photo_path: string | null;
  sort_order: number | null;
  is_active: boolean;
  is_public: boolean;
};

type PersonResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

const STAFF_BUCKET = 'staff-photos' as const;

async function uploadStaffPhoto(localUri: string, staffId: string): Promise<string> {
  const resp = await fetch(localUri);
  if (!resp.ok) throw new Error('Failed to fetch photo file');
  const blob = await resp.blob();
  if (!blob || blob.size === 0) throw new Error('Photo blob is empty');

  const contentType =
    blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';

  let uploadData: ArrayBuffer | Blob;
  if (Platform.OS === 'web') {
    uploadData = blob;
  } else {
    uploadData = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) resolve(reader.result);
        else reject(new Error('Failed to convert blob to ArrayBuffer'));
      };
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsArrayBuffer(blob);
    });
  }

  const path = `${staffId}/photo.jpg`;
  const { error } = await supabase.storage.from(STAFF_BUCKET).upload(path, uploadData, {
    contentType,
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;

  return path;
}

function staffPhotoUrl(path?: string | null): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(STAFF_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function EditStaffScreen() {
  const params = useLocalSearchParams();
  const staffId = Array.isArray(params.staffId) ? params.staffId[0] : params.staffId;
  const isEditMode = isValidUUID(staffId);

  const { isAdmin } = useMe();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [publicEmail, setPublicEmail] = useState('');
  const [publicPhone, setPublicPhone] = useState('');
  const [bio, setBio] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [personId, setPersonId] = useState<string | null>(null);
  const [linkedPersonName, setLinkedPersonName] = useState('');
  const [currentPhotoPath, setCurrentPhotoPath] = useState<string | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);

  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<PersonResult[]>([]);
  const [isSearchingPersons, setIsSearchingPersons] = useState(false);
  const [showPersonResults, setShowPersonResults] = useState(false);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      if (Platform.OS === 'web') {
        // On web, Alert.alert is not available — navigate away immediately
        router.back();
      } else {
        Alert.alert('Access Denied', 'Only admins can manage staff members.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
      return;
    }

    if (isEditMode) {
      loadStaff();
    }
  }, [isAdmin, isEditMode]);

  const loadStaff = async () => {
    if (!isValidUUID(staffId)) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        if (Platform.OS !== 'web') {
          Alert.alert('Not Found', 'Staff member not found.');
        }
        router.back();
        return;
      }

      const staff = data as StaffRecord;
      setFirstName(staff.first_name ?? '');
      setLastName(staff.last_name ?? '');
      setTitle(staff.title ?? '');
      setPublicEmail(staff.public_email ?? '');
      setPublicPhone(staff.public_phone ?? '');
      setBio(staff.bio ?? '');
      setSortOrder(staff.sort_order != null ? String(staff.sort_order) : '');
      setIsActive(staff.is_active);
      setIsPublic(staff.is_public);
      setCurrentPhotoPath(staff.photo_path ?? null);
      setPersonId(staff.person_id ?? null);

      if (isValidUUID(staff.person_id)) {
        const { data: person } = await supabase
          .from('persons')
          .select('first_name, last_name')
          .eq('id', staff.person_id as string)
          .maybeSingle();
        if (person) {
          setLinkedPersonName(
            `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim()
          );
        }
      }
    } catch (err: any) {
      console.error('loadStaff error:', err);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', err?.message || 'Failed to load staff member.');
      }
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonSearch = async (query: string) => {
    setPersonSearch(query);
    if (query.trim().length < 2) {
      setPersonResults([]);
      setShowPersonResults(false);
      return;
    }

    setIsSearchingPersons(true);
    try {
      const { data, error } = await supabase
        .from('persons')
        .select('id, first_name, last_name, email')
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%`
        )
        .limit(10);

      if (error) throw error;
      setPersonResults((data as PersonResult[]) ?? []);
      setShowPersonResults(true);
    } catch (err: any) {
      console.error('person search error:', err);
    } finally {
      setIsSearchingPersons(false);
    }
  };

  const handleSelectPerson = (person: PersonResult) => {
    setPersonId(person.id);
    const name = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim();
    setLinkedPersonName(name);
    setPersonSearch('');
    setShowPersonResults(false);

    // Auto-fill name fields if they are empty
    if (!firstName.trim() && person.first_name) {
      setFirstName(person.first_name);
    }
    if (!lastName.trim() && person.last_name) {
      setLastName(person.last_name);
    }
  };

  const handleClearPerson = () => {
    setPersonId(null);
    setLinkedPersonName('');
    setPersonSearch('');
    setPersonResults([]);
    setShowPersonResults(false);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'First name is required.');
      }
      return;
    }
    if (!lastName.trim()) {
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'Last name is required.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const parsedSortOrder = sortOrder.trim() !== '' ? parseInt(sortOrder, 10) : null;

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim() || null,
        public_email: publicEmail.trim() || null,
        public_phone: publicPhone.trim() || null,
        bio: bio.trim() || null,
        sort_order: !isNaN(parsedSortOrder as number) ? parsedSortOrder : null,
        is_active: isActive,
        is_public: isPublic,
        person_id: isValidUUID(personId) ? personId : null,
      };

      let savedId: string;

      if (isEditMode && isValidUUID(staffId)) {
        const { error } = await supabase.from('staff').update(payload).eq('id', staffId);
        if (error) throw error;
        savedId = staffId as string;
      } else {
        const { data, error } = await supabase
          .from('staff')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        savedId = data.id;
      }

      // Upload photo if one was selected
      if (pendingPhotoUri) {
        try {
          const photoPath = await uploadStaffPhoto(pendingPhotoUri, savedId);
          await supabase.from('staff').update({ photo_path: photoPath }).eq('id', savedId);
        } catch (photoErr: any) {
          console.error('staff photo upload error:', photoErr);
          // Don't fail the save if photo upload fails — staff record is saved
          if (Platform.OS !== 'web') {
            Alert.alert('Warning', 'Staff member saved but photo upload failed.');
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['staff'] });
      router.back();
    } catch (err: any) {
      console.error('handleSave error:', err);
      if (Platform.OS !== 'web') {
        Alert.alert('Save Failed', err?.message || 'Failed to save staff member.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!isValidUUID(staffId)) return;

    const confirmDelete = async () => {
      setIsDeleting(true);
      try {
        // Soft delete: set is_active = false
        const { error } = await supabase
          .from('staff')
          .update({ is_active: false })
          .eq('id', staffId as string);
        if (error) throw error;

        await queryClient.invalidateQueries({ queryKey: ['staff'] });
        router.back();
      } catch (err: any) {
        console.error('handleDelete error:', err);
        if (Platform.OS !== 'web') {
          Alert.alert('Delete Failed', err?.message || 'Failed to deactivate staff member.');
        }
      } finally {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      // Web: use browser confirm (no Alert.alert)
      if (window.confirm('Deactivate this staff member? They will be hidden from the directory.')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Deactivate Staff Member',
        'This will hide them from the staff directory. You can reactivate them later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Deactivate', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const currentPhotoUrl = pendingPhotoUri
    ? pendingPhotoUri
    : staffPhotoUrl(currentPhotoPath);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: isEditMode ? 'Edit Staff' : 'Add Staff Member' }} />
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: isEditMode ? 'Edit Staff Member' : 'Add Staff Member',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={22} color={Colors.navy} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.headerButton, isSaving && styles.headerButtonDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.navy} />
              ) : (
                <Save size={22} color={Colors.navy} />
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo</Text>
          <View style={styles.photoRow}>
            <ImageUploader
              currentImageUrl={currentPhotoUrl}
              onUpload={async (file) => {
                setPendingPhotoUri(file.uri);
                return file.uri;
              }}
              placeholder="Add Photo"
              size={100}
              isCircular
              disabled={isSaving}
            />
            <Text style={styles.photoHint}>
              Tap to select a photo. It will be uploaded when you save.
            </Text>
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={Colors.text.muted}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>
            <View style={styles.rowSpacer} />
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={Colors.text.muted}
                autoCapitalize="words"
                editable={!isSaving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title / Role</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Senior Pastor, Worship Director"
              placeholderTextColor={Colors.text.muted}
              editable={!isSaving}
            />
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={publicEmail}
              onChangeText={setPublicEmail}
              placeholder="public@email.com"
              placeholderTextColor={Colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              value={publicPhone}
              onChangeText={setPublicPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor={Colors.text.muted}
              keyboardType="phone-pad"
              editable={!isSaving}
            />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Short biography shown on the staff directory..."
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>
        </View>

        {/* Link to Person */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Link to Member</Text>
          <Text style={styles.sectionSubtitle}>
            Optionally connect this staff record to an existing church member.
          </Text>

          {isValidUUID(personId) ? (
            <View style={styles.linkedPersonRow}>
              <User size={18} color={Colors.navy} />
              <Text style={styles.linkedPersonName}>{linkedPersonName}</Text>
              <TouchableOpacity onPress={handleClearPerson} style={styles.unlinkButton}>
                <Text style={styles.unlinkButtonText}>Unlink</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <View style={styles.searchInputRow}>
                <Search size={18} color={Colors.text.muted} style={styles.searchIcon} />
                <TextInput
                  style={[styles.input, styles.searchInput]}
                  value={personSearch}
                  onChangeText={handlePersonSearch}
                  placeholder="Search by name..."
                  placeholderTextColor={Colors.text.muted}
                  editable={!isSaving}
                  returnKeyType="search"
                />
                {isSearchingPersons && (
                  <ActivityIndicator
                    size="small"
                    color={Colors.navy}
                    style={styles.searchSpinner}
                  />
                )}
              </View>

              {showPersonResults && personResults.length > 0 && (
                <View style={styles.personResultsList}>
                  {personResults.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={styles.personResultItem}
                      onPress={() => handleSelectPerson(person)}
                    >
                      <User size={16} color={Colors.text.secondary} />
                      <View style={styles.personResultInfo}>
                        <Text style={styles.personResultName}>
                          {`${person.first_name ?? ''} ${person.last_name ?? ''}`.trim()}
                        </Text>
                        {person.email ? (
                          <Text style={styles.personResultEmail}>{person.email}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {showPersonResults && personResults.length === 0 && !isSearchingPersons && (
                <Text style={styles.noResultsText}>No members found.</Text>
              )}
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sort Order</Text>
            <TextInput
              style={[styles.input, styles.shortInput]}
              value={sortOrder}
              onChangeText={setSortOrder}
              placeholder="0"
              placeholderTextColor={Colors.text.muted}
              keyboardType="number-pad"
              editable={!isSaving}
            />
            <Text style={styles.fieldHint}>Lower numbers appear first.</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelBlock}>
              <Text style={styles.switchLabel}>Active</Text>
              <Text style={styles.switchDescription}>
                Inactive staff are hidden from all views.
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: Colors.switch.trackOff, true: Colors.switch.trackOn }}
              thumbColor={isActive ? Colors.switch.thumbOn : Colors.switch.thumbOff}
              disabled={isSaving}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabelBlock}>
              <Text style={styles.switchLabel}>Public</Text>
              <Text style={styles.switchDescription}>
                Public staff appear on the church website directory.
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: Colors.switch.trackOff, true: Colors.switch.trackOn }}
              thumbColor={isPublic ? Colors.switch.thumbOn : Colors.switch.thumbOff}
              disabled={isSaving}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Save size={18} color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Save Changes' : 'Add Staff Member'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete / Deactivate Button (edit mode only) */}
        {isEditMode && (
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting || isSaving}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Colors.status.error} />
            ) : (
              <>
                <Trash2 size={18} color={Colors.status.error} />
                <Text style={styles.deleteButtonText}>Deactivate Staff Member</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },

  // Sections
  section: {
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: -8,
    marginBottom: 12,
  },

  // Photo
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoHint: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.muted,
    lineHeight: 18,
  },

  // Form fields
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text.primary,
    backgroundColor: Colors.background.primary,
  },
  textArea: {
    minHeight: 110,
    paddingTop: 10,
  },
  shortInput: {
    width: 100,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowSpacer: {
    width: 12,
  },
  flex1: {
    flex: 1,
  },

  // Person search
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  searchSpinner: {
    marginLeft: 6,
  },
  personResultsList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 8,
    backgroundColor: Colors.background.card,
    overflow: 'hidden',
  },
  personResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  personResultInfo: {
    flex: 1,
  },
  personResultName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  personResultEmail: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 1,
  },
  noResultsText: {
    fontSize: 13,
    color: Colors.text.muted,
    paddingTop: 8,
    textAlign: 'center',
  },
  linkedPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background.elevated,
    borderRadius: 8,
    padding: 12,
  },
  linkedPersonName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  unlinkButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  unlinkButtonText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },

  // Switches
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: 4,
  },
  switchLabelBlock: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 2,
  },

  // Action buttons
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.navy,
    borderRadius: 10,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.status.error,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.status.error,
  },
});
