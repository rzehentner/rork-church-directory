import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { isValidUUID } from '@/utils/validation';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Person = Database['public']['Tables']['persons']['Row'];

export interface Tag {
  id: string;
  name: string;
  namespace?: string;
  color?: string;
  description?: string;
  self_assignable: boolean;
  assign_min_role: 'member' | 'leader' | 'admin';
  is_active: boolean;
  parent_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface PersonWithTags extends Person {
  tags: Tag[];
}

export async function listTags(activeOnly: boolean = false): Promise<Tag[]> {
  let query = supabase.from('tags').select('*').order('name');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getMyProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error) throw error;
  return data;
}

export async function getMyPerson(): Promise<Person> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { data, error } = await supabase.from('persons').select('*').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No person record found');
  return data;
}

export async function getPersonWithTags(personId: string): Promise<PersonWithTags> {
  if (!isValidUUID(personId)) throw new Error('Invalid person ID');

  const { data: person, error: personError } = await supabase.from('persons').select('*').eq('id', personId).single();
  if (personError) throw personError;
  if (!person) throw new Error('Person not found');

  const { data: personWithTagsData, error: tagsError } = await supabase
    .from('person_with_tags')
    .select('*')
    .eq('id', personId)
    .maybeSingle();

  let tags: Tag[] = [];
  if (!tagsError && personWithTagsData?.tag_names && Array.isArray(personWithTagsData.tag_names)) {
    const { data: tagDetails, error: tagDetailsError } = await supabase
      .from('tags')
      .select('*')
      .in('name', personWithTagsData.tag_names)
      .eq('is_active', true);
    if (!tagDetailsError) tags = tagDetails || [];
  }

  return { ...person, tags };
}

export async function addTagToPerson(personId: string, tagId: string): Promise<void> {
  const { data: tag, error: tagError } = await supabase.from('tags').select('name').eq('id', tagId).single();
  if (tagError || !tag) throw new Error('Tag not found');

  const { error } = await supabase.rpc('tag_subject', {
    p_kind: 'person',
    p_subject_id: personId,
    p_tag_name: tag.name
  });
  if (error) throw error;
}

export async function removeTagFromPerson(personId: string, tagId: string): Promise<void> {
  const { data: tag, error: tagError } = await supabase.from('tags').select('name').eq('id', tagId).single();
  if (tagError || !tag) throw new Error('Tag not found');

  const { error } = await supabase.rpc('untag_subject', {
    p_kind: 'person',
    p_subject_id: personId,
    p_tag_name: tag.name
  });
  if (error) throw error;
}

export async function findPeopleByTags(tagIds: string[], matchAll: boolean = false): Promise<string[]> {
  if (tagIds.length === 0) return [];

  const { data: tags, error: tagError } = await supabase.from('tags').select('name').in('id', tagIds);
  if (tagError || !tags) throw tagError || new Error('Failed to fetch tag names');

  const tagNames = tags.map(t => t.name);
  const { data, error } = await supabase.rpc('get_subjects_by_tags', {
    p_kind: 'person',
    p_tag_names: tagNames,
    p_match_all: matchAll
  });
  if (error) throw error;

  return (data || []).map((result: any) => {
    if (typeof result === 'object' && result.subject_id) return String(result.subject_id);
    return String(result);
  }).filter((id: string) => id && id !== 'null' && id !== 'undefined');
}

export async function createTag(tagData: {
  name: string;
  namespace?: string;
  color?: string;
  description?: string;
  parent_id?: string;
  self_assignable?: boolean;
  assign_min_role?: 'member' | 'leader' | 'admin';
}): Promise<Tag> {
  const name = tagData.name?.trim();
  if (!name || name.length === 0) throw new Error('Tag name is required');
  if (name.length > 100) throw new Error('Tag name is too long (max 100 characters)');

  const { data, error } = await supabase
    .from('tags')
    .insert({
      name,
      namespace: tagData.namespace?.trim() || null,
      color: tagData.color || '#6B7280',
      description: tagData.description?.trim() || null,
      parent_id: tagData.parent_id || null,
      self_assignable: tagData.self_assignable ?? false,
      assign_min_role: tagData.assign_min_role ?? 'admin',
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No data returned from tag creation');
  return data as Tag;
}

export async function updateTag(tagId: string, updates: {
  self_assignable?: boolean;
  assign_min_role?: 'member' | 'leader' | 'admin';
  is_active?: boolean;
  name?: string;
  color?: string;
  description?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tagId);
  if (error) throw error;
}

export async function deleteTag(tagId: string, hardDelete: boolean = false): Promise<void> {
  if (hardDelete) {
    const { error } = await supabase.from('tags').delete().eq('id', tagId);
    if (error) throw error;
  } else {
    await updateTag(tagId, { is_active: false });
  }
}

export async function reactivateTag(tagId: string): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', tagId);
  if (error) throw error;
}
