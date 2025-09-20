import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/auth-context';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Person = Database['public']['Tables']['persons']['Row'];
type Family = Database['public']['Tables']['families']['Row'];

interface UserState {
  profile: Profile | null;
  person: Person | null;
  family: Family | null;
  familyMembers: Person[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  updatePerson: (updates: Partial<Person>) => Promise<{ error: Error | null }>;
  updateFamily: (updates: Partial<Family>) => Promise<{ error: Error | null }>;
  createFamily: (familyData: any) => Promise<{ familyId: string | null; error: Error | null }>;
  joinFamily: (token: string) => Promise<{ familyId: string | null; error: Error | null }>;
  replacePersonInFamily: (familyId: string, personIdToReplace: string) => Promise<{ error: Error | null }>;
}

export const [UserProvider, useUser] = createContextHook<UserState>(() => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user) {
      setProfile(null);
      setPerson(null);
      setFamily(null);
      setFamilyMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('🔍 Fetching user data for:', user.email, 'ID:', user.id);
    console.log('🔍 Current timestamp:', new Date().toISOString());

    try {
      // Fetch profile
      const profileResponse = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('📋 Profile response:', profileResponse);
      setProfile(profileResponse.data);

      // Fetch person
      const personResponse = await supabase
        .from('persons')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('👤 Person response:', personResponse);
      setPerson(personResponse.data);

      // Fetch family and members if person has family_id
      if (personResponse.data?.family_id) {
        console.log('👨‍👩‍👧‍👦 Person has family_id:', personResponse.data.family_id);
        
        const familyResponse = await supabase
          .from('families')
          .select('*, photo_path')
          .eq('id', personResponse.data.family_id)
          .single();
        
        console.log('🏠 Family response:', familyResponse);
        setFamily(familyResponse.data);

        const membersResponse = await supabase
          .from('persons')
          .select('*')
          .eq('family_id', personResponse.data.family_id)
          .order('is_head_of_family', { ascending: false })
          .order('is_spouse', { ascending: false })
          .order('date_of_birth', { ascending: true });
        
        console.log('👥 Family members response:', membersResponse);
        setFamilyMembers(membersResponse.data || []);
      } else {
        console.log('❌ No family_id found for person');
        setFamily(null);
        setFamilyMembers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const updatePerson = async (updates: Partial<Person>) => {
    if (!person) return { error: new Error('No person record found') };

    const { error } = await supabase
      .from('persons')
      .update(updates)
      .eq('id', person.id);

    if (!error) {
      await fetchUserData();
    }

    return { error };
  };

  const updateFamily = async (updates: Partial<Family>) => {
    if (!family) return { error: new Error('No family record found') };

    const { error } = await supabase
      .from('families')
      .update(updates)
      .eq('id', family.id);

    if (!error) {
      await fetchUserData();
    }

    return { error };
  };

  const createFamily = async (familyData: any) => {
    console.log('🏗️ Creating family with data:', familyData);
    const response = await supabase.rpc('create_family_for_self', familyData);
    console.log('🏗️ Create family response:', response);
    
    if (!response.error && response.data) {
      console.log('✅ Family created successfully, refetching user data...');
      await fetchUserData();
    } else {
      console.log('❌ Family creation failed:', response.error);
    }

    return { familyId: response.data, error: response.error };
  };

  const joinFamily = async (token: string) => {
    const { data, error } = await supabase.rpc('join_family_with_token', { p_token: token });
    
    if (!error && data) {
      await fetchUserData();
    }

    return { familyId: data, error };
  };

  const replacePersonInFamily = async (familyId: string, personIdToReplace: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      // First, delete the person to be replaced
      const { error: deleteError } = await supabase
        .from('persons')
        .delete()
        .eq('id', personIdToReplace)
        .is('user_id', null); // Only delete if no user is associated

      if (deleteError) {
        return { error: deleteError };
      }

      // Then update the current user's person record to join the family
      if (person) {
        const { error: updateError } = await supabase
          .from('persons')
          .update({ family_id: familyId })
          .eq('id', person.id);

        if (updateError) {
          return { error: updateError };
        }
      } else {
        // If no person record exists, we need to create one
        // This shouldn't happen in normal flow, but handle it just in case
        return { error: new Error('No person record found for current user') };
      }

      // Refresh user data
      await fetchUserData();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return {
    profile,
    person,
    family,
    familyMembers,
    isLoading,
    refetch: fetchUserData,
    updatePerson,
    updateFamily,
    createFamily,
    joinFamily,
    replacePersonInFamily,
  };
});