import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/types/supabase';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rwbppxcusppltwkcjmdu.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YnBweGN1c3BwbHR3a2NqbWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTkyMDUsImV4cCI6MjA3MzM5NTIwNX0.CRUgg_UhcGd1p6nyOR61gapct_Yvzm0S9vmjEvetdJM';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase env vars missing');
}

console.log('SB URL:', SUPABASE_URL);
// project ref is the subdomain slug:
console.log('SB project-ref:', SUPABASE_URL.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/)?.[1]);

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);