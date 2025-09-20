import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/user-context';
import {
  Search,
  Users,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Crown,
  Heart,
  UserPlus,
  UserX,
} from 'lucide-react-native';
import type { Database } from '@/types/supabase';

type Person = Database['public']['Tables']['persons']['Row'];

interface FamilyWithMembers {
  id: string;
  family_name: string;
  family_name_display: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  home_phone?: string;
  members: Person[];
}

export default function JoinFamilyScreen() {
  const { joinFamily, replacePersonInFamily } = useUser();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithMembers | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    setIsLoading(true);
    try {
      // Get all families from the directory view (this respects RLS)
      const { data: directoryData, error: directoryError } = await supabase
        .from('family_directory_display')
        .select('*')
        .order('family_name_display', { nullsFirst: false });

      if (directoryError) {
        console.error('Error fetching directory:', directoryError);
        Alert.alert('Error', 'Failed to load families. Please contact your administrator.');
        return;
      }

      if (directoryData) {
        // Group directory entries by family
        const familyMap = new Map<string, FamilyWithMembers>();
        
        for (const entry of directoryData) {
          if (!entry.family_id) continue; // Skip unassigned entries
          
          if (!familyMap.has(entry.family_id)) {
            familyMap.set(entry.family_id, {
              id: entry.family_id,
              family_name: entry.family_name || 'Unknown Family',
              family_name_display: entry.family_name_display || entry.family_name || 'Unknown Family',
              address_street: entry.address_street || undefined,
              address_city: entry.address_city || undefined,
              address_state: entry.address_state || undefined,
              address_zip: entry.address_zip || undefined,
              home_phone: entry.home_phone || undefined,
              members: [],
            });
          }
          
          const family = familyMap.get(entry.family_id)!;
          family.members.push({
            id: entry.person_id!,
            user_id: entry.user_id,
            family_id: entry.family_id,
            first_name: entry.first_name || '',
            last_name: entry.last_name || '',
            email: entry.email,
            phone: entry.phone,
            date_of_birth: entry.date_of_birth,
            is_head_of_family: entry.is_head_of_family || false,
            is_spouse: entry.is_spouse || false,
            photo_url: entry.photo_url,
            created_at: '',
          });
        }
        
        setFamilies(Array.from(familyMap.values()));
      }
    } catch (error) {
      console.error('Error fetching families:', error);
      Alert.alert('Error', 'Failed to load families. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFamilies = families.filter(family => {
    const query = searchQuery.toLowerCase();
    return (
      family.family_name_display.toLowerCase().includes(query) ||
      family.members.some(member => 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      )
    );
  });

  const handleFamilySelect = (family: FamilyWithMembers) => {
    setSelectedFamily(family);
    setSelectedPerson(null);
  };

  const handlePersonSelect = (person: Person) => {
    setSelectedPerson(selectedPerson?.id === person.id ? null : person);
  };

  const handleJoinFamily = async () => {
    if (!selectedFamily) return;

    setIsJoining(true);
    try {
      if (selectedPerson) {
        // Replace existing person - we need to implement this functionality
        Alert.alert(
          'Replace Person',
          `Are you sure you want to replace ${selectedPerson.first_name} ${selectedPerson.last_name} in this family? This action cannot be undone.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                await handleReplacePerson();
              },
            },
          ]
        );
      } else {
        // Join as new member - need family join token
        Alert.alert(
          'Join Family',
          'To join this family as a new member, you need a join token from a family member.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'I have a token',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleReplacePerson = async () => {
    if (!selectedFamily || !selectedPerson) return;

    try {
      // Call the replace person function from user context
      const { error } = await replacePersonInFamily(selectedFamily.id, selectedPerson.id);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to replace person');
      } else {
        Alert.alert('Success', 'Successfully joined family!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error replacing person:', error);
      Alert.alert('Error', 'Failed to replace person');
    }
  };

  const formatAddress = (family: FamilyWithMembers) => {
    const parts = [
      family.address_street,
      family.address_city,
      family.address_state,
      family.address_zip,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  };

  const canReplacePerson = (person: Person) => {
    // Person can be replaced if they don't have a user_id (not associated with a profile)
    return !person.user_id;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Join Family', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading families...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{ 
          title: 'Join Family',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#7C3AED" />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search families or members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredFamilies.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No families found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search' : 'No families available to join'}
            </Text>
          </View>
        ) : (
          filteredFamilies.map((family) => (
            <TouchableOpacity
              key={family.id}
              style={[
                styles.familyCard,
                selectedFamily?.id === family.id && styles.selectedFamilyCard,
              ]}
              onPress={() => handleFamilySelect(family)}
            >
              <View style={styles.familyHeader}>
                <Text style={styles.familyName}>{family.family_name_display}</Text>
                <Text style={styles.memberCount}>{family.members.length} members</Text>
              </View>
              
              <Text style={styles.familyAddress}>{formatAddress(family)}</Text>
              
              {family.home_phone && (
                <View style={styles.familyDetail}>
                  <Phone size={14} color="#9CA3AF" />
                  <Text style={styles.familyDetailText}>{family.home_phone}</Text>
                </View>
              )}

              {selectedFamily?.id === family.id && (
                <View style={styles.membersSection}>
                  <Text style={styles.membersTitle}>Family Members</Text>
                  <Text style={styles.membersSubtitle}>
                    Select a person to replace (only available for members without accounts)
                  </Text>
                  
                  {family.members.map((member) => {
                    const canReplace = canReplacePerson(member);
                    const isSelected = selectedPerson?.id === member.id;
                    
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.memberItem,
                          !canReplace && styles.memberItemDisabled,
                          isSelected && styles.selectedMemberItem,
                        ]}
                        onPress={() => canReplace && handlePersonSelect(member)}
                        disabled={!canReplace}
                      >
                        <View style={styles.memberAvatar}>
                          <User size={20} color={canReplace ? '#9CA3AF' : '#D1D5DB'} />
                        </View>
                        
                        <View style={styles.memberInfo}>
                          <View style={styles.memberNameRow}>
                            <Text style={[
                              styles.memberName,
                              !canReplace && styles.memberNameDisabled,
                            ]}>
                              {member.first_name} {member.last_name}
                            </Text>
                            {member.is_head_of_family && (
                              <Crown size={14} color="#F59E0B" />
                            )}
                            {member.is_spouse && (
                              <Heart size={14} color="#EC4899" />
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
                          
                          <View style={styles.memberStatus}>
                            {canReplace ? (
                              <View style={styles.statusBadge}>
                                <UserX size={12} color="#F59E0B" />
                                <Text style={styles.statusText}>Can replace</Text>
                              </View>
                            ) : (
                              <View style={[styles.statusBadge, styles.statusBadgeDisabled]}>
                                <UserPlus size={12} color="#9CA3AF" />
                                <Text style={[styles.statusText, styles.statusTextDisabled]}>Has account</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedFamily && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.joinButton,
              (!selectedFamily || isJoining) && styles.joinButtonDisabled,
            ]}
            onPress={handleJoinFamily}
            disabled={!selectedFamily || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.joinButtonText}>
                  {selectedPerson ? 'Replace Person' : 'Join as New Member'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  backButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedFamilyCard: {
    borderColor: '#7C3AED',
    backgroundColor: '#F8FAFF',
  },
  familyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  familyAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  familyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  familyDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  membersSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  membersSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberItemDisabled: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  selectedMemberItem: {
    borderColor: '#7C3AED',
    backgroundColor: '#F8FAFF',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  memberNameDisabled: {
    color: '#9CA3AF',
  },
  memberDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  memberStatus: {
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeDisabled: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#92400E',
  },
  statusTextDisabled: {
    color: '#9CA3AF',
  },
  actionContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});