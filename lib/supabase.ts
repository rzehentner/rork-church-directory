import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/types/supabase';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rwbppxcusppltwkcjmdu.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YnBweGN1c3BwbHR3a2NqbWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTkyMDUsImV4cCI6MjA3MzM5NTIwNX0.CRUgg_UhcGd1p6nyOR61gapct_Yvzm0S9vmjEvetdJM';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase env vars missing');
}



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

// Debug functions for troubleshooting
export async function debugSupabase() {
  console.log('🔧 Debugging Supabase connection...');
  console.log('🌐 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Supabase Key (first 20 chars):', SUPABASE_ANON_KEY.substring(0, 20) + '...');
  
  // Extract project ref from URL
  const projectRef = SUPABASE_URL.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co/)?.[1];
  console.log('📋 Project ref:', projectRef || 'Could not extract');
  
  // Test basic connection
  const { data: user, error: userError } = await supabase.auth.getUser();
  console.log('👤 Current user:', user?.user?.id || 'none');
  console.log('❌ User error:', userError?.message || 'none');
  
  // Test storage connection
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  console.log('🪣 Available buckets:', buckets?.map(b => b.name) || 'none');
  console.log('❌ List buckets error:', listError?.message || 'none');
  
  // Test specific bucket
  const { data: files, error: bucketError } = await supabase.storage
    .from('event-images')
    .list('', { limit: 1 });
  console.log('📁 Bucket access test:', files ? 'success' : 'failed');
  console.log('❌ Bucket error:', bucketError?.message || 'none');
  
  return { 
    projectRef,
    buckets: buckets?.map(b => b.name), 
    listError: listError?.message, 
    bucketError: bucketError?.message,
    userError: userError?.message,
    userId: user?.user?.id
  };
}

export async function testStorageUpload(eventId: string) {
  console.log('🧪 Testing storage upload...');
  
  const testPath = `events/${eventId}/${Date.now()}-test.txt`;
  const testBlob = new Blob(['test content'], { type: 'text/plain' });
  
  const { data, error } = await supabase.storage
    .from('event-images')
    .upload(testPath, testBlob, { upsert: false });
  
  console.log('📤 Direct test result:', { data, error: error?.message });
  
  return { data, error: error?.message, testPath };
}

export async function runDiagnosticProbe(eventId: string, fileUri?: string) {
  const out: Record<string, any> = { eventId };
  
  // Session?
  const { data: session } = await supabase.auth.getSession();
  out.authSession = !!session?.session;
  out.userId = session?.session?.user?.id ?? null;
  
  // Can we see the event row?
  const { data: evt, error: evtErr } = await supabase
    .from('events').select('id').eq('id', eventId).maybeSingle();
  out.eventRow = !!evt;
  out.eventError = evtErr?.message ?? null;
  
  // Try a tiny text upload (no image quirks)
  const testPath = `events/${eventId}/${Date.now()}-probe.txt`;
  const body = new Blob(['probe'], { type: 'text/plain' });
  const { error: probeErr } = await supabase.storage
    .from('event-images')
    .upload(testPath, body, { upsert: false, contentType: 'text/plain' });
  out.storageProbeOk = !probeErr;
  out.storageProbeErr = probeErr?.message ?? null;
  
  // Try the events update using the test path
  const { error: updErr } = await supabase
    .from('events')
    .update({ image_path: testPath })
    .eq('id', eventId);
  out.eventsUpdateOk = !updErr;
  out.eventsUpdateErr = updErr?.message ?? null;
  
  // Try turning the image URI into a blob (to catch content:// / HEIC issues)
  if (fileUri) {
    try {
      const resp = await fetch(fileUri);
      const blob = await resp.blob();
      out.imageBlob = { size: blob.size, type: blob.type || '(empty)' };
    } catch (e: any) {
      out.imageBlob = { error: String(e) };
    }
  }
  
  console.log('🔍 Diagnostic probe results:', out);
  return out;
}