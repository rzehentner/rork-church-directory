import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@/components/DateTimePicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@/hooks/user-context';
import { useAuth } from '@/hooks/auth-context';
import { useMe } from '@/hooks/me-context';
import { supabase } from '@/lib/supabase';

import { getPersonWithTags } from '@/services/tags';
import {
  MapPin,
  Phone,
  Copy,
  Edit2,
  Check,
  X,
  Mail,
  Calendar,
  Crown,
  Heart,
  LogOut,
  AlertCircle,
  Plus,
  Link2,
  User,
  ArrowRight,
  Users,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import HeaderBackButton from '@/components/HeaderBackButton';
import ImageUploader from '@/components/ImageUploader';
import PersonTagPicker from '@/components/PersonTagPicker';
import TagPill from '@/components/TagPill';
import { uploadPersonAvatar, uploadFamilyPhoto, getSignedUrl } from '@/lib/storage';
import { styles } from '@/styles/family.styles';

export default function FamilyScreen() {
  const { profile, person, family, familyMembers, updateFamily, createFamily, joinFamily, isLoading, refetch } = useUser();
  const { signOut } = useAuth();
  const { myPersonId } = useMe();
  const [isEditingFamily, setIsEditingFamily] = useState(false);

  const [showFamilyOptions, setShowFamilyOptions] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [joinToken, setJoinToken] = useState('');
  
  const [editFamilyForm, setEditFamilyForm] = useState({
    address_street: family?.address_street || '',
    address_city: family?.address_city || '',
    address_state: family?.address_state || '',
    address_zip: family?.address_zip || '',
    home_phone: family?.home_phone || '',
  });
  

  
  const [newMemberForm, setNewMemberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    is_head_of_family: false,
    is_spouse: false,
    family_role: 'other' as 'head' | 'spouse' | 'child' | 'other',
  });
  
  const [editMemberForm, setEditMemberForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    is_head_of_family: false,
    is_spouse: false,
    family_role: 'other' as 'head' | 'spouse' | 'child' | 'other',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'edit' | 'new'>('edit');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState<string | null>(null);
  const [memberAvatars, setMemberAvatars] = useState<Record<string, string | null>>({});
  const [memberTags, setMemberTags] = useState<Record<string, any[]>>({});
  const [selectedMemberForTags, setSelectedMemberForTags] = useState<string | null>(null);
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);
  
  const isPending = profile?.role === 'pending';
  const hasFamily = !!family;

  useEffect(() => {
    const loadImages = async () => {
      try {
        const ts = Date.now();
        if (family?.photo_path) {
          const url = await getSignedUrl(family.photo_path);
          setFamilyPhotoUrl(url ? `${url}&t=${ts}` : null);
        } else {
          setFamilyPhotoUrl(null);
        }

        if (familyMembers && familyMembers.length > 0) {
          const avatarResults = await Promise.all(
            familyMembers.map(async (m) => ({
              id: m.id,
              url: m.photo_path ? await getSignedUrl(m.photo_path).then(u => u ? `${u}&t=${ts}` : null).catch(() => null) : null,
            }))
          );
          setMemberAvatars(avatarResults.reduce((acc, { id, url }) => { acc[id] = url; return acc; }, {} as Record<string, string | null>));

          const tagResults = await Promise.all(
            familyMembers.map(async (m) => {
              try { return { id: m.id, tags: (await getPersonWithTags(m.id)).tags }; }
              catch { return { id: m.id, tags: [] as any[] }; }
            })
          );
          setMemberTags(tagResults.reduce((acc, { id, tags }) => { acc[id] = tags; return acc; }, {} as Record<string, any[]>));
        }
      } catch {
      }
    };
    if (family || familyMembers.length > 0) loadImages();
  }, [family, familyMembers]);

  // Refresh member tags when PersonTagPicker changes
  const refreshMemberTags = async (memberId: string) => {
    try {
      const personWithTags = await getPersonWithTags(memberId);
      setMemberTags(prev => ({
        ...prev,
        [memberId]: personWithTags.tags
      }));
    } catch {
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }



  const handleSaveFamily = async () => {
    const { error } = await updateFamily(editFamilyForm);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsEditingFamily(false);
    }
  };


  const handleUploadFamilyPhoto = async (file: any) => {
    if (!family) throw new Error('No family found');
    const url = await uploadFamilyPhoto(family.id, file, family.photo_path);
    setFamilyPhotoUrl(url);
    await refetch();
    return url;
  };

  const handleUploadPersonAvatar = async (personId: string, file: any) => {
    const url = await uploadPersonAvatar(personId, file);
    setMemberAvatars(prev => ({ ...prev, [personId]: url }));
    await refetch();
    return url;
  };
  
  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return;
    }

    const { error } = await createFamily({
      p_family_name: familyName,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Family created successfully!');
      setShowFamilyOptions(false);
      setFamilyName('');
    }
  };

  const handleJoinFamily = async () => {
    if (!joinToken.trim()) {
      Alert.alert('Error', 'Please enter a join token');
      return;
    }

    const { error } = await joinFamily(joinToken);

    if (error) {
      Alert.alert('Error', 'Invalid or expired token');
    } else {
      Alert.alert('Success', 'Joined family successfully!');
      setShowFamilyOptions(false);
      setJoinToken('');
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login' as any);
          }
        },
      ]
    );
  };

  const copyJoinToken = async () => {
    if (family?.family_join_token) {
      await Clipboard.setStringAsync(family.family_join_token);
      Alert.alert('Copied!', 'Family join token copied to clipboard');
    }
  };

  const handleAddMember = async () => {
    if (!newMemberForm.first_name.trim() || !newMemberForm.last_name.trim()) {
      Alert.alert('Error', 'Please enter first and last name');
      return;
    }

    if (!family) {
      Alert.alert('Error', 'No family found');
      return;
    }

    try {
      const { error } = await supabase
        .from('persons')
        .insert({
          first_name: newMemberForm.first_name,
          last_name: newMemberForm.last_name,
          email: newMemberForm.email || null,
          phone: newMemberForm.phone || null,
          date_of_birth: newMemberForm.date_of_birth || null,
          is_head_of_family: newMemberForm.family_role === 'head',
          is_spouse: newMemberForm.family_role === 'spouse',
          family_role: newMemberForm.family_role,
          family_id: family.id,
          user_id: null, // This person is not associated with a user account
        });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Family member added successfully!');
        setShowAddMember(false);
        setNewMemberForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          is_head_of_family: false,
          is_spouse: false,
          family_role: 'other',
        });
        // Refetch family data to show the new member
        await refetch();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to add family member');
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setEditMemberForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
      date_of_birth: member.date_of_birth || '',
      is_head_of_family: member.is_head_of_family || false,
      is_spouse: member.is_spouse || false,
      family_role: member.family_role || (member.is_head_of_family ? 'head' : member.is_spouse ? 'spouse' : 'other'),
    });
  };

  const handleSaveMember = async () => {
    if (!editMemberForm.first_name.trim() || !editMemberForm.last_name.trim()) {
      Alert.alert('Error', 'Please enter first and last name');
      return;
    }

    if (!editingMemberId) {
      Alert.alert('Error', 'No member selected for editing');
      return;
    }

    try {
      const { error } = await supabase
        .from('persons')
        .update({
          first_name: editMemberForm.first_name,
          last_name: editMemberForm.last_name,
          email: editMemberForm.email || null,
          phone: editMemberForm.phone || null,
          date_of_birth: editMemberForm.date_of_birth || null,
          is_head_of_family: editMemberForm.family_role === 'head',
          is_spouse: editMemberForm.family_role === 'spouse',
          family_role: editMemberForm.family_role,
        })
        .eq('id', editingMemberId);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Family member updated successfully!');
        setEditingMemberId(null);
        setEditMemberForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          is_head_of_family: false,
          is_spouse: false,
          family_role: 'other',
        });
        // Refetch family data to show the updated member
        await refetch();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update family member');
    }
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditMemberForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      is_head_of_family: false,
      is_spouse: false,
      family_role: 'other',
    });
  };

  const formatAddress = () => {
    if (!family) return 'No address set';
    const parts = [
      family.address_street,
      family.address_city,
      family.address_state,
      family.address_zip,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address set';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <HeaderBackButton />
            <Users size={28} color="#7C3AED" />
            <Text style={styles.title}>My Family</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
            <LogOut size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        
        {isPending && (
          <View style={styles.pendingBanner}>
            <AlertCircle size={20} color="#F59E0B" />
            <Text style={styles.pendingText}>
              Your account is pending approval
            </Text>
          </View>
        )}

        {/* Profile Completion Prompt for Visitors */}
        {isPending && (!person || !person.first_name || !person.last_name) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Complete Your Profile</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.profilePrompt}>
                <User size={24} color="#7C3AED" />
                <Text style={styles.profilePromptText}>
                  Help your church family get to know you better by completing your profile.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/visitor-profile' as any)}
              >
                <Text style={styles.profileButtonText}>Complete Profile</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Family Section or Create/Join Options */}
        {!hasFamily && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Family</Text>
            </View>
            <View style={styles.cardContent}>
              {isPending && (
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingInfoText}>
                    You can create or join a family while your account is pending approval.
                  </Text>
                </View>
              )}
              {!showFamilyOptions ? (
                <View style={styles.familyOptions}>
                  <TouchableOpacity
                    style={styles.familyButton}
                    onPress={() => setShowFamilyOptions(true)}
                  >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.familyButtonText}>Create Family</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.familyButton, styles.secondaryButton]}
                    onPress={() => router.push('/join-family' as any)}
                  >
                    <Link2 size={20} color="#7C3AED" />
                    <Text style={[styles.familyButtonText, styles.secondaryButtonText]}>
                      Join Family
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.familyForm}>
                  <Text style={styles.formTitle}>Create or Join a Family</Text>
                  
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Create New Family</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Last Name (e.g. Zehentner)"
                      value={familyName}
                      onChangeText={setFamilyName}
                    />
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleCreateFamily}
                    >
                      <Text style={styles.submitButtonText}>Create Family</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>Join Existing Family</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter Join Token"
                      value={joinToken}
                      onChangeText={setJoinToken}
                    />
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleJoinFamily}
                    >
                      <Text style={styles.submitButtonText}>Join Family</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowFamilyOptions(false);
                      setFamilyName('');
                      setJoinToken('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Family Information Section - Only show if family exists */}
        {hasFamily && (
          <>
            {/* Family Photo Section */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Family Photo</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.familyPhotoContainer}>
                  <ImageUploader
                    currentImageUrl={familyPhotoUrl}
                    onUpload={handleUploadFamilyPhoto}
                    placeholder="Add Family Photo"
                    size={280}
                    isCircular={false}
                    aspectRatio={{ width: 4, height: 3 }}
                  />
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{family.family_name}</Text>
                {!isEditingFamily && (
                  <TouchableOpacity onPress={() => setIsEditingFamily(true)}>
                    <Edit2 size={20} color="#7C3AED" />
                  </TouchableOpacity>
                )}
                {isEditingFamily && (
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={handleSaveFamily} style={styles.iconButton}>
                      <Check size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditingFamily(false);
                        setEditFamilyForm({
                          address_street: family?.address_street || '',
                          address_city: family?.address_city || '',
                          address_state: family?.address_state || '',
                          address_zip: family?.address_zip || '',
                          home_phone: family?.home_phone || '',
                        });
                      }}
                      style={styles.iconButton}
                    >
                      <X size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.cardContent}>
                <View style={styles.field}>
                  <MapPin size={16} color="#9CA3AF" />
                  {isEditingFamily ? (
                    <View style={styles.editFieldContainer}>
                      <TextInput
                        style={styles.editInput}
                        value={editFamilyForm.address_street}
                        onChangeText={(text) => setEditFamilyForm({ ...editFamilyForm, address_street: text })}
                        placeholder="Street Address"
                      />
                      <TextInput
                        style={styles.editInput}
                        value={editFamilyForm.address_city}
                        onChangeText={(text) => setEditFamilyForm({ ...editFamilyForm, address_city: text })}
                        placeholder="City"
                      />
                      <View style={styles.stateZipRow}>
                        <TextInput
                          style={[styles.editInput, styles.stateInput]}
                          value={editFamilyForm.address_state}
                          onChangeText={(text) => setEditFamilyForm({ ...editFamilyForm, address_state: text })}
                          placeholder="State"
                        />
                        <TextInput
                          style={[styles.editInput, styles.zipInput]}
                          value={editFamilyForm.address_zip}
                          onChangeText={(text) => setEditFamilyForm({ ...editFamilyForm, address_zip: text })}
                          placeholder="ZIP"
                        />
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.fieldValue}>{formatAddress()}</Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Phone size={16} color="#9CA3AF" />
                  {isEditingFamily ? (
                    <TextInput
                      style={styles.editInput}
                      value={editFamilyForm.home_phone}
                      onChangeText={(text) => setEditFamilyForm({ ...editFamilyForm, home_phone: text })}
                      placeholder="Home Phone"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text style={styles.fieldValue}>{family.home_phone || 'No phone set'}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Join Token</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.tokenContainer}>
                  <Text style={styles.tokenText}>{family.family_join_token}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={copyJoinToken}>
                    <Copy size={16} color="#FFFFFF" />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.tokenHelp}>
                  Share this token with family members to let them join
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Family Members</Text>
                <TouchableOpacity 
                  onPress={() => setShowAddMember(true)}
                  style={styles.addButton}
                >
                  <Plus size={20} color="#7C3AED" />
                </TouchableOpacity>
              </View>
              <View style={styles.cardContent}>
                {familyMembers.map((member) => (
                  <View key={member.id} style={styles.memberItem}>
                    {editingMemberId === member.id ? (
                      <View style={styles.editMemberForm}>
                        <View style={styles.formHeader}>
                          <Text style={styles.formTitle}>Edit Family Member</Text>
                          <TouchableOpacity 
                            onPress={handleCancelEdit}
                            style={styles.closeButton}
                          >
                            <X size={20} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.formRow}>
                          <TextInput
                            style={[styles.formInput, styles.halfInput]}
                            placeholder="First Name"
                            value={editMemberForm.first_name}
                            onChangeText={(text) => setEditMemberForm({ ...editMemberForm, first_name: text })}
                          />
                          <TextInput
                            style={[styles.formInput, styles.halfInput]}
                            placeholder="Last Name"
                            value={editMemberForm.last_name}
                            onChangeText={(text) => setEditMemberForm({ ...editMemberForm, last_name: text })}
                          />
                        </View>
                        
                        <TextInput
                          style={styles.formInput}
                          placeholder="Email (optional)"
                          value={editMemberForm.email}
                          onChangeText={(text) => setEditMemberForm({ ...editMemberForm, email: text })}
                          keyboardType="email-address"
                        />
                        
                        <TextInput
                          style={styles.formInput}
                          placeholder="Phone (optional)"
                          value={editMemberForm.phone}
                          onChangeText={(text) => setEditMemberForm({ ...editMemberForm, phone: text })}
                          keyboardType="phone-pad"
                        />
                        
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            setDatePickerMode('edit');
                            setSelectedDate(editMemberForm.date_of_birth ? new Date(editMemberForm.date_of_birth) : new Date());
                            setShowDatePicker(true);
                          }}
                        >
                          <Text style={[styles.datePickerText, !editMemberForm.date_of_birth && styles.placeholderText]}>
                            {editMemberForm.date_of_birth ? new Date(editMemberForm.date_of_birth).toLocaleDateString() : 'Date of Birth (optional)'}
                          </Text>
                          <Calendar size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                        
                        <View style={styles.checkboxContainer}>
                          {(['head', 'spouse', 'child', 'other'] as const).map((role) => (
                            <TouchableOpacity 
                              key={role}
                              style={styles.checkbox}
                              onPress={() => {

                                setEditMemberForm(prev => ({ 
                                  ...prev, 
                                  family_role: role,
                                  is_head_of_family: role === 'head',
                                  is_spouse: role === 'spouse',
                                }));
                              }}
                              testID={`edit-role-${role}`}
                            >
                              <View style={[styles.checkboxInner, editMemberForm.family_role === role && styles.checkboxChecked]}>
                                {editMemberForm.family_role === role && <Check size={16} color="#FFFFFF" />}
                              </View>
                              <Text style={styles.checkboxLabel}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        
                        <View style={styles.formActions}>
                          <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSaveMember}
                          >
                            <Text style={styles.submitButtonText}>Save Changes</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.memberRow}>
                        <View style={styles.memberAvatarContainer}>
                          <ImageUploader
                            currentImageUrl={memberAvatars[member.id]}
                            onUpload={(file) => handleUploadPersonAvatar(member.id, file)}
                            placeholder=""
                            size={48}
                            isCircular={true}
                          />
                        </View>
                        <View style={styles.memberInfo}>
                          <View style={styles.memberNameRow}>
                            <Text style={styles.memberName}>
                              {member.first_name} {member.last_name}
                            </Text>
                            {member.id === person?.id && (
                              <View style={styles.meBadge}>
                                <Text style={styles.meText}>Me</Text>
                              </View>
                            )}
                            {member.family_role === 'head' && (
                              <Crown size={16} color="#F59E0B" />
                            )}
                            {member.family_role === 'spouse' && (
                              <Heart size={16} color="#EC4899" />
                            )}
                            {!member.user_id && (
                              <View style={styles.noAccountBadge}>
                                <Text style={styles.noAccountText}>No Account</Text>
                              </View>
                            )}
                          </View>
                          {member.email && (
                            <View style={styles.memberDetail}>
                              <Mail size={12} color="#9CA3AF" />
                              <Text style={styles.memberDetailText}>{member.email}</Text>
                            </View>
                          )}
                          {member.phone && (
                            <View style={styles.memberDetail}>
                              <Phone size={12} color="#9CA3AF" />
                              <Text style={styles.memberDetailText}>{member.phone}</Text>
                            </View>
                          )}
                          {member.date_of_birth && (
                            <View style={styles.memberDetail}>
                              <Calendar size={12} color="#9CA3AF" />
                              <Text style={styles.memberDetailText}>
                                {new Date(member.date_of_birth).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                          
                          {/* Member Tags */}
                          {memberTags[member.id] && memberTags[member.id].length > 0 && (
                            <View style={styles.memberTags}>
                              {memberTags[member.id].map((tag) => (
                                <TagPill
                                  key={tag.id}
                                  tag={tag}
                                  size="small"
                                  testId={`member-tag-${member.id}-${tag.id}`}
                                />
                              ))}
                            </View>
                          )}
                          
                          {/* Tag management button - available for all family members */}
                          <TouchableOpacity
                            style={styles.manageTagsButton}
                            onPress={() => {
                              setSelectedMemberForTags(member.id);
                              setIsTagModalVisible(true);
                            }}
                          >
                            <Text style={styles.manageTagsText}>
                              {member.id === myPersonId ? 'Manage My Tags' : `Manage ${member.first_name}'s Tags`}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleEditMember(member)}
                          style={styles.editMemberButton}
                        >
                          <Edit2 size={16} color="#7C3AED" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
                
                {showAddMember && (
                  <View style={styles.addMemberForm}>
                    <View style={styles.formHeader}>
                      <Text style={styles.formTitle}>Add Family Member</Text>
                      <TouchableOpacity 
                        onPress={() => setShowAddMember(false)}
                        style={styles.closeButton}
                      >
                        <X size={20} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.formInput, styles.halfInput]}
                        placeholder="First Name"
                        value={newMemberForm.first_name}
                        onChangeText={(text) => setNewMemberForm({ ...newMemberForm, first_name: text })}
                      />
                      <TextInput
                        style={[styles.formInput, styles.halfInput]}
                        placeholder="Last Name"
                        value={newMemberForm.last_name}
                        onChangeText={(text) => setNewMemberForm({ ...newMemberForm, last_name: text })}
                      />
                    </View>
                    
                    <TextInput
                      style={styles.formInput}
                      placeholder="Email (optional)"
                      value={newMemberForm.email}
                      onChangeText={(text) => setNewMemberForm({ ...newMemberForm, email: text })}
                      keyboardType="email-address"
                    />
                    
                    <TextInput
                      style={styles.formInput}
                      placeholder="Phone (optional)"
                      value={newMemberForm.phone}
                      onChangeText={(text) => setNewMemberForm({ ...newMemberForm, phone: text })}
                      keyboardType="phone-pad"
                    />
                    
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => {
                        setDatePickerMode('new');
                        setSelectedDate(newMemberForm.date_of_birth ? new Date(newMemberForm.date_of_birth) : new Date());
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={[styles.datePickerText, !newMemberForm.date_of_birth && styles.placeholderText]}>
                        {newMemberForm.date_of_birth ? new Date(newMemberForm.date_of_birth).toLocaleDateString() : 'Date of Birth (optional)'}
                      </Text>
                      <Calendar size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                    
                    <View style={styles.checkboxContainer}>
                      {(['head', 'spouse', 'child', 'other'] as const).map((role) => (
                        <TouchableOpacity 
                          key={role}
                          style={styles.checkbox}
                          onPress={() => {

                            setNewMemberForm(prev => ({ 
                              ...prev, 
                              family_role: role,
                              is_head_of_family: role === 'head',
                              is_spouse: role === 'spouse',
                            }));
                          }}
                          testID={`new-role-${role}`}
                        >
                          <View style={[styles.checkboxInner, newMemberForm.family_role === role && styles.checkboxChecked]}>
                            {newMemberForm.family_role === role && <Check size={16} color="#FFFFFF" />}
                          </View>
                          <Text style={styles.checkboxLabel}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleAddMember}
                      >
                        <Text style={styles.submitButtonText}>Add Member</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Tag Management Modal */}
      <Modal
        visible={isTagModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsTagModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsTagModalVisible(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedMemberForTags === myPersonId 
                ? 'Manage My Tags' 
                : `Manage ${familyMembers.find(m => m.id === selectedMemberForTags)?.first_name}'s Tags`
              }
            </Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedMemberForTags && (
              <PersonTagPicker
                personId={selectedMemberForTags}
                testId="family-tag-picker"
                onTagsChanged={() => refreshMemberTags(selectedMemberForTags)}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    const dateString = selectedDate.toISOString().split('T')[0];
                    if (datePickerMode === 'edit') {
                      setEditMemberForm({ ...editMemberForm, date_of_birth: dateString });
                    } else if (datePickerMode === 'new') {
                      setNewMemberForm({ ...newMemberForm, date_of_birth: dateString });
                    }
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (date) {
                      setSelectedDate(date);
                    }
                    if (Platform.OS !== 'ios') {
                      setShowDatePicker(false);
                      if (date) {
                        const dateString = date.toISOString().split('T')[0];
                        if (datePickerMode === 'edit') {
                          setEditMemberForm({ ...editMemberForm, date_of_birth: dateString });
                        } else if (datePickerMode === 'new') {
                          setNewMemberForm({ ...newMemberForm, date_of_birth: dateString });
                        }
                      }
                    }
                  }}
                  maximumDate={new Date()}
                  textColor="#1F2937"
                  style={styles.datePickerStyle}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
