import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Search, Users, User, Mail, Phone, MapPin, AlertCircle, Edit3, X, Save, Home, Trash2, UserPlus, List, Tags, Filter } from 'lucide-react-native';
import { useUser } from '@/hooks/user-context';
import { getSignedUrl, uploadFamilyPhoto, uploadPersonAvatar } from '@/lib/storage';
import ImageUploader from '@/components/ImageUploader';
import PersonTagPicker from '@/components/PersonTagPicker';
import TagPill from '@/components/TagPill';
import { useMe } from '@/hooks/me-context';
import { listTags, findPeopleByTags, getPersonWithTags, type Tag } from '@/services/tags';
import { adminListUsers, type AdminUserListItem } from '@/lib/admin-users';

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
  photo_url: string | null;
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
  photo_url: string | null;
  family_id: string | null;
  user_id: string | null;
  user_role: 'pending' | 'member' | 'leader' | 'admin' | null;
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
  const [selectedUserRole, setSelectedUserRole] = useState<'pending' | 'member' | 'leader' | 'admin' | null>(null);
  const [adminUsersList, setAdminUsersList] = useState<AdminUserListItem[]>([]);
  const [personTags, setPersonTags] = useState<Record<string, Tag[]>>({});

  const isAdmin = profile?.role === 'admin';
  const isStaff = myRole === 'leader' || myRole === 'admin';

  // Load available tags for filtering
  const { data: availableTags } = useQuery({
    queryKey: ['tags', 'active'],
    queryFn: () => listTags(true), // Only active tags for filtering
    enabled: isStaff,
  });

  // Load admin users list for role filtering
  const { data: adminUsersData } = useQuery({
    queryKey: ['admin-users', selectedUserRole, isAdmin],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      console.log('🔍 Loading admin users with role filter:', selectedUserRole);
      
      try {
        const roles = selectedUserRole ? [selectedUserRole] : null;
        const users = await adminListUsers(roles);
        
        console.log('✅ Admin users loaded:', {
          requestedRole: selectedUserRole,
          totalUsers: users.length,
          sampleUsers: users.slice(0, 3).map(u => ({
            name: `${u.first_name} ${u.last_name}`,
            role: u.role,
            user_id: u.user_id
          }))
        });
        
        return users;
      } catch (error) {
        console.error('❌ Failed to load admin users:', error);
        return [];
      }
    },
    enabled: isAdmin,
  });

  // Update admin users list when data changes
  useEffect(() => {
    if (adminUsersData) {
      setAdminUsersList(adminUsersData);
    }
  }, [adminUsersData]);



  const { data: directoryData, isLoading, error } = useQuery({
    queryKey: ['directory', isAdmin],
    queryFn: async () => {
      console.log('🔍 Loading directory data...');
      
      try {
        // First, try to get data from the view if it exists
        let { data: viewData, error: viewError } = await supabase
          .from('family_directory_display')
          .select('*')
          .order('family_name_display', { ascending: true });
        
        if (viewError) {
          console.log('View not available, falling back to direct query:', viewError.message);
          
          // Fallback: Query persons table directly with family info and user roles (admin only)
          const baseFields = `
              id,
              first_name,
              last_name,
              email,
              phone,
              photo_url,
              is_head_of_family,
              is_spouse,
              family_id,
              user_id,
              families!inner(
                id,
                name,
                photo_path,
                address_street,
                address_city,
                address_state,
                address_zip,
                home_phone
              )`;
          
          const profileFields = `,
              profiles(
                id,
                role
              )`;
          
          const selectFields = isAdmin ? baseFields + profileFields : baseFields;
          
          let query = supabase
            .from('persons')
            .select(selectFields)
            .order('families.name', { ascending: true });
          
          const { data: personsData, error: personsError } = await query;
          
          if (personsError) throw personsError;
          
          // Transform to match expected format
          viewData = personsData?.map((person: any) => ({
            person_id: person.id,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            phone: person.phone,
            photo_url: person.photo_url,
            is_head_of_family: person.is_head_of_family,
            is_spouse: person.is_spouse,
            family_id: person.family_id,
            user_id: person.user_id,
            user_role: isAdmin && person.profiles ? person.profiles.role : null,
            family_name_display: person.families?.name,
            address_street: person.families?.address_street,
            address_city: person.families?.address_city,
            address_state: person.families?.address_state,
            address_zip: person.families?.address_zip,
            home_phone: person.families?.home_phone,
            family_photo_path: person.families?.photo_path,
          })) || [];
        } else {
          // If view worked, get family photo paths and user roles separately
          const familyIds = [...new Set(viewData?.map(entry => entry.family_id).filter(Boolean))];
          
          if (familyIds.length > 0) {
            const { data: familyPhotos } = await supabase
              .from('families')
              .select('id, photo_path')
              .in('id', familyIds);
            
            const photoMap = new Map(familyPhotos?.map(f => [f.id, f.photo_path]) || []);
            
            viewData = viewData?.map((entry: any) => ({
              ...entry,
              family_photo_path: entry.family_id ? photoMap.get(entry.family_id) : null,
            })) || [];
          }
          
          // Load user roles for admin users
          if (isAdmin && viewData) {
            const personIds = viewData.map(entry => entry.person_id).filter(Boolean);
            
            if (personIds.length > 0) {
              const { data: userRoles } = await supabase
                .from('persons')
                .select(`
                  id,
                  user_id,
                  profiles(
                    id,
                    role
                  )
                `)
                .in('id', personIds)
                .not('user_id', 'is', null);
              
              const roleMap = new Map(
                userRoles?.map(ur => [ur.id, (ur.profiles as any)?.role]) || []
              );
              
              viewData = viewData.map((entry: any) => ({
                ...entry,
                user_role: roleMap.get(entry.person_id) || null,
              }));
            }
          }
        }
        
        console.log('📊 Directory data loaded:', {
          totalEntries: viewData?.length || 0,
          uniqueFamilies: [...new Set(viewData?.map(e => e.family_id).filter(Boolean))].length,
          usersWithRoles: isAdmin ? viewData?.filter(e => e.user_role).length : 'N/A (not admin)'
        });
        
        return viewData as (DirectoryEntry & { user_role?: string | null })[];
      } catch (err) {
        console.error('❌ Error loading directory:', err);
        throw err;
      }
    },
    enabled: profile?.role !== 'pending',
  });

  // Filter people by selected tags
  useEffect(() => {
    const filterByTags = async () => {
      if (selectedTagIds.length === 0) {
        setFilteredPersonIds([]);
        return;
      }

      try {
        console.log('🔍 Filtering by tags:', { 
          selectedTagIds, 
          matchAllTags,
          availableTagsCount: availableTags?.length || 0
        });
        
        // Use the actual database function to find people by tags
        const personIds = await findPeopleByTags(selectedTagIds, matchAllTags);
        
        console.log('✅ Filtered person IDs:', {
          count: personIds.length,
          ids: personIds
        });
        setFilteredPersonIds(personIds);
      } catch (error) {
        console.error('❌ Error filtering by tags:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          selectedTagIds,
          matchAllTags
        });
        // Fallback to empty results on error
        setFilteredPersonIds([]);
      }
    };

    filterByTags();
  }, [selectedTagIds, matchAllTags, availableTags]);

  // Load family photos and member avatars
  useEffect(() => {
    const loadImages = async () => {
      if (!directoryData) {
        console.log('📷 No directory data available for image loading');
        return;
      }

      console.log('📷 Loading images for directory...');
      console.log('Directory entries:', directoryData.length);

      try {
        const familyPhotoPromises: Promise<{ familyId: string; url: string | null }>[] = [];
        const memberAvatarPromises: Promise<{ personId: string; url: string | null }>[] = [];
        
        // Track unique families and members to avoid duplicates
        const uniqueFamilies = new Set<string>();
        const uniqueMembers = new Set<string>();

        directoryData.forEach((entry) => {
          // Load family photos
          if (entry.family_id && !uniqueFamilies.has(entry.family_id) && entry.family_photo_path) {
            console.log('📸 Queuing family photo:', entry.family_id, entry.family_photo_path);
            uniqueFamilies.add(entry.family_id);
            familyPhotoPromises.push(
              getSignedUrl(entry.family_photo_path)
                .then((url) => {
                  console.log('✅ Family photo loaded:', entry.family_id, url ? 'success' : 'no file');
                  const timestamp = Date.now();
                  return {
                    familyId: entry.family_id!,
                    url: url ? `${url}&t=${timestamp}` : null,
                  };
                })
                .catch((err) => {
                  console.error('❌ Family photo failed:', entry.family_id, err);
                  return { familyId: entry.family_id!, url: null };
                })
            );
          }

          // Load member avatars
          if (entry.person_id && !uniqueMembers.has(entry.person_id) && entry.photo_url) {
            console.log('👤 Queuing member avatar:', entry.person_id, entry.photo_url);
            uniqueMembers.add(entry.person_id);
            memberAvatarPromises.push(
              getSignedUrl(entry.photo_url)
                .then((url) => {
                  console.log('✅ Member avatar loaded:', entry.person_id, url ? 'success' : 'no file');
                  const timestamp = Date.now();
                  return {
                    personId: entry.person_id,
                    url: url ? `${url}&t=${timestamp}` : null,
                  };
                })
                .catch((err) => {
                  console.error('❌ Member avatar failed:', entry.person_id, err);
                  return { personId: entry.person_id, url: null };
                })
            );
          }
        });

        console.log('📊 Image loading summary:', {
          familyPhotos: familyPhotoPromises.length,
          memberAvatars: memberAvatarPromises.length
        });

        // Load all images in parallel
        const [familyPhotoResults, memberAvatarResults] = await Promise.all([
          Promise.all(familyPhotoPromises),
          Promise.all(memberAvatarPromises),
        ]);

        // Update state with loaded images
        const newFamilyPhotos: Record<string, string | null> = {};
        const newMemberAvatars: Record<string, string | null> = {};

        familyPhotoResults.forEach(({ familyId, url }) => {
          newFamilyPhotos[familyId] = url;
        });

        memberAvatarResults.forEach(({ personId, url }) => {
          newMemberAvatars[personId] = url;
        });

        console.log('🎯 Images loaded successfully:', {
          familyPhotos: Object.keys(newFamilyPhotos).length,
          memberAvatars: Object.keys(newMemberAvatars).length
        });

        setFamilyImages({
          familyPhotos: newFamilyPhotos,
          memberAvatars: newMemberAvatars,
        });
      } catch (error) {
        console.error('❌ Error loading directory images:', error);
      }
    };

    loadImages();
  }, [directoryData]);

  // User roles are now loaded directly with directory data for admins

  const filteredData = useMemo(() => {
    if (!directoryData) return [];

    let filtered = directoryData.filter((entry) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = (
        (entry.first_name?.toLowerCase() || '').includes(searchLower) ||
        (entry.last_name?.toLowerCase() || '').includes(searchLower) ||
        (entry.email?.toLowerCase() || '').includes(searchLower) ||
        (entry.family_name_display?.toLowerCase() || '').includes(searchLower)
      );
      
      // Apply tag filter if tags are selected
      if (selectedTagIds.length > 0) {
        const matchesTags = filteredPersonIds.includes(entry.person_id);
        if (!matchesTags) return false;
      }
      
      // Apply user role filter if selected (admin only)
      if (selectedUserRole && isAdmin) {
        console.log('🔍 Role filter check:', {
          personId: entry.person_id,
          personName: `${entry.first_name} ${entry.last_name}`,
          selectedUserRole,
          entryUserRole: entry.user_role,
          hasUserAccount: !!entry.user_id,
          adminUsersListCount: adminUsersList.length
        });
        
        // Check if this person is in the admin users list (which is already filtered by role)
        const isInAdminList = adminUsersList.some(adminUser => 
          adminUser.person_id === entry.person_id
        );
        
        if (!isInAdminList) {
          console.log('❌ Person not in admin users list for selected role');
          return false;
        }
        
        console.log('✅ Person found in admin users list, including in results');
      }
      
      return matchesSearch;
    });

    console.log('🔍 Filtered data:', {
      totalEntries: directoryData?.length || 0,
      searchQuery,
      selectedTagsCount: selectedTagIds.length,
      selectedUserRole,
      filteredPersonIdsCount: filteredPersonIds.length,
      filteredPersonIds: filteredPersonIds.slice(0, 5), // Show first 5 for debugging
      finalFilteredCount: filtered.length,
      sampleFilteredEntries: filtered.slice(0, 3).map(e => ({ 
        person_id: e.person_id, 
        name: `${e.first_name} ${e.last_name}`,
        user_role: e.user_role,
        has_user_account: !!e.user_id,
        matchesFilter: selectedTagIds.length === 0 || filteredPersonIds.includes(e.person_id)
      }))
    });

    return filtered;
  }, [directoryData, searchQuery, selectedTagIds, filteredPersonIds, selectedUserRole, isAdmin, adminUsersList]);

  // Load tags for all visible people
  useEffect(() => {
    const loadPersonTags = async () => {
      if (!filteredData || filteredData.length === 0) return;
      
      console.log('🏷️ Loading tags for people in directory...');
      
      try {
        const tagPromises = filteredData.map(async (person) => {
          try {
            // Validate person_id before making the call
            if (!person.person_id || 
                person.person_id === 'null' || 
                person.person_id === 'undefined' || 
                person.person_id.trim() === '' ||
                person.person_id === 'invalid') {
              console.warn(`⚠️ Invalid person_id for person:`, {
                person_id: person.person_id,
                first_name: person.first_name,
                last_name: person.last_name
              });
              return {
                personId: person.person_id || 'invalid',
                tags: []
              };
            }
            
            // Additional UUID format validation
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(person.person_id)) {
              console.warn(`⚠️ Invalid UUID format for person_id:`, {
                person_id: person.person_id,
                first_name: person.first_name,
                last_name: person.last_name
              });
              return {
                personId: person.person_id,
                tags: []
              };
            }
            
            const personWithTags = await getPersonWithTags(person.person_id);
            return {
              personId: person.person_id,
              tags: personWithTags.tags || []
            };
          } catch (error) {
            console.warn(`⚠️ Failed to load tags for person ${person.person_id}:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              person_id: person.person_id,
              first_name: person.first_name,
              last_name: person.last_name
            });
            return {
              personId: person.person_id || 'invalid',
              tags: []
            };
          }
        });
        
        const results = await Promise.all(tagPromises);
        
        const newPersonTags: Record<string, Tag[]> = {};
        results.forEach(({ personId, tags }) => {
          if (personId && 
              personId !== 'invalid' && 
              personId !== 'null' && 
              personId !== 'undefined' &&
              personId.trim() !== '') {
            newPersonTags[personId] = tags;
          }
        });
        
        setPersonTags(newPersonTags);
        
        console.log('✅ Person tags loaded:', {
          peopleCount: results.length,
          validPeople: Object.keys(newPersonTags).length,
          totalTags: results.reduce((sum, r) => sum + r.tags.length, 0)
        });
      } catch (error) {
        console.error('❌ Error loading person tags:', error);
      }
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
      grouped[key].sort((a, b) => {
        if (a.is_head_of_family !== b.is_head_of_family) {
          return a.is_head_of_family ? -1 : 1;
        }
        if (a.is_spouse !== b.is_spouse) {
          return a.is_spouse ? -1 : 1;
        }
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
        .order('is_head_of_family', { ascending: false })
        .order('is_spouse', { ascending: false })
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
        photo_url: member.photo_url,
        isNew: false,
      })) || []);
    } catch (error) {
      console.error('Error loading family members:', error);
      setEditingMembers([]);
    }
    
    setActiveTab('family');
    setIsEditModalVisible(true);
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
              is_head_of_family: member.is_head_of_family,
              is_spouse: member.is_spouse,
              photo_url: member.photo_url,
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
              is_head_of_family: member.is_head_of_family,
              is_spouse: member.is_spouse,
              photo_url: member.photo_url,
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
    } catch (error) {
      console.error('Error updating family:', error);
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
      console.error('Error uploading family photo:', error);
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
      photo_url: null,
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
              } catch (error) {
                console.error('Error deleting member:', error);
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
    } catch (error) {
      console.error('Error opening phone dialer:', error);
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
    } catch (error) {
      console.error('Error opening email client:', error);
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
      
      // Update member photo_url
      handleUpdateMember(index, {
        photo_url: `persons/${personId}/avatar.jpg`
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
      console.error('Error uploading member avatar:', error);
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
      photo_url: person.photo_url,
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
      
      console.log('🔍 Person data loaded:', {
        id: personData?.id,
        user_id: personData?.user_id,
        userRole: userRole,
        userRoleType: typeof userRole,
        hasUserAccount: !!personData?.user_id
      });
      
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
          photo_url: personData.photo_url,
          family_id: personData.family_id,
          user_id: personData.user_id,
          user_role: userRole,
        });
        
        console.log('✅ EditingPerson set:', {
          user_id: personData.user_id,
          user_role: userRole,
          shouldShowRoleSelector: !!personData.user_id,
          actualRoleValue: userRole,
          roleType: typeof userRole
        });
      }
    } catch (error) {
      console.error('Error loading person data:', error);
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
          is_head_of_family: editingPerson.is_head_of_family,
          is_spouse: editingPerson.is_spouse,
          photo_url: editingPerson.photo_url,
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
    } catch (error) {
      console.error('Error updating person:', error);
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
        photo_url: `persons/${editingPerson.id}/avatar.jpg`,
      } : null);
      
      return url;
    } catch (error) {
      console.error('Error uploading person avatar:', error);
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

  const handleDeletePerson = () => {
    if (!editingPerson) return;
    
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
              const { error } = await supabase
                .from('persons')
                .delete()
                .eq('id', editingPerson.id);
              
              if (error) throw error;
              
              // Refresh directory data
              queryClient.invalidateQueries({ queryKey: ['directory'] });
              
              setIsEditPersonModalVisible(false);
              setEditingPerson(null);
              
              Alert.alert('Success', 'Person deleted successfully.');
            } catch (error) {
              console.error('Error deleting person:', error);
              Alert.alert('Error', 'Failed to delete person. Please try again.');
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
    console.error('Directory error:', error);
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
        <Text style={styles.title}>Church Directory</Text>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {viewMode === 'family' ? (
          // Family View
          Object.entries(groupedFamilies).map(([familyKey, members]) => {
          const isExpanded = expandedFamilies.has(familyKey);
          const familyInfo = members[0];
          const isUnassigned = familyKey === '[Unassigned]';

          return (
            <TouchableOpacity
              key={familyKey}
              style={styles.familyCard}
              onPress={() => toggleFamily(familyKey)}
              activeOpacity={0.7}
            >
              <View style={styles.familyHeader}>
                <View style={styles.familyHeaderContent}>
                  {/* Family Photo */}
                  {!isUnassigned && familyInfo.family_id && familyImages.familyPhotos[familyInfo.family_id] ? (
                    <Image
                      source={{ uri: familyImages.familyPhotos[familyInfo.family_id]! }}
                      style={styles.familyPhoto}
                      resizeMode="cover"
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
                  {members.map((member) => (
                    <View key={member.person_id} style={styles.memberCard}>
                      {/* Member Avatar */}
                      {familyImages.memberAvatars[member.person_id] ? (
                        <Image
                          source={{ uri: familyImages.memberAvatars[member.person_id]! }}
                          style={styles.memberAvatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.memberAvatar}>
                          <User size={20} color="#9CA3AF" />
                        </View>
                      )}
                      
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.first_name || ''} {member.last_name || ''}
                          {member.is_head_of_family && ' (Head)'}
                          {member.is_spouse && ' (Spouse)'}
                        </Text>
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
        })
        ) : (
          // Person View
          <View style={styles.personListContainer}>
            {sortedPersons.map((person) => (
              <View key={person.person_id} style={styles.personCard}>
                <View style={styles.personCardContent}>
                  {/* Person Avatar */}
                  {familyImages.memberAvatars[person.person_id] ? (
                    <Image
                      source={{ uri: familyImages.memberAvatars[person.person_id]! }}
                      style={styles.personAvatarImage}
                      resizeMode="cover"
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
                    {person.family_name_display && (
                      <View style={styles.personFamily}>
                        <Users size={12} color="#9CA3AF" />
                        <Text style={styles.personFamilyText}>
                          {person.family_name_display}
                          {person.is_head_of_family && ' (Head)'}
                          {person.is_spouse && ' (Spouse)'}
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
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Family Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsEditModalVisible(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Family</Text>
            <TouchableOpacity
              style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
              onPress={handleSaveFamily}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Save size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'family' && styles.activeTab]}
              onPress={() => setActiveTab('family')}
            >
              <Home size={16} color={activeTab === 'family' ? '#7C3AED' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'family' && styles.activeTabText]}>Family Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'members' && styles.activeTab]}
              onPress={() => setActiveTab('members')}
            >
              <Users size={16} color={activeTab === 'members' ? '#7C3AED' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Members ({editingMembers.length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {editingFamily && activeTab === 'family' && (
              <>
                {/* Family Photo */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Family Photo</Text>
                  <View style={styles.familyPhotoContainer}>
                    <ImageUploader
                      currentImageUrl={familyImages.familyPhotos[editingFamily.id]}
                      onUpload={handleUploadFamilyPhoto}
                      placeholder="Add Family Photo"
                      size={120}
                      isCircular={false}
                    />
                  </View>
                </View>

                {/* Family Name */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Family Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingFamily.name}
                    onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, name: text } : null)}
                    placeholder="Enter family name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Address */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Address</Text>
                  
                  <Text style={styles.modalLabel}>Street Address</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingFamily.address_street}
                    onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_street: text } : null)}
                    placeholder="Enter street address"
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <View style={styles.modalRow}>
                    <View style={styles.modalRowItem}>
                      <Text style={styles.modalLabel}>City</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingFamily.address_city}
                        onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_city: text } : null)}
                        placeholder="City"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    
                    <View style={styles.modalRowItem}>
                      <Text style={styles.modalLabel}>State</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingFamily.address_state}
                        onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_state: text } : null)}
                        placeholder="State"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    
                    <View style={styles.modalRowItem}>
                      <Text style={styles.modalLabel}>ZIP</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingFamily.address_zip}
                        onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, address_zip: text } : null)}
                        placeholder="ZIP"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>

                {/* Home Phone */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Home Phone</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingFamily.home_phone}
                    onChangeText={(text) => setEditingFamily(prev => prev ? { ...prev, home_phone: text } : null)}
                    placeholder="Enter home phone number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <>
                <View style={styles.modalSection}>
                  <View style={styles.membersHeader}>
                    <Text style={styles.modalSectionTitle}>Family Members</Text>
                    <TouchableOpacity
                      style={styles.addMemberButton}
                      onPress={handleAddMember}
                    >
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
                            onUpload={(file) => handleUploadMemberAvatar(index, file)}
                            placeholder="Avatar"
                            size={60}
                            isCircular={true}
                          />
                        </View>
                        <View style={styles.memberEditInfo}>
                          <View style={styles.memberEditRow}>
                            <View style={styles.memberEditRowItem}>
                              <Text style={styles.modalLabel}>First Name</Text>
                              <TextInput
                                style={styles.modalInput}
                                value={member.first_name}
                                onChangeText={(text) => handleUpdateMember(index, { first_name: text })}
                                placeholder="First name"
                                placeholderTextColor="#9CA3AF"
                              />
                            </View>
                            <View style={styles.memberEditRowItem}>
                              <Text style={styles.modalLabel}>Last Name</Text>
                              <TextInput
                                style={styles.modalInput}
                                value={member.last_name}
                                onChangeText={(text) => handleUpdateMember(index, { last_name: text })}
                                placeholder="Last name"
                                placeholderTextColor="#9CA3AF"
                              />
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.removeMemberButton}
                          onPress={() => handleRemoveMember(index)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.memberEditRow}>
                        <View style={styles.memberEditRowItem}>
                          <Text style={styles.modalLabel}>Email</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={member.email}
                            onChangeText={(text) => handleUpdateMember(index, { email: text })}
                            placeholder="Email address"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>
                        <View style={styles.memberEditRowItem}>
                          <Text style={styles.modalLabel}>Phone</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={member.phone}
                            onChangeText={(text) => handleUpdateMember(index, { phone: text })}
                            placeholder="Phone number"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                          />
                        </View>
                      </View>

                      <View style={styles.memberEditRow}>
                        <View style={styles.memberEditRowItem}>
                          <Text style={styles.modalLabel}>Date of Birth</Text>
                          <TextInput
                            style={styles.modalInput}
                            value={member.date_of_birth}
                            onChangeText={(text) => handleUpdateMember(index, { date_of_birth: text })}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <View style={styles.memberEditRowItem}>
                          <Text style={styles.modalLabel}>Role</Text>
                          <View style={styles.roleContainer}>
                            <TouchableOpacity
                              style={[styles.roleButton, member.is_head_of_family && styles.roleButtonActive]}
                              onPress={() => handleUpdateMember(index, { 
                                is_head_of_family: !member.is_head_of_family
                              })}
                            >
                              <Text style={[styles.roleButtonText, member.is_head_of_family && styles.roleButtonTextActive]}>Head</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.roleButton, member.is_spouse && styles.roleButtonActive]}
                              onPress={() => handleUpdateMember(index, { 
                                is_spouse: !member.is_spouse
                              })}
                            >
                              <Text style={[styles.roleButtonText, member.is_spouse && styles.roleButtonTextActive]}>Spouse</Text>
                            </TouchableOpacity>
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
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Person Modal */}
      <Modal
        visible={isEditPersonModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditPersonModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsEditPersonModalVisible(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Person</Text>
            <TouchableOpacity
              style={[styles.modalSaveButton, isSaving && styles.modalSaveButtonDisabled]}
              onPress={handleSavePerson}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Save size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {editingPerson && (
              <>
                {/* Person Avatar */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Profile Photo</Text>
                  <View style={styles.personAvatarContainer}>
                    <ImageUploader
                      currentImageUrl={familyImages.memberAvatars[editingPerson.id]}
                      onUpload={handleUploadPersonAvatar}
                      placeholder="Add Photo"
                      size={100}
                      isCircular={true}
                    />
                  </View>
                </View>

                {/* Name */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Personal Information</Text>
                  
                  <View style={styles.modalRow}>
                    <View style={styles.modalRowItem}>
                      <Text style={styles.modalLabel}>First Name</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingPerson.first_name}
                        onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, first_name: text } : null)}
                        placeholder="First name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.modalRowItem}>
                      <Text style={styles.modalLabel}>Last Name</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={editingPerson.last_name}
                        onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, last_name: text } : null)}
                        placeholder="Last name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>

                {/* Contact Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Contact Information</Text>
                  
                  <Text style={styles.modalLabel}>Email</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingPerson.email}
                    onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, email: text } : null)}
                    placeholder="Email address"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  
                  <Text style={styles.modalLabel}>Phone</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingPerson.phone}
                    onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, phone: text } : null)}
                    placeholder="Phone number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </View>

                {/* Additional Information */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Additional Information</Text>
                  
                  <Text style={styles.modalLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editingPerson.date_of_birth}
                    onChangeText={(text) => setEditingPerson(prev => prev ? { ...prev, date_of_birth: text } : null)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                  
                  <Text style={styles.modalLabel}>Family Role</Text>
                  <View style={styles.roleContainer}>
                    <TouchableOpacity
                      style={[styles.roleButton, editingPerson.is_head_of_family && styles.roleButtonActive]}
                      onPress={() => setEditingPerson(prev => prev ? { 
                        ...prev, 
                        is_head_of_family: !prev.is_head_of_family
                      } : null)}
                    >
                      <Text style={[styles.roleButtonText, editingPerson.is_head_of_family && styles.roleButtonTextActive]}>Head of Family</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleButton, editingPerson.is_spouse && styles.roleButtonActive]}
                      onPress={() => setEditingPerson(prev => prev ? { 
                        ...prev, 
                        is_spouse: !prev.is_spouse
                      } : null)}
                    >
                      <Text style={[styles.roleButtonText, editingPerson.is_spouse && styles.roleButtonTextActive]}>Spouse</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* User Role - Only show if person has a user account */}
                {editingPerson.user_id && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Account Role</Text>
                    <Text style={styles.modalSectionDescription}>
                      This person has a user account. You can change their role here.
                    </Text>
                    
                    <Text style={styles.modalLabel}>User Role</Text>
                    <Text style={styles.currentRoleDebug}>
                      Current role: {JSON.stringify(editingPerson.user_role)} (type: {typeof editingPerson.user_role})
                    </Text>
                    <Text style={styles.currentRoleDebug}>
                      Debug: Role value = {JSON.stringify(editingPerson.user_role)}
                    </Text>
                    <View style={styles.userRoleContainer}>
                      {(['pending', 'member', 'leader', 'admin'] as const).map((role) => {
                        // Direct comparison without normalization to preserve exact matching
                        const isActive = editingPerson.user_role === role;
                        
                        console.log('🎯 Role button render:', {
                          role,
                          currentUserRole: editingPerson.user_role,
                          isActive,
                          userRoleType: typeof editingPerson.user_role,
                          exactMatch: editingPerson.user_role === role
                        });
                        
                        return (
                          <TouchableOpacity
                            key={role}
                            style={[
                              styles.userRoleButton,
                              isActive && styles.userRoleButtonActive
                            ]}
                            onPress={() => {
                              console.log('🔄 Role button pressed:', role);
                              setEditingPerson(prev => prev ? { 
                                ...prev, 
                                user_role: role
                              } : null);
                            }}
                          >
                            <Text style={[
                              styles.userRoleButtonText,
                              isActive && styles.userRoleButtonTextActive
                            ]}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    <View style={styles.roleDescriptions}>
                      <Text style={styles.roleDescriptionTitle}>Role Permissions:</Text>
                      <Text style={styles.roleDescription}>• <Text style={styles.roleDescriptionBold}>Pending:</Text> Awaiting approval, limited access</Text>
                      <Text style={styles.roleDescription}>• <Text style={styles.roleDescriptionBold}>Member:</Text> Can view directory and manage own profile</Text>
                      <Text style={styles.roleDescription}>• <Text style={styles.roleDescriptionBold}>Leader:</Text> Can manage tags and view member details</Text>
                      <Text style={styles.roleDescription}>• <Text style={styles.roleDescriptionBold}>Admin:</Text> Full access to all features</Text>
                    </View>
                  </View>
                )}

                {/* Delete Person Button */}
                <View style={styles.modalSection}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeletePerson}
                  >
                    <Trash2 size={20} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete Person</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Tags Modal */}
      <Modal
        visible={isTagModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseTagModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleCloseTagModal}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Tags</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedPersonForTags && (
              <PersonTagPicker
                personId={selectedPersonForTags}
                testId="directory-tag-picker"
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Tag Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsFilterModalVisible(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filter by Tags</Text>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={handleClearFilters}
              testID="clear-all-filters"
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Match Mode Toggle */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Match Mode</Text>
              <Text style={styles.modalSectionDescription}>
                Choose how to match the selected tags
              </Text>
              
              <View style={styles.matchModeContainer}>
                <TouchableOpacity
                  style={[styles.matchModeButton, !matchAllTags && styles.matchModeButtonActive]}
                  onPress={() => setMatchAllTags(false)}
                  testID="match-any"
                >
                  <Text style={[styles.matchModeButtonText, !matchAllTags && styles.matchModeButtonTextActive]}>
                    ANY
                  </Text>
                  <Text style={styles.matchModeDescription}>
                    Show people with at least one selected tag
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.matchModeButton, matchAllTags && styles.matchModeButtonActive]}
                  onPress={() => setMatchAllTags(true)}
                  testID="match-all"
                >
                  <Text style={[styles.matchModeButtonText, matchAllTags && styles.matchModeButtonTextActive]}>
                    ALL
                  </Text>
                  <Text style={styles.matchModeDescription}>
                    Show people with every selected tag
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tag Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Select Tags</Text>
              <Text style={styles.modalSectionDescription}>
                Choose which tags to filter by
              </Text>
              
              {availableTags && availableTags.length > 0 ? (
                <View style={styles.tagSelectionContainer}>
                  {availableTags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[styles.tagSelectionItem, isSelected && styles.tagSelectionItemActive]}
                        onPress={() => handleToggleTag(tag.id)}
                        testID={`tag-filter-${tag.id}`}
                      >
                        <View style={styles.tagSelectionContent}>
                          <View style={[styles.tagColorIndicator, { backgroundColor: tag.color || '#6B7280' }]} />
                          <Text style={[styles.tagSelectionText, isSelected && styles.tagSelectionTextActive]}>
                            {tag.name}
                          </Text>
                          {tag.namespace && (
                            <Text style={styles.tagNamespace}>({tag.namespace})</Text>
                          )}
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

            {/* User Role Filter - Admin Only */}
            {isAdmin && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Filter by User Role</Text>
                <Text style={styles.modalSectionDescription}>
                  Show only people with specific account roles
                </Text>
                
                <View style={styles.userRoleFilterContainer}>
                  <TouchableOpacity
                    style={[styles.userRoleFilterButton, !selectedUserRole && styles.userRoleFilterButtonActive]}
                    onPress={() => setSelectedUserRole(null)}
                    testID="role-filter-all"
                  >
                    <Text style={[styles.userRoleFilterButtonText, !selectedUserRole && styles.userRoleFilterButtonTextActive]}>
                      All Users
                    </Text>
                  </TouchableOpacity>
                  
                  {(['pending', 'member', 'leader', 'admin'] as const).map((role) => {
                    const isActive = selectedUserRole === role;
                    return (
                      <TouchableOpacity
                        key={role}
                        style={[styles.userRoleFilterButton, isActive && styles.userRoleFilterButtonActive]}
                        onPress={() => setSelectedUserRole(role)}
                        testID={`role-filter-${role}`}
                      >
                        <Text style={[styles.userRoleFilterButtonText, isActive && styles.userRoleFilterButtonTextActive]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Results Preview */}
            {(selectedTagIds.length > 0 || selectedUserRole) && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Filter Results</Text>
                <View style={styles.resultsPreview}>
                  <Text style={styles.resultsText}>
                    {filteredData.length} {filteredData.length === 1 ? 'person' : 'people'} found
                  </Text>
                  <Text style={styles.resultsSubtext}>
                    {selectedTagIds.length > 0 && selectedUserRole ? (
                      `Matching ${matchAllTags ? 'all' : 'any'} of ${selectedTagIds.length} selected tag${selectedTagIds.length !== 1 ? 's' : ''} with ${selectedUserRole} role`
                    ) : selectedTagIds.length > 0 ? (
                      `Matching ${matchAllTags ? 'all' : 'any'} of ${selectedTagIds.length} selected tag${selectedTagIds.length !== 1 ? 's' : ''}`
                    ) : (
                      `With ${selectedUserRole} role`
                    )}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  familyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  familyHeader: {
    padding: 16,
  },
  familyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  familyPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  familyInfo: {
    flex: 1,
  },
  familyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  familyName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    flex: 1,
  },
  memberCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  familyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  membersContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  memberDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  memberDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  memberDetailLink: {
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },
  locationLink: {
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  modalSaveButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalSection: {
    marginTop: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalRowItem: {
    flex: 1,
  },
  familyPhotoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  activeTabText: {
    color: '#7C3AED',
    fontWeight: '600' as const,
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addMemberButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#7C3AED',
  },
  memberEditCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  memberEditHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  memberEditAvatarContainer: {
    marginRight: 12,
  },
  memberEditInfo: {
    flex: 1,
  },
  memberEditRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  memberEditRowItem: {
    flex: 1,
  },
  removeMemberButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  emptyMembersContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMembersText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyMembersSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  viewModeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  viewModeButtonTextActive: {
    color: '#FFFFFF',
  },
  personListContainer: {
    paddingHorizontal: 20,
  },
  personCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  personCardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  personAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  personFamily: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  personFamilyText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  personDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  personDetailText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  personDetailLink: {
    color: '#7C3AED',
    textDecorationLine: 'underline',
  },
  personNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  personEditButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  personAvatarContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#EF4444',
  },
  tagActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  modalPlaceholder: {
    width: 40,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#EDE9FE',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  activeFiltersContainer: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  activeFiltersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeFiltersTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500' as const,
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalSectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  userRoleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  userRoleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  userRoleButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  userRoleButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  userRoleButtonTextActive: {
    color: '#FFFFFF',
  },
  roleDescriptions: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  roleDescriptionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
    lineHeight: 18,
  },
  roleDescriptionBold: {
    fontWeight: '600' as const,
    color: '#374151',
  },
  matchModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  matchModeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  matchModeButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3F4F6',
  },
  matchModeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6B7280',
    marginBottom: 4,
  },
  matchModeButtonTextActive: {
    color: '#7C3AED',
  },
  matchModeDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  tagSelectionContainer: {
    gap: 8,
  },
  tagSelectionItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagSelectionItemActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F8FAFC',
  },
  tagSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  tagSelectionText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500' as const,
  },
  tagSelectionTextActive: {
    color: '#7C3AED',
  },
  tagNamespace: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  tagSelectionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagSelectionCheckText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyTagsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTagsText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyTagsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  resultsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  resultsSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  userRoleFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  userRoleFilterText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#7C3AED',
  },
  userRoleFilterRemove: {
    padding: 2,
  },
  userRoleFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userRoleFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  userRoleFilterButtonActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  userRoleFilterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#6B7280',
  },
  userRoleFilterButtonTextActive: {
    color: '#FFFFFF',
  },
  currentRoleDebug: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600' as const,
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 4,
  },
  memberTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  personTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
});