import { createPublicClient } from './supabase';
import type { ChurchSettings, PublicEvent, PublicAnnouncement, WebsiteContent, WebsitePage, HeroImage, StaffMember } from '@/types';

export async function getChurchSettings(): Promise<ChurchSettings | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('church_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ChurchSettings;
}

export async function getUpcomingEvents(limit = 20): Promise<PublicEvent[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, location, start_at, end_at, is_all_day, image_path')
    .eq('is_public', true)
    .eq('is_archived', false)
    .gte('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as PublicEvent[];
}

export async function getEvent(id: string): Promise<PublicEvent | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, location, start_at, end_at, is_all_day, image_path')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicEvent;
}

export async function getPublicAnnouncements(limit = 20): Promise<PublicAnnouncement[]> {
  const supabase = createPublicClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, image_path, published_at')
    .eq('is_public', true)
    .eq('is_published', true)
    .lte('published_at', now)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as PublicAnnouncement[];
}

export async function getContentMap(): Promise<Record<string, string>> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('website_content')
    .select('key, value');

  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    map[row.key] = row.value;
  }
  return map;
}

export async function getAllContent(): Promise<WebsiteContent[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('website_content')
    .select('*')
    .order('key');

  if (error) return [];
  return (data ?? []) as WebsiteContent[];
}

export async function getNavPages(): Promise<WebsitePage[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('website_pages')
    .select('slug, title, sort_order')
    .eq('is_published', true)
    .eq('show_in_nav', true)
    .order('sort_order', { ascending: true });

  if (error) return [];
  return (data ?? []) as WebsitePage[];
}

export async function getPageBySlug(slug: string): Promise<WebsitePage | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('website_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as WebsitePage;
}

export async function getHeroImages(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('hero_images')
    .select('image_path')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return data.map(row => `${url}/storage/v1/object/public/website-images/${row.image_path}`);
}

export async function getAllPages(): Promise<WebsitePage[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('website_pages')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return [];
  return (data ?? []) as WebsitePage[];
}

export async function getStaff(): Promise<StaffMember[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('public_staff')
    .select('*')
    .order('sort_order');

  if (error) return [];
  return (data ?? []) as StaffMember[];
}
