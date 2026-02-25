import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPerson(null);
      setFamily(null);
      setFamilyMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [profileResponse, personResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('persons')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      setProfile(profileResponse.data);
      setPerson(personResponse.data);

      if (personResponse.data?.family_id) {
        const [familyResponse, membersResponse] = await Promise.all([
          supabase
            .from('families')
            .select('*, photo_path')
            .eq('id', personResponse.data.family_id)
            .single(),
          supabase
            .from('persons')
            .select('*')
            .eq('family_id', personResponse.data.family_id)
            .order('family_role', { ascending: true })
            .order('date_of_birth', { ascending: true })
        ]);

        setFamily(familyResponse.data);
        setFamilyMembers(membersResponse.data || []);
      } else {
        setFamily(null);
        setFamilyMembers([]);
      }
    } catch {
      setProfile(null);
      setPerson(null);
      setFamily(null);
      setFamilyMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const updatePerson = useCallback(async (updates: Partial<Person>) => {
    if (!person) return { error: new Error('No person record found') };

    const { error } = await supabase
      .from('persons')
      .update(updates)
      .eq('id', person.id);

    if (!error) {
      await fetchUserData();
    }

    return { error };
  }, [person, fetchUserData]);

  const updateFamily = useCallback(async (updates: Partial<Family>) => {
    if (!family) return { error: new Error('No family record found') };

    const { error } = await supabase
      .from('families')
      .update(updates)
      .eq('id', family.id);

    if (!error) {
      await fetchUserData();
    }

    return { error };
  }, [family, fetchUserData]);

  const createFamily = useCallback(async (familyData: any) => {
    const response = await supabase.rpc('create_family_for_self', familyData);

    if (!response.error && response.data) {
      await fetchUserData();
    }

    return { familyId: response.data, error: response.error };
  }, [fetchUserData]);

  const joinFamily = useCallback(async (token: string) => {
    const { data, error } = await supabase.rpc('join_family_with_token', { p_token: token });

    if (!error && data) {
      await fetchUserData();
    }

    return { familyId: data, error };
  }, [fetchUserData]);

  const replacePersonInFamily = useCallback(async (familyId: string, personIdToReplace: string) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { error: deleteError } = await supabase
        .from('persons')
        .delete()
        .eq('id', personIdToReplace)
        .is('user_id', null);

      if (deleteError) {
        return { error: deleteError };
      }

      if (person) {
        const { error: updateError } = await supabase
          .from('persons')
          .update({ family_id: familyId })
          .eq('id', person.id);

        if (updateError) {
          return { error: updateError };
        }
      } else {
        return { error: new Error('No person record found for current user') };
      }

      await fetchUserData();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }, [user, person, fetchUserData]);

  return useMemo(() => ({
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
  }), [
    profile,
    person,
    family,
    familyMembers,
    isLoading,
    fetchUserData,
    updatePerson,
    updateFamily,
    createFamily,
    joinFamily,
    replacePersonInFamily,
  ]);
});
