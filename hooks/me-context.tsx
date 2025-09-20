import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth-context';
import { getMyProfile, getMyPerson } from '@/services/tags';
import type { Database } from '@/types/supabase';
import { useMemo, useCallback } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Person = Database['public']['Tables']['persons']['Row'];

interface MeState {
  myRole: Profile['role'] | null;
  myPersonId: string | null;
  profile: Profile | null;
  person: Person | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const [MeProvider, useMe] = createContextHook<MeState>(() => {
  const { user } = useAuth();

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: getMyProfile,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const {
    data: personData,
    isLoading: personLoading,
    error: personError,
    refetch: refetchPerson
  } = useQuery({
    queryKey: ['my-person', user?.id],
    queryFn: async () => {
      try {
        return await getMyPerson();
      } catch {
        // For visitors/pending users, it's normal to not have a person record yet
        console.log('No person record found - this is normal for visitors');
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const isLoading = profileLoading || personLoading;
  const error = profileError || personError;

  const refetch = useCallback(() => {
    refetchProfile();
    refetchPerson();
  }, [refetchProfile, refetchPerson]);

  return useMemo(() => ({
    myRole: profileData?.role || null,
    myPersonId: personData?.id || null,
    profile: profileData || null,
    person: personData || null,
    isLoading,
    error: error as Error | null,
    refetch,
  }), [profileData, personData, isLoading, error, refetch]);
});