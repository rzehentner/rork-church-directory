import { supabase } from '@/lib/supabase';

type PrayerStatus = 'open' | 'answered' | 'archived';

export interface PrayerRequest {
  id: string;
  subject: string;
  details: string | null;
  for_person_id: string | null;
  created_by: string;
  status: PrayerStatus;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  total_prayers: number;
  last_prayed_at: string | null;
  i_prayed_today: boolean;
  is_owner: boolean;
}

export async function listPrayers(status: PrayerStatus = 'open', limit = 100) {
  const { data, error } = await supabase
    .from('prayer_requests_with_counts')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PrayerRequest[];
}

export async function getPrayer(id: string) {
  const { data, error } = await supabase
    .from('prayer_requests_with_counts')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PrayerRequest;
}

export async function createPrayer(input: {
  subject: string;
  details?: string | null;
  for_person_id?: string | null;
  is_anonymous?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert([{
      subject: input.subject,
      details: input.details ?? null,
      for_person_id: input.for_person_id ?? null,
      is_anonymous: !!input.is_anonymous,
      created_by: user.id,
    }])
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updatePrayer(id: string, patch: {
  subject?: string;
  details?: string | null;
  status?: PrayerStatus;
  for_person_id?: string | null;
  is_anonymous?: boolean;
}) {
  const { error } = await supabase
    .from('prayer_requests')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePrayer(id: string) {
  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function markPrayed(id: string) {
  const { data, error } = await supabase.rpc('mark_prayed', { p_prayer_id: id });
  if (error) throw error;
  return !!data;
}

export async function unmarkPrayedToday(id: string) {
  const { data, error } = await supabase.rpc('unmark_prayed_today', { p_prayer_id: id });
  if (error) throw error;
  return !!data;
}
