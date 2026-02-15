-- ============================================================
-- RPC: admin_delete_person
-- Deletes a person record. Only admins can call this.
-- Cleans up taggings and unlinks user_id before deleting.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_person(p_person_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Check caller is admin
  SELECT role INTO v_caller_role
    FROM persons
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete persons';
  END IF;

  -- Remove taggings
  DELETE FROM taggings
   WHERE subject_kind = 'person'
     AND subject_id = p_person_id;

  -- Clear user_id so the auth user isn't orphaned
  UPDATE persons SET user_id = NULL WHERE id = p_person_id AND user_id IS NOT NULL;

  -- Delete the person
  DELETE FROM persons WHERE id = p_person_id;
END;
$$;

-- ============================================================
-- RPC: admin_delete_family
-- Deletes a family and its non-account members. Members with
-- user accounts are unlinked (family_id set to null).
-- Only admins can call this.
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_family(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- Check caller is admin
  SELECT role INTO v_caller_role
    FROM persons
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can delete families';
  END IF;

  -- Remove taggings for all family members
  DELETE FROM taggings
   WHERE subject_kind = 'person'
     AND subject_id IN (
       SELECT id FROM persons WHERE family_id = p_family_id
     );

  -- Unlink members that have user accounts
  UPDATE persons
     SET family_id = NULL
   WHERE family_id = p_family_id
     AND user_id IS NOT NULL;

  -- Delete members without user accounts
  DELETE FROM persons
   WHERE family_id = p_family_id
     AND user_id IS NULL;

  -- Delete the family
  DELETE FROM families WHERE id = p_family_id;
END;
$$;
