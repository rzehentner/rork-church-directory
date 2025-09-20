import { supabase } from './supabase';

export interface AdminUserListItem {
  user_id: string;
  role: 'pending' | 'member' | 'leader' | 'admin';
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  family_id: string | null;
}

/**
 * Fetch users with role filtering for admin interface
 * Uses RPC to bypass RLS restrictions
 */
export async function adminListUsers(
  roles?: ('pending' | 'member' | 'leader' | 'admin')[] | null
): Promise<AdminUserListItem[]> {
  console.log('🔍 adminListUsers called with roles:', roles);
  
  try {
    const { data, error } = await supabase.rpc('admin_list_users', {
      p_roles: roles || null
    });
    
    if (error) {
      console.error('❌ RPC admin_list_users error:', error);
      throw error;
    }
    
    console.log('✅ adminListUsers success:', {
      count: data?.length || 0,
      roles: roles,
      sampleData: data?.slice(0, 3)
    });
    
    return data || [];
  } catch (error) {
    console.error('❌ adminListUsers failed:', error);
    throw error;
  }
}

/**
 * Create the admin_list_users RPC function in the database
 * This should be run once to set up the function
 */
export const ADMIN_LIST_USERS_SQL = `
CREATE OR REPLACE FUNCTION public.admin_list_users(p_roles text[] DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  role user_role,
  person_id uuid,
  first_name text,
  last_name text,
  email text,
  family_id uuid
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id, p.role,
    per.id, per.first_name, per.last_name, per.email, per.family_id
  FROM public.profiles p
  LEFT JOIN public.persons per ON per.user_id = p.id
  WHERE public.has_role(auth.uid(), ARRAY['admin','leader'])
    AND (p_roles IS NULL OR p.role::text = ANY (p_roles))
  ORDER BY per.last_name NULLS LAST, per.first_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(text[]) TO authenticated;
`;