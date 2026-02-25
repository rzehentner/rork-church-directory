import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Search, Users, User, Mail, Phone, MapPin, AlertCircle, Edit3, X, Home, List, Tags, Filter, BookOpen, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useUser } from '@/hooks/user-context';
import { getSignedUrl, uploadFamilyPhoto, uploadPersonAvatar } from '@/lib/storage';
import ImageUploader from '@/components/ImageUploader';
import TagPill from '@/components/TagPill';
import { EditFamilyModal, EditPersonModal, TagManageModal, TagFilterModal } from '@/components/DirectoryModals';
import { useMe } from '@/hooks/me-context';
import { listTags, findPeopleByTags, getPersonWithTags, type Tag } from '@/services/tags';
import { adminListUsers, type AdminUserListItem } from '@/lib/admin-users';
import { isValidUUID } from '@/utils/validation';
import { styles } from '@/styles/directory.styles';

type FamilyRole = 'head' | 'spouse' | 'child' | 'other';

interface DirectoryEntry {
  family_id: string | null;
  family_name_display: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  home_phone: string | null;
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_head_of_family: boolean;
  is_spouse: boolean;
  family_role: FamilyRole;
  photo_path: string | null;
  family_photo_path: string | null;
  user_id?: string | null;
  user_role?: string | null;
}

interface FamilyImages {
  familyPhotos: Record<string, string | null>;
  memberAvatars: Record<string, string | null>;
}

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
  photo_path: string | null;
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
  photo_path: string | null;
  family_id: string | null;
  user_id: string | null;
  user_role: 'pending' | 'visitor' | 'member' | 'leader' | 'admin' | null;
}

export default function DirectoryScreen() {
  const { profile } = useUser();
  const { myRole } = useMe();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'family' | 'person'>('person');
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [familyImages, setFamilyImages] = useState<FamilyImages>({
    familyPhotos: {},
    memberAvatars: {},
  });
  const [editingFamily, setEditingFamily] = useState<EditingFamily | null>(null);
  const [editingMembers, setEditingMembers] = useState<EditingMember[]>([]);
  const [editingPerson, setEditingPerson] = useState<EditingPerson | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isEditPersonModalVisible, setIsEditPersonModalVisible] = useState(false);
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);
  const [selectedPersonForTags, setSelectedPersonForTags] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'family' | 'members'>('family');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [matchAllTags, setMatchAllTags] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filteredPersonIds, setFilteredPersonIds] = useState<string[]>([]);
  const [selectedUserRole, setSelectedUserRole] = useState<'pending' | 'visitor' | 'member' | 'leader' | 'admin' | null>(null);
  const [adminUsersList, setAdminUsersList] = useState<AdminUserListItem[]>([]);
  const [personTags, setPersonTags] = useState<Record<string, Tag[]>>({});

  const isAdmin = profile?.role === 'admin';
  const isStaff = myRole === 'leader' || myRole === 'admin';

  const getRoleBadge = (entry: DirectoryEntry & { user_role?: string | null }) => {
    if (!isStaff) return null;
    if (!entry.user_id) {
      return { label: 'No Account', bg: '#F3F4F6', color: '#6B7280' };
    }
    switch (entry.user_role) {
      case 'admin': return { label: 'Admin', bg: '#FEE2E2', color: '#DC2626' };
      case 'leader': return { label: 'Leader', bg: '#EDE9FE', color: '#7C3AED' };
      case 'member': return { label: 'Member', bg: '#DCFCE7', color: '#16A34A' };
      case 'pending': return { label: 'Pending', bg: '#FEF3C7', color: '#D97706' };
      case 'visitor': return { label: 'Visitor', bg: '#DBEAFE', color: '#2563EB' };
      default: return { label: 'No Role', bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  // Load available tags for filtering
  const { data: availableTags } = useQuery({
    queryKey: ['tags', 'active'],
    queryFn: () => listTags(true), // Only active tags for filtering
    enabled: isStaff,
  });

  const { data: adminUsersData } = useQuery({
    queryKey: ['admin-users', selectedUserRole, isAdmin],
    queryFn: async () => {
      if (!isAdmin) return [];
      try {
        const roles = selectedUserRole ? [selectedUserRole] : null;
        return await adminListUsers(roles);
      } catch {
        return [];
      }
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (adminUsersData) setAdminUsersList(adminUsersData);
  }, [adminUsersData]);

  const { data: directoryData, isLoading, error } = useQuery({
    queryKey: ['directory', isAdmin],
    queryFn: async () => {
      try {
        let { data: viewData, error: viewError } = await supabase
          .from('family_directory_display')
          .select('*')
          .order('family_name_display', { ascending: true });

        if (viewError) {
          const baseFields = 'id,first_name,last_name,email,phone,photo_path,is_head_of_family,is_spouse,family_id,user_id,families!inner(id,name,photo_path,address_street,address_city,address_state,address_zip,home_phone)';
          const selectFields = isAdmin ? baseFields + ',profiles(id,role)' : baseFields;

          const { data: personsData, error: personsError } = await supabase
            .from('persons')
            .select(selectFields)
            .order('families.name', { ascending: true });

          if (personsError) throw personsError;

          viewData = personsData?.filter((p: any) =>
            isValidUUID(p.id) &&
            (!p.family_id || isValidUUID(p.family_id)) &&
            (!p.families || isValidUUID(p.families?.id))
          ).map((p: any) => ({
            person_id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            phone: p.phone,
            photo_path: p.photo_path,
            is_head_of_family: p.is_head_of_family,
            is_spouse: p.is_spouse,
            family_role: p.family_role || (p.is_head_of_family ? 'head' : p.is_spouse ? 'spouse' : 'other'),
            family_id: p.family_id,
            user_id: p.user_id,
            user_role: isAdmin && p.profiles ? p.profiles.role : null,
            family_name_display: p.families?.name,
            address_street: p.families?.address_street,
            address_city: p.families?.address_city,
            address_state: p.families?.address_state,
            address_zip: p.families?.address_zip,
            home_phone: p.families?.home_phone,
            family_photo_path: p.families?.photo_path,
          })) || [];
        } else {
          const familyIds = [...new Set(viewData?.map(e => e.family_id).filter(Boolean))];
          if (familyIds.length > 0) {
            const { data: familyPhotos } = await supabase.from('families').select('id, photo_path').in('id', familyIds);
            const photoMap = new Map(familyPhotos?.map(f => [f.id, f.photo_path]) || []);
            viewData = viewData?.map((e: any) => ({ ...e, family_photo_path: e.family_id ? photoMap.get(e.family_id) : null })) || [];
          }
          if (isAdmin && viewData) {
            const personIds = viewData.map(e => e.person_id).filter(Boolean);
            if (personIds.length > 0) {
              const { data: userRoles } = await supabase.from('persons').select('id,user_id,profiles(id,role)').in('id', personIds).not('user_id', 'is', null);
              const roleMap = new Map(userRoles?.map(ur => [ur.id, (ur.profiles as any)?.role]) || []);
              viewData = viewData.map((e: any) => ({ ...e, user_role: roleMap.get(e.person_id) || null }));
            }
          }
        }
        return viewData as (DirectoryEntry & { user_role?: string | null })[];
      } catch (err) {
        throw err;
      }
    },
    enabled: profile?.role !== 'pending',
  });

  useEffect(() => {
    if (selectedTagIds.length === 0) { setFilteredPersonIds([]); return; }
    findPeopleByTags(selectedTagIds, matchAllTags)
      .then(ids => setFilteredPersonIds(ids || []))
      .catch(() => setFilteredPersonIds([]));
  }, [selectedTagIds, matchAllTags, availableTags]);

  useEffect(() => {
    if (!directoryData) return;
    const loadImages = async () => {
      try {
        const uniqueFamilies = new Set<string>();
        const uniqueMembers = new Set<string>();
        const familyProms: Promise<{ id: string; url: string | null }>[] = [];
        const memberProms: Promise<{ id: string; url: string | null }>[] = [];
        const ts = Date.now();

        directoryData.forEach((entry) => {
          if (entry.family_id && !uniqueFamilies.has(entry.family_id) && entry.family_photo_path) {
            uniqueFamilies.add(entry.family_id);
            const fid = entry.family_id;
            familyProms.push(
              getSignedUrl(entry.family_photo_path)
                .then(url => ({ id: fid, url: url ? `${url}&t=${ts}` : null }))
                .catch(() => ({ id: fid, url: null }))
            );
          }
          if (entry.person_id && !uniqueMembers.has(entry.person_id) && entry.photo_path) {
            uniqueMembers.add(entry.person_id);
            const pid = entry.person_id;
            memberProms.push(
              getSignedUrl(entry.photo_path)
                .then(url => ({ id: pid, url: url ? `${url}&t=${ts}` : null }))
                .catch(() => ({ id: pid, url: null }))
            );
          }
        });

        const [familyResults, memberResults] = await Promise.all([Promise.all(familyProms), Promise.all(memberProms)]);
        const newFamilyPhotos: Record<string, string | null> = {};
        const newMemberAvatars: Record<string, string | null> = {};
        familyResults.forEach(({ id, url }) => { newFamilyPhotos[id] = url; });
        memberResults.forEach(({ id, url }) => { newMemberAvatars[id] = url; });
        setFamilyImages({ familyPhotos: newFamilyPhotos, memberAvatars: newMemberAvatars });
      } catch {
      }
    };
    loadImages();
  }, [directoryData]);

  const filteredData = useMemo(() => {
    if (!directoryData) return [];
    const searchLower = searchQuery.toLowerCase();
    return directoryData.filter((entry) => {
      if (!entry?.person_id) return false;
      if (selectedTagIds.length > 0 && !filteredPersonIds.includes(entry.person_id)) return false;
      if (selectedUserRole && isAdmin && !adminUsersList.some(u => u.person_id === entry.person_id)) return false;
      return (
        (entry.first_name?.toLowerCase() || '').includes(searchLower) ||
        (entry.last_name?.toLowerCase() || '').includes(searchLower) ||
        (entry.email?.toLowerCase() || '').includes(searchLower) ||
        (entry.family_name_display?.toLowerCase() || '').includes(searchLower)
      );
    });
  }, [directoryData, searchQuery, selectedTagIds, filteredPersonIds, selectedUserRole, isAdmin, adminUsersList]);

  useEffect(() => {
    if (!filteredData || filteredData.length === 0) { setPersonTags({}); return; }
    const loadPersonTags = async () => {
      try {
        const validPeople = filteredData.filter(p => isValidUUID(p?.person_id));
        if (validPeople.length === 0) { setPersonTags({}); return; }
        const batchSize = 10;
        const result: Record<string, Tag[]> = {};
        for (let i = 0; i < validPeople.length; i += batchSize) {
          const batch = validPeople.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (p) => {
              try {
                const d = await getPersonWithTags(p.person_id);
                return { id: p.person_id, tags: d.tags || [] };
              } catch { return { id: p.person_id, tags: [] as Tag[] }; }
            })
          );
          batchResults.forEach(({ id, tags }) => { if (isValidUUID(id)) result[id] = tags; });
        }
        setPersonTags(result);
      } catch { setPersonTags({}); }
    };
    loadPersonTags();
  }, [filteredData]);

  const groupedFamilies = useMemo(() => {
    if (viewMode !== 'family') return {};

    const grouped: Record<string, DirectoryEntry[]> = {};
    filteredData.forEach((entry) => {
      const key = entry.family_id || '[Unassigned]';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(entry);
    });

    // Sort members within each family
    Object.keys(grouped).forEach((key) => {
      const roleOrder: Record<FamilyRole, number> = { head: 0, spouse: 1, child: 2, other: 3 };
      grouped[key].sort((a, b) => {
        const aOrder = roleOrder[a.family_role] ?? 3;
        const bOrder = roleOrder[b.family_role] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.first_name || '').localeCompare(b.first_name || '');
      });
    });

    return grouped;
  }, [filteredData, viewMode]);

  const sortedPersons = useMemo(() => {
    if (viewMode !== 'person') return [];

    return [...filteredData].sort((a, b) => {
      const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.first_name || '').localeCompare(b.first_name || '');
    });
  }, [filteredData, viewMode]);

  const toggleFamily = (familyId: string) => {
    const newExpanded = new Set(expandedFamilies);
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId);
    } else {
      newExpanded.add(familyId);
    }
    setExpandedFamilies(newExpanded);
  };

  const handleEditFamily = async (familyInfo: DirectoryEntry) => {
    if (!isAdmin || !familyInfo.family_id) return;

    setEditingFamily({
      id: familyInfo.family_id,
      name: familyInfo.family_name_display || '',
      address_street: familyInfo.address_street || '',
      address_city: familyInfo.address_city || '',
      address_state: familyInfo.address_state || '',
      address_zip: familyInfo.address_zip || '',
      home_phone: familyInfo.home_phone || '',
      photo_path: familyInfo.family_photo_path,
    });

    // Load family members
    try {
      const { data: members, error } = await supabase
        .from('persons')
        .select('*')
        .eq('family_id', familyInfo.family_id)
        .order('family_role', { ascending: true })
        .order('first_name');

      if (error) throw error;

      setEditingMembers(members?.map(member => ({
        id: member.id,
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        date_of_birth: member.date_of_birth || '',
        is_head_of_family: member.is_head_of_family || false,
        is_spouse: member.is_spouse || false,
        family_role: member.family_role || (member.is_head_of_family ? 'head' as const : member.is_spouse ? 'spouse' as const : 'other' as const),
        photo_path: member.photo_path,
        isNew: false,
      })) || []);
    } catch {
      setEditingMembers([]);
    }

    setActiveTab('family');
    setIsEditModalVisible(true);
  };

  const handleDeleteFamily = () => {
    if (!editingFamily || !isAdmin) return;

    Alert.alert(
      'Delete Family',
      `Are you sure you want to delete the "${editingFamily.name}" family and all its members without user accounts? Members with user accounts will be unassigned from this family. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              const { error: rpcError } = await supabase.rpc('admin_delete_family', { p_family_id: editingFamily.id });
              if (rpcError) throw rpcError;
              const { data: checkFamily } = await supabase.from('families').select('id').eq('id', editingFamily.id).maybeSingle();
              if (checkFamily) {
                Alert.alert('Delete Failed', 'The family could not be deleted.');
                return;
              }
              queryClient.invalidateQueries({ queryKey: ['directory'] });
              setIsEditModalVisible(false);
              setEditingFamily(null);
              setEditingMembers([]);
              Alert.alert('Success', 'Family deleted successfully.');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to delete family.';
              Alert.alert('Error', message);
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveFamily = async () => {
    if (!editingFamily) return;

    setIsSaving(true);
    try {
      // Update family information
      const { error: familyError } = await supabase
        .from('families')
        .update({
          name: editingFamily.name,
          address_street: editingFamily.address_street,
          address_city: editingFamily.address_city,
          address_state: editingFamily.address_state,
          address_zip: editingFamily.address_zip,
          home_phone: editingFamily.home_phone,
        })
        .eq('id', editingFamily.id);

      if (familyError) throw familyError;

      // Update members
      for (const member of editingMembers) {
        if (member.isNew) {
          // Create new member
          const { error: insertError } = await supabase
            .from('persons')
            .insert({
              family_id: editingFamily.id,
              first_name: member.first_name,
              last_name: member.last_name,
              email: member.email || null,
              phone: member.phone || null,
              date_of_birth: member.date_of_birth || null,
              is_head_of_family: member.family_role === 'head',
              is_spouse: member.family_role === 'spouse',
              family_role: member.family_role,
              photo_path: member.photo_path,
            });

          if (insertError) throw insertError;
        } else if (member.id) {
          // Update existing member
          const { error: updateError } = await supabase
            .from('persons')
            .update({
              first_name: member.first_name,
              last_name: member.last_name,
              email: member.email || null,
              phone: member.phone || null,
              date_of_birth: member.date_of_birth || null,
              is_head_of_family: member.family_role === 'head',
              is_spouse: member.family_role === 'spouse',
              family_role: member.family_role,
              photo_path: member.photo_path,
            })
            .eq('id', member.id);

          if (updateError) throw updateError;
        }
      }

      // Refresh directory data
      queryClient.invalidateQueries({ queryKey: ['directory'] });

      setIsEditModalVisible(false);
      setEditingFamily(null);
      setEditingMembers([]);

      Alert.alert('Success', 'Family and member information updated successfully!');
    } catch {
      Alert.alert('Error', 'Failed to update family information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadFamilyPhoto = async (file: any) => {
    if (!editingFamily) throw new Error('No family selected');

    try {
      const url = await uploadFamilyPhoto(editingFamily.id, file, editingFamily.photo_path);

      // Update local state
      setFamilyImages(prev => ({
        ...prev,
        familyPhotos: {
          ...prev.familyPhotos,
          [editingFamily.id]: url,
        },
      }));

      // Update editing family state
      setEditingFamily(prev => prev ? {
        ...prev,
        photo_path: `families/${editingFamily.id}/photo.jpg`,
      } : null);

      return url;
    } catch (error) {
      throw error;
    }
  };

  const handleAddMember = () => {
    const newMember: EditingMember = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      is_head_of_family: false,
      is_spouse: false,
      family_role: 'other',
      photo_path: null,
      isNew: true,
    };
    setEditingMembers(prev => [...prev, newMember]);
  };

  const handleRemoveMember = (index: number) => {
    const member = editingMembers[index];
    if (member.isNew) {
      // Just remove from local state if it's a new member
      setEditingMembers(prev => prev.filter((_, i) => i !== index));
    } else {
      // For existing members, confirm deletion
      Alert.alert(
        'Delete Member',
        `Are you sure you want to delete ${member.first_name} ${member.last_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                if (member.id) {
                  const { error } = await supabase
                    .from('persons')
                    .delete()
                    .eq('id', member.id);

                  if (error) throw error;
                }

                setEditingMembers(prev => prev.filter((_, i) => i !== index));
              } catch {
                Alert.alert('Error', 'Failed to delete member. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const handleUpdateMember = (index: number, updates: Partial<EditingMember>) => {
    setEditingMembers(prev => prev.map((member, i) =>
      i === index ? { ...member, ...updates } : member
    ));
  };

  const handlePhonePress = async (phoneNumber: string) => {
    try {
      const url = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to open phone dialer');
    }
  };

  const handleEmailPress = async (email: string) => {
    try {
      const url = `mailto:${email}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Email is not supported on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to open email client');
    }
  };

  const handleUploadMemberAvatar = async (index: number, file: any) => {
    const member = editingMembers[index];
    if (!member.id && !member.isNew) throw new Error('Invalid member');

    try {
      // For new members, we'll need to create a temporary ID or handle this after creation
      const personId = member.id || `temp_${Date.now()}`;
      const url = await uploadPersonAvatar(personId, file);

      // Update member photo_path
      handleUpdateMember(index, {
        photo_path: `persons/${personId}/avatar.jpg`
      });

      // Update local image cache
      setFamilyImages(prev => ({
        ...prev,
        memberAvatars: {
          ...prev.memberAvatars,
          [personId]: url,
        },
      }));

      return url;
    } catch (error) {
      throw error;
    }
  };

  const handleEditPerson = async (person: DirectoryEntry) => {
    if (!isAdmin || !person.person_id) return;

    setEditingPerson({
      id: person.person_id,
      first_name: person.first_name || '',
      last_name: person.last_name || '',
      email: person.email || '',
      phone: person.phone || '',
      date_of_birth: '',
      is_head_of_family: person.is_head_of_family || false,
      is_spouse: person.is_spouse || false,
      family_role: person.family_role || 'other',
      photo_path: person.photo_path,
      family_id: person.family_id,
      user_id: null,
      user_role: null,
    });

    // Load full person data including date_of_birth and user info
    try {
      let userRole: 'pending' | 'member' | 'leader' | 'admin' | null = null;

      // First get the person data
      const { data: personData, error: personError } = await supabase
        .from('persons')
        .select('*')
        .eq('id', person.person_id)
        .single();

      if (personError) throw personError;

      // If person has a user_id, get the role from profiles table
      if (personData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', personData.user_id)
          .single();

        if (!profileError && profileData) {
          userRole = profileData.role as 'pending' | 'member' | 'leader' | 'admin';
        }
      }

      if (personData) {
        setEditingPerson({
          id: personData.id,
          first_name: personData.first_name || '',
          last_name: personData.last_name || '',
          email: personData.email || '',
          phone: personData.phone || '',
          date_of_birth: personData.date_of_birth || '',
          is_head_of_family: personData.is_head_of_family || false,
          is_spouse: personData.is_spouse || false,
          family_role: personData.family_role || (personData.is_head_of_family ? 'head' as const : personData.is_spouse ? 'spouse' as const : 'other' as const),
          photo_path: personData.photo_path,
          family_id: personData.family_id,
          user_id: personData.user_id,
          user_role: userRole,
        });
      }
    } catch {
    }

    setIsEditPersonModalVisible(true);
  };

  const handleSavePerson = async () => {
    if (!editingPerson) return;

    setIsSaving(true);
    try {
      // Update person information
      const { error: personError } = await supabase
        .from('persons')
        .update({
          first_name: editingPerson.first_name,
          last_name: editingPerson.last_name,
          email: editingPerson.email || null,
          phone: editingPerson.phone || null,
          date_of_birth: editingPerson.date_of_birth || null,
          is_head_of_family: editingPerson.family_role === 'head',
          is_spouse: editingPerson.family_role === 'spouse',
          family_role: editingPerson.family_role,
          photo_path: editingPerson.photo_path,
        })
        .eq('id', editingPerson.id);

      if (personError) throw personError;

      // Update user role if person has a user account and role has changed
      if (editingPerson.user_id && editingPerson.user_role) {
        const { error: roleError } = await supabase
          .from('profiles')
          .update({
            role: editingPerson.user_role,
          })
          .eq('id', editingPerson.user_id);

        if (roleError) throw roleError;
      }

      // Refresh directory data
      queryClient.invalidateQueries({ queryKey: ['directory'] });

      setIsEditPersonModalVisible(false);
      setEditingPerson(null);

      Alert.alert('Success', 'Person information updated successfully!');
    } catch {
      Alert.alert('Error', 'Failed to update person information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadPersonAvatar = async (file: any) => {
    if (!editingPerson) throw new Error('No person selected');

    try {
      const url = await uploadPersonAvatar(editingPerson.id, file);

      // Update local state
      setFamilyImages(prev => ({
        ...prev,
        memberAvatars: {
          ...prev.memberAvatars,
          [editingPerson.id]: url,
        },
      }));

      // Update editing person state
      setEditingPerson(prev => prev ? {
        ...prev,
        photo_path: `persons/${editingPerson.id}/avatar.jpg`,
      } : null);

      return url;
    } catch (error) {
      throw error;
    }
  };

  const handleOpenTagModal = (personId: string) => {
    setSelectedPersonForTags(personId);
    setIsTagModalVisible(true);
  };

  const handleCloseTagModal = () => {
    setSelectedPersonForTags(null);
    setIsTagModalVisible(false);
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  const handleClearFilters = () => {
    setSelectedTagIds([]);
    setMatchAllTags(false);
    setSelectedUserRole(null);
  };

  const getSelectedTags = () => {
    if (!availableTags) return [];
    return availableTags.filter(tag => selectedTagIds.includes(tag.id));
  };

  // Stable array of [familyKey, members[]] tuples for FlatList (family view)
  const familyEntries = useMemo(
    () => Object.entries(groupedFamilies).filter(([, members]) => members && members.length > 0),
    [groupedFamilies]
  );

  const renderFamilyItem = useCallback(
    ({ item }: { item: [string, DirectoryEntry[]] }) => {
      const [familyKey, members] = item;
      const isExpanded = expandedFamilies.has(familyKey);
      const familyInfo = members[0];
      const isUnassigned = familyKey === '[Unassigned]';

      return (
        <TouchableOpacity
          style={styles.familyCard}
          onPress={() => toggleFamily(familyKey)}
          activeOpacity={0.7}
        >
          <View style={styles.familyHeader}>
            <View style={styles.familyHeaderContent}>
              {/* Family Photo */}
              {!isUnassigned && familyInfo.family_id && familyImages.familyPhotos[familyInfo.family_id] && familyImages.familyPhotos[familyInfo.family_id]!.trim() !== '' ? (
                <Image
                  source={{ uri: familyImages.familyPhotos[familyInfo.family_id]! }}
                  style={styles.familyPhoto}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.familyPhotoPlaceholder}>
                  <Users size={24} color="#9CA3AF" />
                </View>
              )}

              <View style={styles.familyInfo}>
                <View style={styles.familyTitleRow}>
                  <Text style={styles.familyName}>
                    {isUnassigned ? 'Unassigned Members' : familyInfo.family_name_display}
                  </Text>
                  <Text style={styles.memberCount}>({members.length})</Text>
                  {isAdmin && !isUnassigned && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleEditFamily(familyInfo);
                      }}
                    >
                      <Edit3 size={16} color="#7C3AED" />
                    </TouchableOpacity>
                  )}
                </View>
                {!isUnassigned && (
                  <>
                    {familyInfo.address_city && (
                      <View style={styles.familyLocation}>
                        <MapPin size={14} color="#9CA3AF" />
                        <Text style={styles.locationText}>
                          {familyInfo.address_city}, {familyInfo.address_state}
                        </Text>
                      </View>
                    )}
                    {familyInfo.home_phone && (
                      <TouchableOpacity
                        style={styles.familyLocation}
                        onPress={() => handlePhonePress(familyInfo.home_phone!)}
                        activeOpacity={0.7}
                      >
                        <Phone size={14} color="#7C3AED" />
                        <Text style={[styles.locationText, styles.locationLink]}>
                          {familyInfo.home_phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {familyInfo.address_street && (
                      <View style={styles.familyLocation}>
                        <Home size={14} color="#9CA3AF" />
                        <Text style={styles.locationText}>
                          {familyInfo.address_street}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>

          {isExpanded && (
            <View style={styles.membersContainer}>
              {members.filter(member => member?.person_id).map((member) => (
                <View key={member.person_id} style={styles.memberCard}>
                  {/* Member Avatar */}
                  {familyImages.memberAvatars[member.person_id] && familyImages.memberAvatars[member.person_id]!.trim() !== '' ? (
                    <Image
                      source={{ uri: familyImages.memberAvatars[member.person_id]! }}
                      style={styles.memberAvatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.memberAvatar}>
                      <User size={20} color="#9CA3AF" />
                    </View>
                  )}

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {member.first_name || ''} {member.last_name || ''}
                      {member.family_role === 'head' && ' (Head)'}
                      {member.family_role === 'spouse' && ' (Spouse)'}
                      {member.family_role === 'child' && ' (Child)'}
                    </Text>
                    {(() => {
                      const badge = getRoleBadge(member);
                      if (!badge) return null;
                      return (
                        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      );
                    })()}
                    {member.email && (
                      <TouchableOpacity
                        style={styles.memberDetail}
                        onPress={() => handleEmailPress(member.email!)}
                        activeOpacity={0.7}
                      >
                        <Mail size={12} color="#7C3AED" />
                        <Text style={[styles.memberDetailText, styles.memberDetailLink]}>{member.email}</Text>
                      </TouchableOpacity>
                    )}
                    {member.phone && (
                      <TouchableOpacity
                        style={styles.memberDetail}
                        onPress={() => handlePhonePress(member.phone!)}
                        activeOpacity={0.7}
                      >
                        <Phone size={12} color="#7C3AED" />
                        <Text style={[styles.memberDetailText, styles.memberDetailLink]}>{member.phone}</Text>
                      </TouchableOpacity>
                    )}
                    {/* Member Tags */}
                    {personTags[member.person_id] && personTags[member.person_id].length > 0 && (
                      <View style={styles.memberTagsContainer}>
                        {personTags[member.person_id].map(tag => (
                          <TagPill
                            key={tag.id}
                            tag={tag}
                            size="small"
                            testId={`member-tag-${member.person_id}-${tag.id}`}
                          />
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Tags Action for Staff - Only for family members */}
                  {isStaff && (
                    <TouchableOpacity
                      style={styles.tagActionButton}
                      onPress={() => handleOpenTagModal(member.person_id)}
                      testID={`tags-${member.person_id}`}
                    >
                      <Tags size={16} color="#7C3AED" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [
      expandedFamilies,
      familyImages,
      isAdmin,
      isStaff,
      personTags,
      getRoleBadge,
      toggleFamily,
      handleEditFamily,
      handlePhonePress,
      handleEmailPress,
      handleOpenTagModal,
    ]
  );

  const renderPersonItem = useCallback(
    ({ item: person }: { item: DirectoryEntry }) => {
      if (!person?.person_id) return null;
      return (
        <View style={styles.personCard}>
          <View style={styles.personCardContent}>
            {/* Person Avatar */}
            {familyImages.memberAvatars[person.person_id] && familyImages.memberAvatars[person.person_id]!.trim() !== '' ? (
              <Image
                source={{ uri: familyImages.memberAvatars[person.person_id]! }}
                style={styles.personAvatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.personAvatar}>
                <User size={24} color="#9CA3AF" />
              </View>
            )}

            <View style={styles.personInfo}>
              <View style={styles.personNameRow}>
                <Text style={styles.personName}>
                  {person.first_name || ''} {person.last_name || ''}
                </Text>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.personEditButton}
                    onPress={() => handleEditPerson(person)}
                  >
                    <Edit3 size={16} color="#7C3AED" />
                  </TouchableOpacity>
                )}
                {/* Tags Action for Staff - Only for family members */}
                {isStaff && (
                  <TouchableOpacity
                    style={styles.tagActionButton}
                    onPress={() => handleOpenTagModal(person.person_id)}
                    testID={`tags-${person.person_id}`}
                  >
                    <Tags size={16} color="#7C3AED" />
                  </TouchableOpacity>
                )}
              </View>
              {(() => {
                const badge = getRoleBadge(person);
                if (!badge) return null;
                return (
                  <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                );
              })()}
              {person.family_name_display && (
                <View style={styles.personFamily}>
                  <Users size={12} color="#9CA3AF" />
                  <Text style={styles.personFamilyText}>
                    {person.family_name_display}
                    {person.family_role === 'head' && ' (Head)'}
                    {person.family_role === 'spouse' && ' (Spouse)'}
                    {person.family_role === 'child' && ' (Child)'}
                  </Text>
                </View>
              )}
              {person.email && (
                <TouchableOpacity
                  style={styles.personDetail}
                  onPress={() => handleEmailPress(person.email!)}
                  activeOpacity={0.7}
                >
                  <Mail size={14} color="#7C3AED" />
                  <Text style={[styles.personDetailText, styles.personDetailLink]}>{person.email}</Text>
                </TouchableOpacity>
              )}
              {person.phone && (
                <TouchableOpacity
                  style={styles.personDetail}
                  onPress={() => handlePhonePress(person.phone!)}
                  activeOpacity={0.7}
                >
                  <Phone size={14} color="#7C3AED" />
                  <Text style={[styles.personDetailText, styles.personDetailLink]}>{person.phone}</Text>
                </TouchableOpacity>
              )}
              {person.address_city && (
                <View style={styles.personDetail}>
                  <MapPin size={14} color="#9CA3AF" />
                  <Text style={styles.personDetailText}>
                    {person.address_city}, {person.address_state}
                  </Text>
                </View>
              )}
              {/* Person Tags */}
              {personTags[person.person_id] && personTags[person.person_id].length > 0 && (
                <View style={styles.personTagsContainer}>
                  {personTags[person.person_id].map(tag => (
                    <TagPill
                      key={tag.id}
                      tag={tag}
                      size="small"
                      testId={`person-tag-${person.person_id}-${tag.id}`}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      );
    },
    [
      familyImages,
      isAdmin,
      isStaff,
      personTags,
      getRoleBadge,
      handleEditPerson,
      handlePhonePress,
      handleEmailPress,
      handleOpenTagModal,
    ]
  );

  const handleDeletePerson = () => {
    if (!editingPerson || !isAdmin) return;

    Alert.alert(
      'Delete Person',
      `Are you sure you want to delete ${editingPerson.first_name} ${editingPerson.last_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: rpcError } = await supabase.rpc('admin_delete_person', { p_person_id: editingPerson.id });
              if (rpcError) throw rpcError;
              const { data: checkPerson } = await supabase.from('persons').select('id').eq('id', editingPerson.id).maybeSingle();
              if (checkPerson) {
                Alert.alert('Delete Failed', 'The person could not be deleted. Please check your database RPC function.');
                return;
              }
              queryClient.invalidateQueries({ queryKey: ['directory'] });
              setIsEditPersonModalVisible(false);
              setEditingPerson(null);
              Alert.alert('Success', 'Person deleted successfully.');
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to delete person. Please try again.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  if (profile?.role === 'pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pendingContainer}>
          <AlertCircle size={64} color="#F59E0B" />
          <Text style={styles.pendingTitle}>Approval Required</Text>
          <Text style={styles.pendingText}>
            You need to be approved to view the church directory
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to Load Directory</Text>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['directory'] })}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <BookOpen size={28} color="#7C3AED" />
            <Text style={styles.title}>Church Directory</Text>
          </View>
          <TouchableOpacity
            style={styles.myFamilyButton}
            onPress={() => router.push('/(tabs)/family' as any)}
            activeOpacity={0.7}
            testID="my-family-button"
          >
            <Home size={16} color="#7C3AED" />
            <Text style={styles.myFamilyButtonText}>My Family</Text>
            <ChevronRight size={14} color="#7C3AED" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search families or members..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {isStaff && (
            <TouchableOpacity
              style={[styles.filterButton, (selectedTagIds.length > 0 || selectedUserRole) && styles.filterButtonActive]}
              onPress={() => setIsFilterModalVisible(true)}
              testID="filter-button"
            >
              <Filter size={20} color={(selectedTagIds.length > 0 || selectedUserRole) ? '#7C3AED' : '#9CA3AF'} />
              {(selectedTagIds.length > 0 || selectedUserRole) && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {selectedTagIds.length + (selectedUserRole ? 1 : 0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Active Filters Display */}
        {(selectedTagIds.length > 0 || selectedUserRole) && (
          <View style={styles.activeFiltersContainer}>
            <View style={styles.activeFiltersHeader}>
              <Text style={styles.activeFiltersTitle}>
                {selectedTagIds.length > 0 && selectedUserRole ? (
                  `Filtered by ${selectedTagIds.length} tag${selectedTagIds.length !== 1 ? 's' : ''} (${matchAllTags ? 'ALL' : 'ANY'}) + ${selectedUserRole} role`
                ) : selectedTagIds.length > 0 ? (
                  `Filtered by ${selectedTagIds.length} tag${selectedTagIds.length !== 1 ? 's' : ''} (${matchAllTags ? 'ALL' : 'ANY'})`
                ) : (
                  `Filtered by ${selectedUserRole} role`
                )}
              </Text>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
                testID="clear-filters"
              >
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activeFiltersList}>
              {getSelectedTags().map(tag => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  onRemove={() => handleToggleTag(tag.id)}
                  showRemove
                />
              ))}
              {selectedUserRole && (
                <View style={styles.userRoleFilter}>
                  <Text style={styles.userRoleFilterText}>
                    {selectedUserRole.charAt(0).toUpperCase() + selectedUserRole.slice(1)} Role
                  </Text>
                  <TouchableOpacity
                    style={styles.userRoleFilterRemove}
                    onPress={() => setSelectedUserRole(null)}
                    testID="remove-role-filter"
                  >
                    <X size={12} color="#7C3AED" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={styles.viewModeContainer}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'family' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('family')}
            activeOpacity={0.7}
          >
            <Users size={16} color={viewMode === 'family' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.viewModeButtonText, viewMode === 'family' && styles.viewModeButtonTextActive]}>View by Family</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'person' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('person')}
            activeOpacity={0.7}
          >
            <List size={16} color={viewMode === 'person' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.viewModeButtonText, viewMode === 'person' && styles.viewModeButtonTextActive]}>By Person</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'family' ? (
        <FlatList
          data={familyEntries}
          keyExtractor={([familyKey]) => familyKey}
          renderItem={renderFamilyItem}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['directory'] })}
            />
          }
          ListEmptyComponent={
            <View style={styles.personListContainer} />
          }
        />
      ) : (
        <FlatList
          data={sortedPersons.filter(person => person?.person_id)}
          keyExtractor={(person) => person.person_id}
          renderItem={renderPersonItem}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.personListContainer}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['directory'] })}
            />
          }
          ListEmptyComponent={
            <View />
          }
        />
      )}

      <EditFamilyModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        editingFamily={editingFamily}
        setEditingFamily={setEditingFamily}
        editingMembers={editingMembers}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSaving={isSaving}
        familyImages={familyImages}
        onSave={handleSaveFamily}
        onDelete={handleDeleteFamily}
        onUploadFamilyPhoto={handleUploadFamilyPhoto}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateMember={handleUpdateMember}
        onUploadMemberAvatar={handleUploadMemberAvatar}
      />

      <EditPersonModal
        visible={isEditPersonModalVisible}
        onClose={() => setIsEditPersonModalVisible(false)}
        editingPerson={editingPerson}
        setEditingPerson={setEditingPerson}
        isSaving={isSaving}
        familyImages={familyImages}
        isAdmin={isAdmin}
        onSave={handleSavePerson}
        onDelete={handleDeletePerson}
        onUploadAvatar={handleUploadPersonAvatar}
      />

      <TagManageModal
        visible={isTagModalVisible}
        onClose={handleCloseTagModal}
        selectedPersonForTags={selectedPersonForTags}
      />

      <TagFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        selectedTagIds={selectedTagIds}
        matchAllTags={matchAllTags}
        setMatchAllTags={setMatchAllTags}
        onToggleTag={handleToggleTag}
        onClearFilters={handleClearFilters}
        availableTags={availableTags}
        selectedUserRole={selectedUserRole}
        setSelectedUserRole={setSelectedUserRole}
        isAdmin={isAdmin}
        filteredDataCount={filteredData.length}
      />
    </SafeAreaView>
  );
}
