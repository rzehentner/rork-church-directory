import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ServiceTime {
  day: string;
  time: string;
  activity: string;
}

export interface ChurchSettings {
  churchName: string;
  pastorName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  serviceTimes: ServiceTime[];
}

interface DbServiceTime {
  day: string;
  time: string;
  label: string;
}

interface DbChurchSettings {
  id: string;
  name: string | null;
  pastor: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service_times: DbServiceTime[] | null;
  updated_at: string | null;
}

const DEFAULT_SETTINGS: ChurchSettings = {
  churchName: '',
  pastorName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  email: '',
  website: '',
  serviceTimes: [],
};

function mapDbToSettings(row: DbChurchSettings): ChurchSettings & { _id: string } {
  const serviceTimes: ServiceTime[] = Array.isArray(row.service_times)
    ? row.service_times.map((st: DbServiceTime) => ({
        day: st.day || '',
        time: st.time || '',
        activity: st.label || '',
      }))
    : [];

  return {
    _id: row.id,
    churchName: row.name || '',
    pastorName: row.pastor || '',
    address: row.address_street || '',
    city: row.address_city || '',
    state: row.address_state || '',
    zip: row.address_zip || '',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    serviceTimes,
  };
}

function mapSettingsToDb(settings: ChurchSettings): Record<string, unknown> {
  return {
    name: settings.churchName || null,
    pastor: settings.pastorName || null,
    address_street: settings.address || null,
    address_city: settings.city || null,
    address_state: settings.state || null,
    address_zip: settings.zip || null,
    phone: settings.phone || null,
    email: settings.email || null,
    website: settings.website || null,
    service_times: settings.serviceTimes.map((st) => ({
      day: st.day,
      time: st.time,
      label: st.activity,
    })),
  };
}

export const [ChurchSettingsProvider, useChurchSettings] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ChurchSettings>(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['church-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('church_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        return null;
      }

      return data as DbChurchSettings;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      const mapped = mapDbToSettings(settingsQuery.data);
      setSettingsId(mapped._id);
      const { _id, ...rest } = mapped;
      setSettings(rest);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: ChurchSettings) => {
      if (!settingsId) {
        throw new Error('Church settings not loaded yet');
      }

      const dbPayload = mapSettingsToDb(newSettings);

      const { data, error } = await supabase
        .from('church_settings')
        .update(dbPayload)
        .eq('id', settingsId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as DbChurchSettings;
    },
    onSuccess: (data) => {
      const mapped = mapDbToSettings(data);
      const { _id, ...rest } = mapped;
      setSettings(rest);
      queryClient.setQueryData(['church-settings'], data);
    },
  });

  const updateSettings = useCallback((updates: Partial<ChurchSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    saveMutation.mutate(updated);
  }, [settings, saveMutation]);

  const updateServiceTimes = useCallback((serviceTimes: ServiceTime[]) => {
    const updated = { ...settings, serviceTimes };
    setSettings(updated);
    saveMutation.mutate(updated);
  }, [settings, saveMutation]);

  const formattedAddress = settings.address
    ? [settings.address, settings.city, settings.state, settings.zip].filter(Boolean).join(', ')
    : '';

  return {
    settings,
    isLoading: settingsQuery.isLoading,
    isSaving: saveMutation.isPending,
    updateSettings,
    updateServiceTimes,
    formattedAddress,
  };
});
