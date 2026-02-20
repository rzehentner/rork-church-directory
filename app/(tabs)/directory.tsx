import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
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
          
          // Transform to match expected format and filter out invalid records
          viewData = personsData?.filter((person: any) => {
            // Only include persons with valid IDs and valid family relationships
            const hasValidId = person.id && 
                              person.id !== 'null' && 
                              person.id !== 'undefined' && 
                              typeof person.id === 'string' &&
                              person.id.trim() !== '' &&
                              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person.id);
            
            // Also validate family_id if it exists
            const hasValidFamilyId = !person.family_id || (
              person.family_id !== 'null' && 
              person.family_id !== 'undefined' && 
              typeof person.family_id === 'string' &&
              person.family_id.trim() !== '' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person.family_id)
            );
            
            // Validate families data if it exists
            const hasValidFamilyData = !person.families || (
              person.families.id && 
              person.families.id !== 'null' && 
              person.families.id !== 'undefined' && 
              typeof person.families.id === 'string' &&
              person.families.id.trim() !== '' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person.families.id)
            );
            
            const isValid = hasValidId && hasValidFamilyId && hasValidFamilyData;
            
            if (!isValid) {
              console.warn('⚠️ Filtering out person with invalid data:', {
                id: person.id,
                family_id: person.family_id,
                families_id: person.families?.id,
                first_name: person.first_name,
                last_name: person.last_name,
                hasValidId,
                hasValidFamilyId,
                hasValidFamilyData
              });
            }
            
            return isValid;
          }).map((person: any) => ({
            person_id: person.id,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            phone: person.phone,
            photo_url: person.photo_url,
            is_head_of_family: person.is_head_of_family,
            is_spouse: person.is_spouse,
            family_role: person.family_role || (person.is_head_of_family ? 'head' : person.is_spouse ? 'spouse' : 'other'),
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
        // Use the actual database function to find people by tags
        const personIds = await findPeopleByTags(selectedTagIds, matchAllTags);
        setFilteredPersonIds(personIds || []);
      } catch (error) {
        console.error('❌ Error filtering by tags:', error);
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
      // Validate entry has required fields
      if (!entry || !entry.person_id) {
        console.warn('⚠️ Skipping invalid entry:', entry);
        return false;
      }

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
        // Check if this person is in the admin users list (which is already filtered by role)
        const isInAdminList = adminUsersList.some(adminUser => 
          adminUser.person_id === entry.person_id
        );
        
        if (!isInAdminList) {
          return false;
        }
      }
      
      return matchesSearch;
    });

    return filtered;
  }, [directoryData, searchQuery, selectedTagIds, filteredPersonIds, selectedUserRole, isAdmin, adminUsersList]);

  // Load tags for all visible people
  useEffect(() => {
    const loadPersonTags = async () => {
      if (!filteredData || filteredData.length === 0) {
        setPersonTags({});
        return;
      }
      
      try {
        // Pre-filter people with valid IDs to avoid making invalid API calls
        const validPeople = filteredData.filter(person => {
          const isValid = person?.person_id && 
                         person.person_id !== 'null' && 
                         person.person_id !== 'undefined' && 
                         typeof person.person_id === 'string' &&
                         person.person_id.trim() !== '' &&
                         person.person_id !== 'invalid' &&
                         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person.person_id);
          
          return isValid;
        });
        
        // If no valid people, clear tags and return
        if (validPeople.length === 0) {
          setPersonTags({});
          return;
        }
        
        // Limit concurrent requests to prevent overwhelming the server
        const batchSize = 10;
        const newPersonTags: Record<string, Tag[]> = {};
        
        for (let i = 0; i < validPeople.length; i += batchSize) {
          const batch = validPeople.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (person) => {
            try {
              const personWithTags = await getPersonWithTags(person.person_id);
              return {
                personId: person.person_id,
                tags: personWithTags.tags || []
              };
            } catch (error) {
              return {
                personId: person.person_id,
                tags: []
              };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(({ personId, tags }) => {
            if (personId && personId !== 'null' && personId !== 'undefined') {
              newPersonTags[personId] = tags;
            }
          });
        }
        
        setPersonTags(newPersonTags);
      } catch (error) {
        console.error('❌ Error loading person tags:', error);
        setPersonTags({});
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
              console.log('🗑️ Starting family deletion via RPC:', editingFamily.id);
              
              const { error: rpcError } = await supabase.rpc('admin_delete_family', {
                p_family_id: editingFamily.id,
              });
              
              if (rpcError) {
                console.error('❌ admin_delete_family RPC error:', rpcError);
                throw rpcError;
              }
              
              const { data: checkFamily } = await supabase
                .from('families')
                .select('id')
                .eq('id', editingFamily.id)
                .maybeSingle();
              
              if (checkFamily) {
                console.error('❌ Family still exists after RPC delete');
                Alert.alert(
                  'Delete Failed',
                  'The family could not be deleted. Please check your database RPC function.'
                );
                return;
              }
              
              console.log('✅ Family deleted successfully:', editingFamily.id);
              
              queryClient.invalidateQueries({ queryKey: ['directory'] });
              
              setIsEditModalVisible(false);
              setEditingFamily(null);
              setEditingMembers([]);
              
              Alert.alert('Success', 'Family deleted successfully.');
            } catch (error) {
              console.error('❌ Error deleting family:', error);
              const message = error instanceof Error ? error.message : 'Failed to delete family. Please try again.';
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
              is_head_of_family: member.family_role === 'head',
              is_spouse: member.family_role === 'spouse',
              family_role: member.family_role,
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
      family_role: 'other',
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
      family_role: person.family_role || 'other',
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
          family_role: personData.family_role || (personData.is_head_of_family ? 'head' as const : personData.is_spouse ? 'spouse' as const : 'other' as const),
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
          is_head_of_family: editingPerson.family_role === 'head',
          is_spouse: editingPerson.family_role === 'spouse',
          family_role: editingPerson.family_role,
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
              console.log('🗑️ Starting person deletion via RPC:', editingPerson.id);
              
              const { error: rpcError } = await supabase.rpc('admin_delete_person', {
                p_person_id: editingPerson.id,
              });
              
              if (rpcError) {
                console.error('❌ admin_delete_person RPC error:', rpcError);
                throw rpcError;
              }
              
              const { data: checkPerson } = await supabase
                .from('persons')
                .select('id')
                .eq('id', editingPerson.id)
                .maybeSingle();
              
              if (checkPerson) {
                console.error('❌ Person still exists after RPC delete');
                Alert.alert(
                  'Delete Failed',
                  'The person could not be deleted. Please check your database RPC function.'
                );
                return;
              }
              
              console.log('✅ Person deleted successfully:', editingPerson.id);
              
              queryClient.invalidateQueries({ queryKey: ['directory'] });
              
              setIsEditPersonModalVisible(false);
              setEditingPerson(null);
              
              Alert.alert('Success', 'Person deleted successfully.');
            } catch (error) {
              console.error('❌ Error deleting person:', error);
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {viewMode === 'family' ? (
          // Family View
          Object.entries(groupedFamilies).map(([familyKey, members]) => {
          if (!members || members.length === 0) return null;
          
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
                  {!isUnassigned && familyInfo.family_id && familyImages.familyPhotos[familyInfo.family_id] && familyImages.familyPhotos[familyInfo.family_id]!.trim() !== '' ? (
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
                  {members.filter(member => member?.person_id).map((member) => (
                    <View key={member.person_id} style={styles.memberCard}>
                      {/* Member Avatar */}
                      {familyImages.memberAvatars[member.person_id] && familyImages.memberAvatars[member.person_id]!.trim() !== '' ? (
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
                          {member.family_role === 'head' && ' (Head)'}
                          {member.family_role === 'spouse' && ' (Spouse)'}
                          {member.family_role === 'child' && ' (Child)'}
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
            {sortedPersons.filter(person => person?.person_id).map((person) => (
              <View key={person.person_id} style={styles.personCard}>
                <View style={styles.personCardContent}>
                  {/* Person Avatar */}
                  {familyImages.memberAvatars[person.person_id] && familyImages.memberAvatars[person.person_id]!.trim() !== '' ? (
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
            ))}
          </View>
        )}
      </ScrollView>

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
