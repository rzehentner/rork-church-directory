import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHURCH_SETTINGS_KEY = 'church_settings';

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
  serviceTimes: [
    { day: 'Sunday', time: '10:00 AM', activity: 'Sunday School' },
    { day: 'Sunday', time: '11:00 AM', activity: 'Worship Service' },
    { day: 'Wednesday', time: '6:00 PM', activity: 'Mid-Week Bible Study' },
  ],
};

export const [ChurchSettingsProvider, useChurchSettings] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<ChurchSettings>(DEFAULT_SETTINGS);

  const settingsQuery = useQuery({
    queryKey: ['church-settings'],
    queryFn: async () => {
      console.log('📍 Loading church settings from AsyncStorage');
      const stored = await AsyncStorage.getItem(CHURCH_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChurchSettings;
        console.log('📍 Church settings loaded:', parsed.churchName || '(no name set)');
        return parsed;
      }
      return DEFAULT_SETTINGS;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (newSettings: ChurchSettings) => {
      console.log('💾 Saving church settings:', newSettings.churchName);
      await AsyncStorage.setItem(CHURCH_SETTINGS_KEY, JSON.stringify(newSettings));
      return newSettings;
    },
    onSuccess: (data) => {
      setSettings(data);
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
