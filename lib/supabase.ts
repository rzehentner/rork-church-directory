import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/types/supabase';

const supabaseUrl = 'https://rwbppxcusppltwkcjmdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YnBweGN1c3BwbHR3a2NqbWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTkyMDUsImV4cCI6MjA3MzM5NTIwNX0.CRUgg_UhcGd1p6nyOR61gapct_Yvzm0S9vmjEvetdJM';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);