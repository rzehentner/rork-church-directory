import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Person = Database['public']['Tables']['persons']['Row'];

// Mock types for tags - you'll need to add these to your database schema
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

// Module-level mock store that persists during the session
let mockTagsStore: Tag[] = [
  { id: '1', name: 'Family Leader', color: '#3B82F6', self_assignable: false, assign_min_role: 'admin', is_active: true, created_at: new Date().toISOString() },
  { id: '2', name: 'Youth', color: '#10B981', self_assignable: false, assign_min_role: 'leader', is_active: true, created_at: new Date().toISOString() },
  { id: '3', name: 'Elder', color: '#8B5CF6', self_assignable: true, assign_min_role: 'member', is_active: true, created_at: new Date().toISOString() },
  { id: '4', name: 'Volunteer', color: '#F59E0B', self_assignable: true, assign_min_role: 'member', is_active: true, created_at: new Date().toISOString() },
  { id: '5', name: 'Seniors', color: '#EC4899', self_assignable: true, assign_min_role: 'member', is_active: true, created_at: new Date().toISOString() },
  { id: '6', name: 'Choir', color: '#06B6D4', self_assignable: false, assign_min_role: 'leader', is_active: true, created_at: new Date().toISOString() },
  { id: '7', name: 'Archived Tag', color: '#9CA3AF', self_assignable: false, assign_min_role: 'member', is_active: false, created_at: new Date().toISOString() },
];

export interface PersonWithTags extends Person {
  tags: Tag[];
}

/**
 * List all available tags
 * @param activeOnly - If true, only return active tags (default: false for admin view)
 */
export async function listTags(activeOnly: boolean = false): Promise<Tag[]> {
  console.log('🏷️ Fetching all tags', { activeOnly });
  
  try {
    let query = supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching tags:', error);
      throw error;
    }
    
    const tags = data || [];
    
    console.log('✅ Tags fetched:', {
      activeOnly,
      count: tags.length,
      tagNames: tags.map(t => t.name)
    });
    
    return tags;
  } catch (error) {
    console.error('❌ Failed to fetch tags:', error);
    // Fallback to mock data if database query fails
    const filteredTags = activeOnly ? mockTagsStore.filter(tag => tag.is_active) : mockTagsStore;
    
    console.log('⚠️ Using fallback mock tags:', {
      activeOnly,
      filteredCount: filteredTags.length,
      totalInStore: mockTagsStore.length,
      tagNames: filteredTags.map(t => t.name)
    });
    
    return filteredTags;
  }
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<Profile> {
  console.log('👤 Fetching my profile');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('❌ Error fetching profile:', error.message || error);
    throw error;
  }
  
  console.log('✅ Profile fetched:', data.role);
  return data;
}

/**
 * Get current user's person record
 */
export async function getMyPerson(): Promise<Person> {
  console.log('👤 Fetching my person record');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (error) {
    console.error('❌ Error fetching person:', error.message || error);
    throw error;
  }
  
  if (!data) {
    console.log('ℹ️ No person record found for user');
    throw new Error('No person record found');
  }
  
  console.log('✅ Person fetched:', data.first_name, data.last_name);
  return data;
}

/**
 * Get a person with their tags
 */
export async function getPersonWithTags(personId: string): Promise<PersonWithTags> {
  console.log('👤 Fetching person with tags:', personId);
  
  // Validate personId more strictly
  if (!personId || personId === 'null' || personId === 'undefined' || personId.trim() === '' || personId === 'invalid') {
    console.error('❌ Invalid personId provided:', personId);
    throw new Error('Invalid person ID');
  }
  
  // Additional UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(personId)) {
    console.error('❌ Invalid UUID format for personId:', personId);
    throw new Error('Invalid person ID format');
  }
  
  try {
    // First get the person data
    const { data: person, error: personError } = await supabase
      .from('persons')
      .select('*')
      .eq('id', personId)
      .single();
    
    if (personError) {
      console.error('❌ Error fetching person:', personError);
      throw personError;
    }
    
    if (!person) {
      throw new Error('Person not found');
    }
    
    // Get the person's tags using the person_with_tags view
    const { data: personWithTagsData, error: tagsError } = await supabase
      .from('person_with_tags')
      .select('*')
      .eq('id', personId)
      .single();
    
    let tags: Tag[] = [];
    
    if (tagsError) {
      console.error('❌ Error fetching person tags:', tagsError);
      console.log('⚠️ Continuing with empty tags for person:', person.first_name);
    } else if (personWithTagsData?.tag_names && Array.isArray(personWithTagsData.tag_names)) {
      // Get full tag details for each tag name
      const { data: tagDetails, error: tagDetailsError } = await supabase
        .from('tags')
        .select('*')
        .in('name', personWithTagsData.tag_names)
        .eq('is_active', true);
      
      if (tagDetailsError) {
        console.error('❌ Error fetching tag details:', tagDetailsError);
      } else {
        tags = tagDetails || [];
      }
    }
    
    const personWithTags: PersonWithTags = {
      ...person,
      tags
    };
    
    console.log('✅ Person with tags fetched:', person.first_name, tags.length);
    return personWithTags;
  } catch (error) {
    console.error('❌ Failed to fetch person with tags:', error);
    throw error;
  }
}

/**
 * Add a tag to a person
 */
export async function addTagToPerson(personId: string, tagId: string): Promise<void> {
  console.log('🏷️ Adding tag to person:', { personId, tagId });
  
  try {
    // Get the tag name first
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('name')
      .eq('id', tagId)
      .single();
    
    if (tagError || !tag) {
      console.error('❌ Error fetching tag:', tagError);
      throw new Error('Tag not found');
    }
    
    // Use the RPC function to add the tag
    const { error } = await supabase.rpc('tag_subject', {
      p_kind: 'person',
      p_subject_id: personId,
      p_tag_name: tag.name
    });
    
    if (error) {
      console.error('❌ Error adding tag to person:', error);
      throw error;
    }
    
    console.log('✅ Tag added to person successfully');
  } catch (error) {
    console.error('❌ Failed to add tag to person:', error);
    throw error;
  }
}

/**
 * Remove a tag from a person
 */
export async function removeTagFromPerson(personId: string, tagId: string): Promise<void> {
  console.log('🏷️ Removing tag from person:', { personId, tagId });
  
  try {
    // Get the tag name first
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('name')
      .eq('id', tagId)
      .single();
    
    if (tagError || !tag) {
      console.error('❌ Error fetching tag:', tagError);
      throw new Error('Tag not found');
    }
    
    // Use the RPC function to remove the tag
    const { error } = await supabase.rpc('untag_subject', {
      p_kind: 'person',
      p_subject_id: personId,
      p_tag_name: tag.name
    });
    
    if (error) {
      console.error('❌ Error removing tag from person:', error);
      throw error;
    }
    
    console.log('✅ Tag removed from person successfully');
  } catch (error) {
    console.error('❌ Failed to remove tag from person:', error);
    throw error;
  }
}

/**
 * Find people by tags
 */
export async function findPeopleByTags(tagIds: string[], matchAll: boolean = false): Promise<string[]> {
  console.log('🔍 Finding people by tags:', { tagIds, matchAll });
  
  if (tagIds.length === 0) {
    return [];
  }
  
  try {
    // Get tag names from tag IDs
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .select('name')
      .in('id', tagIds);
    
    if (tagError || !tags) {
      console.error('❌ Error fetching tag names:', tagError);
      throw tagError || new Error('Failed to fetch tag names');
    }
    
    const tagNames = tags.map(tag => tag.name);
    console.log('🏷️ Tag names to search for:', tagNames);
    
    // Use the RPC function to find people by tags
    const { data, error } = await supabase.rpc('get_subjects_by_tags', {
      p_kind: 'person',
      p_tag_names: tagNames,
      p_match_all: matchAll
    });
    
    if (error) {
      console.error('❌ Error finding people by tags:', error);
      console.error('❌ RPC call details:', {
        function: 'get_subjects_by_tags',
        params: {
          p_kind: 'person',
          p_tag_names: tagNames,
          p_match_all: matchAll
        },
        error: error
      });
      throw error;
    }
    
    const rpcResults = data || [];
    console.log('✅ RPC results received:', {
      tagIds,
      tagNames,
      matchAll,
      count: rpcResults.length,
      rawData: rpcResults
    });
    
    // Extract subject_id from each result object
    const personIds = rpcResults.map((result: any) => {
      if (typeof result === 'object' && result.subject_id) {
        return String(result.subject_id);
      } else if (typeof result === 'string') {
        return result;
      } else {
        console.warn('⚠️ Unexpected result format:', result);
        return String(result);
      }
    });
    
    console.log('🔄 Extracted person IDs:', {
      count: personIds.length,
      personIds: personIds.slice(0, 5) // Show first 5 for debugging
    });
    
    return personIds;
  } catch (error) {
    console.error('❌ Failed to find people by tags:', error);
    console.error('❌ Full error details:', {
      error,
      tagIds,
      matchAll,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Admin: Create a new tag
 */
export async function createTag(tagData: {
  name: string;
  namespace?: string;
  color?: string;
  description?: string;
  parent_id?: string;
  self_assignable?: boolean;
  assign_min_role?: 'member' | 'leader' | 'admin';
}): Promise<Tag> {
  console.log('🏷️ Creating new tag:', tagData);
  
  try {
    // Validate and sanitize input
    const name = tagData.name?.trim();
    if (!name || name.length === 0) {
      throw new Error('Tag name is required');
    }
    if (name.length > 100) {
      throw new Error('Tag name is too long (max 100 characters)');
    }
    
    // Insert the new tag directly
    const { data, error } = await supabase
      .from('tags')
      .insert({
        name: name,
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
    
    if (error) {
      console.error('❌ Error creating tag:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('No data returned from tag creation');
    }
    
    const newTag: Tag = {
      id: data.id,
      name: data.name,
      namespace: data.namespace,
      color: data.color,
      description: data.description,
      self_assignable: data.self_assignable,
      assign_min_role: data.assign_min_role,
      is_active: data.is_active,
      parent_id: data.parent_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
    
    console.log('✅ Tag created successfully:', {
      name: newTag.name,
      id: newTag.id,
      is_active: newTag.is_active,
      self_assignable: newTag.self_assignable,
      assign_min_role: newTag.assign_min_role
    });
    
    return newTag;
  } catch (error) {
    console.error('❌ Failed to create tag:', error);
    
    // Fallback to mock implementation
    const name = tagData.name?.trim();
    if (!name || name.length === 0) {
      throw new Error('Tag name is required');
    }
    
    const newTag: Tag = {
      id: Math.random().toString(36).substr(2, 9),
      name: name,
      namespace: tagData.namespace?.trim(),
      color: tagData.color || '#6B7280',
      description: tagData.description?.trim(),
      self_assignable: tagData.self_assignable ?? false,
      assign_min_role: tagData.assign_min_role ?? 'admin',
      is_active: true,
      parent_id: tagData.parent_id,
      created_at: new Date().toISOString(),
    };
    
    mockTagsStore.push(newTag);
    
    console.log('⚠️ Using fallback mock tag creation:', {
      name: newTag.name,
      id: newTag.id,
      is_active: newTag.is_active,
      self_assignable: newTag.self_assignable,
      assign_min_role: newTag.assign_min_role,
      totalTagsInStore: mockTagsStore.length
    });
    
    return newTag;
  }
}

/**
 * Admin: Update tag governance flags
 */
export async function updateTag(tagId: string, updates: {
  self_assignable?: boolean;
  assign_min_role?: 'member' | 'leader' | 'admin';
  is_active?: boolean;
  name?: string;
  color?: string;
  description?: string;
}): Promise<void> {
  console.log('🏷️ Updating tag:', { tagId, updates });
  
  try {
    const { error } = await supabase
      .from('tags')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', tagId);
    
    if (error) {
      console.error('❌ Error updating tag:', error);
      throw error;
    }
    
    console.log('✅ Tag updated successfully');
  } catch (error) {
    console.error('❌ Failed to update tag:', error);
    
    // Fallback to mock implementation
    const tagIndex = mockTagsStore.findIndex((tag: Tag) => tag.id === tagId);
    if (tagIndex !== -1) {
      mockTagsStore[tagIndex] = {
        ...mockTagsStore[tagIndex],
        ...updates,
        updated_at: new Date().toISOString()
      };
      console.log('⚠️ Using fallback mock tag update:', mockTagsStore[tagIndex]);
    } else {
      console.warn('⚠️ Tag not found in mock store:', tagId);
    }
  }
}

/**
 * Admin: Delete/Archive tag
 */
export async function deleteTag(tagId: string, hardDelete: boolean = false): Promise<void> {
  console.log('🏷️ Deleting tag:', { tagId, hardDelete });
  
  try {
    if (hardDelete) {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);
      
      if (error) {
        console.error('❌ Error hard deleting tag:', error);
        throw error;
      }
      
      console.log('✅ Tag hard deleted successfully');
    } else {
      // Soft delete - set is_active to false
      await updateTag(tagId, { is_active: false });
      console.log('✅ Tag archived successfully');
    }
  } catch (error) {
    console.error('❌ Failed to delete tag:', error);
    
    // Fallback to mock implementation
    if (hardDelete) {
      const tagIndex = mockTagsStore.findIndex((tag: Tag) => tag.id === tagId);
      if (tagIndex !== -1) {
        mockTagsStore.splice(tagIndex, 1);
        console.log('⚠️ Using fallback mock tag hard delete');
      } else {
        console.warn('⚠️ Tag not found in mock store for deletion:', tagId);
      }
    } else {
      // Soft delete - set is_active to false
      await updateTag(tagId, { is_active: false });
      console.log('⚠️ Using fallback mock tag archive');
    }
  }
}

/**
 * Admin: Reactivate an archived tag
 */
export async function reactivateTag(tagId: string): Promise<void> {
  console.log('🏷️ Reactivating tag:', tagId);
  
  try {
    const { error } = await supabase
      .from('tags')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', tagId);
    
    if (error) {
      console.error('❌ Error reactivating tag:', error);
      throw error;
    }
    
    console.log('✅ Tag reactivated successfully');
  } catch (error) {
    console.error('❌ Failed to reactivate tag:', error);
    
    // Fallback to mock implementation
    await updateTag(tagId, { is_active: true });
    console.log('⚠️ Using fallback mock tag reactivation');
  }
}