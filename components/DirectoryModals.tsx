import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Save, Home, Users, Trash2, UserPlus, Tags } from 'lucide-react-native';
import ImageUploader from '@/components/ImageUploader';
import PersonTagPicker from '@/components/PersonTagPicker';
import TagPill from '@/components/TagPill';
import { type Tag } from '@/services/tags';
import { styles } from '@/styles/directory.styles';

type FamilyRole = 'head' | 'spouse' | 'child' | 'other';

interface EditingFamily {
  id: string;
  name: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  home_phone: string;
  photo_path: string | null;
}

interface EditingMember {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  is_head_of_family: boolean;
  is_spouse: boolean;
  family_role: FamilyRole;
  photo_url: string | null;
  isNew?: boolean;
}

interface EditingPerson {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  is_head_of_family: boolean;
  is_spouse: boolean;
  family_role: FamilyRole;
  photo_url: string | null;
  family_id: string | null;
  user_id: string | null;
  user_role: 'pending' | 'visitor' | 'member' | 'leader' | 'admin' | null;
}

interface FamilyImages {
  familyPhotos: Record<string, string | null>;
  memberAvatars: Record<string, string | null>;
}

interface DirectoryEntry {
  person_id: string;
  family_id: string | null;
  family_name_display: string | null;
  [key: string]: any;
}

// ─── Edit Family Modal ───
interface EditFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  editingFamily: EditingFamily | null;
  setEditingFamily: React.Dispatch<React.SetStateAction<EditingFamily | null>>;
  editingMembers: EditingMember[];
  activeTab: 'family' | 'members';
  setActiveTab: (tab: 'family' | 'members') => void;
  isSaving: boolean;
  familyImages: FamilyImages;
  onSave: () => void;
  onDelete: () => void;
  onUploadFamilyPhoto: (file: any) => Promise<string>;
  onAddMember: () => void;
  onRemoveMember: (index: number) => void;
  onUpdateMember: (index: number, updates: Partial<EditingMember>) => void;
  onUploadMemberAvatar: (index: number, file: any) => Promise<string>;
}

export function EditFamilyModal({
  visible, onClose, editingFamily, setEditingFamily,
  editingMembers, activeTab, setActiveTab, isSaving,
  familyImages, onSave, onDelete, onUploadFamilyPhoto,
  onAddMember, onRemoveMember, onUpdateMember, onUploadMemberAvatar,
}: EditFamilyModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Family</Text>
          <TouchableOpacity
            style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
            onPress={onSave}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'family' && styles.activeTab]} onPress={() => setActiveTab('family')}>
            <Home size={16} color={activeTab === 'family' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>Family Info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'members' && styles.activeTab]} onPress={() => setActiveTab('members')}>
            <Users size={16} color={activeTab === 'members' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members ({editingMembers.length})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {editingFamily && activeTab === 'family' && (
            <>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Family Photo</Text>
                <View style={styles.familyPhotoContainer}>
                  <ImageUploader
                    currentImageUrl={familyImages.familyPhotos[editingFamily.id]}
                    onUpload={onUploadFamilyPhoto}
                    placeholder="Add Family Photo"
                    size={120}
                    isCircular={false}
                  />
                </View>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Family Name</Text>
                <TextInput style={styles.modalInput} value={editingFamily.name} onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, name: text } : null)} placeholder="Enter family name" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Address</Text>
                <Text style={styles.modalLabel}>Street Address</Text>
                <TextInput style={styles.modalInput} value={editingFamily.address_street} onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_street: text } : null)} placeholder="Enter street address" placeholderTextColor="#9CA3AF" />
                <View style={styles.modalRow}>
                  <View style={styles.modalRowItem}>
                    <Text style={styles.modalLabel}>City</Text>
                    <TextInput style={styles.modalInput} value={editingFamily.address_city} onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_city: text } : null)} placeholder="City" placeholderTextColor="#9CA3AF" />
                  </View>
                  <View style={styles.modalRowItem}>
                    <Text style={styles.modalLabel}>State</Text>
                    <TextInput style={styles.modalInput} value={editingFamily.address_state} onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_state: text } : null)} placeholder="State" placeholderTextColor="#9CA3AF" />
                  </View>
                  <View style={styles.modalRowItem}>
                    <Text style={styles.modalLabel}>ZIP</Text>
                    <TextInput style={styles.modalInput} value={editingFamily.address_zip} onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_zip: text } : null)} placeholder="ZIP" placeholderTextColor="#9CA3AF" />
                  </View>
                </View>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Home Phone</Text>
                <TextInput style={styles.modalInput} value={editingFamily.home_phone} onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, home_phone: text } : null)} placeholder="Enter home phone number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              </View>
            </>
          )}

          {activeTab === 'members' && (
            <>
              <View style={styles.modalSection}>
                <View style={styles.membersHeader}>
                  <Text style={styles.modalSectionTitle}>Family Members</Text>
                  <TouchableOpacity style={styles.addMemberButton} onPress={onAddMember}>
                    <UserPlus size={16} color="#7C3AED" />
                    <Text style={styles.addMemberButtonText}>Add Member</Text>
                  </TouchableOpacity>
                </View>

                {editingMembers.map((member, index) => (
                  <View key={member.id || `new-${index}`} style={styles.memberEditCard}>
                    <View style={styles.memberEditHeader}>
                      <View style={styles.memberEditAvatarContainer}>
                        <ImageUploader
                          currentImageUrl={member.id ? familyImages.memberAvatars[member.id] : null}
                          onUpload={(file) => onUploadMemberAvatar(index, file)}
                          placeholder="Avatar"
                          size={60}
                          isCircular={true}
                        />
                      </View>
                      <View style={styles.memberEditInfo}>
                        <View style={styles.memberEditRow}>
                          <View style={styles.memberEditRowItem}>
                            <Text style={styles.modalLabel}>First Name</Text>
                            <TextInput style={styles.modalInput} value={member.first_name} onChangeText={(text) => onUpdateMember(index, { first_name: text })} placeholder="First name" placeholderTextColor="#9CA3AF" />
                          </View>
                          <View style={styles.memberEditRowItem}>
                            <Text style={styles.modalLabel}>Last Name</Text>
                            <TextInput style={styles.modalInput} value={member.last_name} onChangeText={(text) => onUpdateMember(index, { last_name: text })} placeholder="Last name" placeholderTextColor="#9CA3AF" />
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.removeMemberButton} onPress={() => onRemoveMember(index)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.memberEditRow}>
                      <View style={styles.memberEditRowItem}>
                        <Text style={styles.modalLabel}>Email</Text>
                        <TextInput style={styles.modalInput} value={member.email} onChangeText={(text) => onUpdateMember(index, { email: text })} placeholder="Email address" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
                      </View>
                      <View style={styles.memberEditRowItem}>
                        <Text style={styles.modalLabel}>Phone</Text>
                        <TextInput style={styles.modalInput} value={member.phone} onChangeText={(text) => onUpdateMember(index, { phone: text })} placeholder="Phone number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
                      </View>
                    </View>
                    <View style={styles.memberEditRow}>
                      <View style={styles.memberEditRowItem}>
                        <Text style={styles.modalLabel}>Date of Birth</Text>
                        <TextInput style={styles.modalInput} value={member.date_of_birth} onChangeText={(text) => onUpdateMember(index, { date_of_birth: text })} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
                      </View>
                      <View style={styles.memberEditRowItem}>
                        <Text style={styles.modalLabel}>Family Role</Text>
                        <View style={styles.roleContainer}>
                          {(['head', 'spouse', 'child', 'other'] as const).map((role) => (
                            <TouchableOpacity
                              key={role}
                              style={[styles.roleButton, member.family_role === role && styles.roleButtonActive]}
                              onPress={() => onUpdateMember(index, { family_role: role, is_head_of_family: role === 'head', is_spouse: role === 'spouse' })}
                            >
                              <Text style={[styles.roleButtonText, member.family_role === role && styles.roleButtonTextActive]}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {editingMembers.length === 0 && (
                  <View style={styles.emptyMembersContainer}>
                    <Users size={48} color="#9CA3AF" />
                    <Text style={styles.emptyMembersText}>No family members yet</Text>
                    <Text style={styles.emptyMembersSubtext}>Add members to get started</Text>
                  </View>
                )}
              </View>
            </>
          )}

          <View style={styles.modalSection}>
            <TouchableOpacity style={styles.deleteFamilyButton} onPress={onDelete} disabled={isSaving} testID="delete-family-button">
              <Trash2 size={20} color="#EF4444" />
              <Text style={styles.deleteFamilyButtonText}>Delete Family</Text>
            </TouchableOpacity>
            <Text style={styles.deleteFamilyWarning}>
              Members with user accounts will be unassigned. Members without accounts will be permanently deleted.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Edit Person Modal ───
interface EditPersonModalProps {
  visible: boolean;
  onClose: () => void;
  editingPerson: EditingPerson | null;
  setEditingPerson: React.Dispatch<React.SetStateAction<EditingPerson | null>>;
  isSaving: boolean;
  familyImages: FamilyImages;
  isAdmin: boolean;
  onSave: () => void;
  onDelete: () => void;
  onUploadAvatar: (file: any) => Promise<string>;
}

export function EditPersonModal({
  visible, onClose, editingPerson, setEditingPerson,
  isSaving, familyImages, isAdmin, onSave, onDelete, onUploadAvatar,
}: EditPersonModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Person</Text>
          <TouchableOpacity
            style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
            onPress={onSave}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {editingPerson && (
            <>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Profile Photo</Text>
                <View style={styles.personAvatarContainer}>
                  <ImageUploader
                    currentImageUrl={familyImages.memberAvatars[editingPerson.id]}
                    onUpload={onUploadAvatar}
                    placeholder="Add Photo"
                    size={100}
                    isCircular={true}
                  />
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Personal Information</Text>
                <View style={styles.modalRow}>
                  <View style={styles.modalRowItem}>
                    <Text style={styles.modalLabel}>First Name</Text>
                    <TextInput style={styles.modalInput} value={editingPerson.first_name} onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, first_name: text } : null)} placeholder="First name" placeholderTextColor="#9CA3AF" />
                  </View>
                  <View style={styles.modalRowItem}>
                    <Text style={styles.modalLabel}>Last Name</Text>
                    <TextInput style={styles.modalInput} value={editingPerson.last_name} onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, last_name: text } : null)} placeholder="Last name" placeholderTextColor="#9CA3AF" />
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Contact Information</Text>
                <Text style={styles.modalLabel}>Email</Text>
                <TextInput style={styles.modalInput} value={editingPerson.email} onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, email: text } : null)} placeholder="Email address" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
                <Text style={styles.modalLabel}>Phone</Text>
                <TextInput style={styles.modalInput} value={editingPerson.phone} onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, phone: text } : null)} placeholder="Phone number" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Additional Information</Text>
                <Text style={styles.modalLabel}>Date of Birth</Text>
                <TextInput style={styles.modalInput} value={editingPerson.date_of_birth} onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, date_of_birth: text } : null)} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" />
                <Text style={styles.modalLabel}>Family Role</Text>
                <View style={styles.roleContainer}>
                  {(['head', 'spouse', 'child', 'other'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[styles.roleButton, editingPerson.family_role === role && styles.roleButtonActive]}
                      onPress={() => setEditingPerson(prev => prev ? { ...prev, family_role: role, is_head_of_family: role === 'head', is_spouse: role === 'spouse' } : null)}
                    >
                      <Text style={[styles.roleButtonText, editingPerson.family_role === role && styles.roleButtonTextActive]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {editingPerson.user_id && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Account Role</Text>
                  <Text style={styles.modalSectionDescription}>
                    This person has a user account. You can change their role here.
                  </Text>
                  <Text style={styles.modalLabel}>User Role</Text>
                  <View style={styles.userRoleContainer}>
                    {(['pending', 'visitor', 'member', 'leader', 'admin'] as const).map((role) => {
                      const isActive = editingPerson.user_role === role;
                      return (
                        <TouchableOpacity
                          key={role}
                          style={[styles.userRoleButton, isActive && styles.userRoleButtonActive]}
                          onPress={() => setEditingPerson(prev => prev ? { ...prev, user_role: role } : null)}
                        >
                          <Text style={[styles.userRoleButtonText, isActive && styles.userRoleButtonTextActive]}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.roleDescriptions}>
                    <Text style={styles.roleDescriptionTitle}>Role Permissions:</Text>
                    <Text style={styles.roleDescription}>{'• '}<Text style={styles.roleDescriptionBold}>Pending:</Text>{' Awaiting approval, limited access'}</Text>
                    <Text style={styles.roleDescription}>{'• '}<Text style={styles.roleDescriptionBold}>Visitor:</Text>{' New user, not yet linked to a person'}</Text>
                    <Text style={styles.roleDescription}>{'• '}<Text style={styles.roleDescriptionBold}>Member:</Text>{' Can view directory and manage own profile'}</Text>
                    <Text style={styles.roleDescription}>{'• '}<Text style={styles.roleDescriptionBold}>Leader:</Text>{' Can manage tags and view member details'}</Text>
                    <Text style={styles.roleDescription}>{'• '}<Text style={styles.roleDescriptionBold}>Admin:</Text>{' Full access to all features'}</Text>
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Delete Person</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Tag Management Modal ───
interface TagManageModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPersonForTags: string | null;
}

export function TagManageModal({ visible, onClose, selectedPersonForTags }: TagManageModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Manage Tags</Text>
          <View style={styles.modalPlaceholder} />
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {selectedPersonForTags && (
            <PersonTagPicker personId={selectedPersonForTags} testId="directory-tag-picker" />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Tag Filter Modal ───
interface TagFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTagIds: string[];
  matchAllTags: boolean;
  setMatchAllTags: (v: boolean) => void;
  onToggleTag: (tagId: string) => void;
  onClearFilters: () => void;
  availableTags: Tag[] | undefined;
  selectedUserRole: string | null;
  setSelectedUserRole: (role: any) => void;
  isAdmin: boolean;
  filteredDataCount: number;
}

export function TagFilterModal({
  visible, onClose, selectedTagIds, matchAllTags, setMatchAllTags,
  onToggleTag, onClearFilters, availableTags, selectedUserRole,
  setSelectedUserRole, isAdmin, filteredDataCount,
}: TagFilterModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filter by Tags</Text>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={onClearFilters} testID="clear-all-filters">
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Match Mode</Text>
            <Text style={styles.modalSectionDescription}>Choose how to match the selected tags</Text>
            <View style={styles.matchModeContainer}>
              <TouchableOpacity style={[styles.matchModeButton, !matchAllTags && styles.matchModeButtonActive]} onPress={() => setMatchAllTags(false)} testID="match-any">
                <Text style={[styles.matchModeButtonText, !matchAllTags && styles.matchModeButtonTextActive]}>ANY</Text>
                <Text style={styles.matchModeDescription}>Show people with at least one selected tag</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.matchModeButton, matchAllTags && styles.matchModeButtonActive]} onPress={() => setMatchAllTags(true)} testID="match-all">
                <Text style={[styles.matchModeButtonText, matchAllTags && styles.matchModeButtonTextActive]}>ALL</Text>
                <Text style={styles.matchModeDescription}>Show people with every selected tag</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Select Tags</Text>
            <Text style={styles.modalSectionDescription}>Choose which tags to filter by</Text>
            {availableTags && availableTags.length > 0 ? (
              <View style={styles.tagSelectionContainer}>
                {availableTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <TouchableOpacity key={tag.id} style={[styles.tagSelectionItem, isSelected && styles.tagSelectionItemActive]} onPress={() => onToggleTag(tag.id)} testID={`tag-filter-${tag.id}`}>
                      <View style={styles.tagSelectionContent}>
                        <View style={[styles.tagColorIndicator, { backgroundColor: tag.color || '#6B7280' }]} />
                        <Text style={[styles.tagSelectionText, isSelected && styles.tagSelectionTextActive]}>{tag.name}</Text>
                        {tag.namespace ? <Text style={styles.tagNamespace}>({tag.namespace})</Text> : null}
                      </View>
                      {isSelected && (
                        <View style={styles.tagSelectionCheck}>
                          <Text style={styles.tagSelectionCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyTagsContainer}>
                <Tags size={48} color="#9CA3AF" />
                <Text style={styles.emptyTagsText}>No tags available</Text>
                <Text style={styles.emptyTagsSubtext}>Create tags in the Admin section to enable filtering</Text>
              </View>
            )}
          </View>

          {isAdmin && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Filter by User Role</Text>
              <Text style={styles.modalSectionDescription}>Show only people with specific account roles</Text>
              <View style={styles.userRoleFilterContainer}>
                <TouchableOpacity style={[styles.userRoleFilterButton, !selectedUserRole && styles.userRoleFilterButtonActive]} onPress={() => setSelectedUserRole(null)} testID="role-filter-all">
                  <Text style={[styles.userRoleFilterButtonText, !selectedUserRole && styles.userRoleFilterButtonTextActive]}>All Users</Text>
                </TouchableOpacity>
                {(['pending', 'member', 'leader', 'admin'] as const).map((role) => {
                  const isActive = selectedUserRole === role;
                  return (
                    <TouchableOpacity key={role} style={[styles.userRoleFilterButton, isActive && styles.userRoleFilterButtonActive]} onPress={() => setSelectedUserRole(role)} testID={`role-filter-${role}`}>
                      <Text style={[styles.userRoleFilterButtonText, isActive && styles.userRoleFilterButtonTextActive]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {(selectedTagIds.length > 0 || selectedUserRole) && (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Filter Results</Text>
              <View style={styles.resultsPreview}>
                <Text style={styles.resultsText}>
                  {filteredDataCount} {filteredDataCount === 1 ? 'person' : 'people'} found
                </Text>
                <Text style={styles.resultsSubtext}>
                  {selectedTagIds.length > 0 && selectedUserRole
                    ? `Matching ${matchAllTags ? 'all' : 'any'} of ${selectedTagIds.length} selected tag${selectedTagIds.length !== 1 ? 's' : ''} with ${selectedUserRole} role`
                    : selectedTagIds.length > 0
                    ? `Matching ${matchAllTags ? 'all' : 'any'} of ${selectedTagIds.length} selected tag${selectedTagIds.length !== 1 ? 's' : ''}`
                    : `With ${selectedUserRole} role`}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
