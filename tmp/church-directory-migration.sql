-- ============================================================================
-- Church Directory Schema Migration
-- Date: 2025-02-14
-- Purpose: Restructure families/persons/profiles relationships
-- 
-- INSTRUCTIONS: Run each section in order. All changes are ADDITIVE —
-- no columns or functions are dropped. Old columns remain until frontend
-- is updated and a follow-up migration removes them.
-- ============================================================================


-- ============================================================================
-- STEP 1: Create family_role enum and add column to persons
-- Status: NON-BREAKING (additive)
-- ============================================================================

-- Create the enum type
DO $$ BEGIN
  CREATE TYPE family_role AS ENUM ('head', 'spouse', 'child', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add the column with a safe default
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS family_role family_role NOT NULL DEFAULT 'other';

-- Index for efficient lookups (used by display name computation)
CREATE INDEX IF NOT EXISTS idx_persons_family_role
  ON persons (family_id, family_role);


-- ============================================================================
-- STEP 2: Backfill family_role from existing boolean columns
-- Status: NON-BREAKING (data update only)
-- ============================================================================

-- Map existing booleans to the new enum
-- is_head_of_family = true  →  'head'
-- is_spouse = true          →  'spouse'
-- neither                   →  'other' (already the default)
--
-- NOTE: If a person has BOTH booleans true (shouldn't happen), head wins.

UPDATE persons
SET family_role = CASE
  WHEN is_head_of_family = true THEN 'head'::family_role
  WHEN is_spouse = true         THEN 'spouse'::family_role
  ELSE 'other'::family_role
END;

-- Verify the backfill
-- SELECT family_role, count(*) FROM persons GROUP BY family_role;


-- ============================================================================
-- STEP 3: Add new name columns to families
-- Status: NON-BREAKING (additive)
-- ============================================================================

ALTER TABLE families
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS display_name_override text;


-- ============================================================================
-- STEP 4: Backfill families.last_name from existing data
-- Status: NON-BREAKING (data update only)
-- ============================================================================

-- Pull from the existing family_last_name column
UPDATE families
SET last_name = family_last_name
WHERE family_last_name IS NOT NULL
  AND last_name IS NULL;

-- For any families where family_last_name was empty, try to derive from
-- the head person's last_name
UPDATE families f
SET last_name = p.last_name
FROM persons p
WHERE p.family_id = f.id
  AND p.family_role = 'head'
  AND f.last_name IS NULL;

-- Safety check: make sure we didn't miss any
-- SELECT id, family_name, family_last_name, last_name FROM families WHERE last_name IS NULL;

-- Once verified, make it NOT NULL
-- ALTER TABLE families ALTER COLUMN last_name SET NOT NULL;


-- ============================================================================
-- STEP 5: Update refresh_computed_family_name function
-- Status: NON-BREAKING (function replacement, same signature)
-- 
-- This function is called by the refresh_computed_family_name_by_id trigger.
-- It now uses family_role instead of is_head_of_family / is_spouse,
-- and reads from families.last_name instead of family_last_name.
-- It still writes to computed_family_name for backward compat.
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_computed_family_name(p_family_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_override    text;
  v_last_name   text;
  v_head_first  text;
  v_spouse_first text;
  v_display     text;
BEGIN
  -- Get family-level data
  SELECT display_name_override,
         COALESCE(last_name, family_last_name)  -- fallback to old column during transition
  INTO v_override, v_last_name
  FROM families
  WHERE id = p_family_id;

  -- If manual override is set, use it directly
  IF v_override IS NOT NULL AND v_override != '' THEN
    v_display := v_override;
  ELSE
    -- Get head of family first name
    SELECT first_name INTO v_head_first
    FROM persons
    WHERE family_id = p_family_id
      AND family_role = 'head'
    LIMIT 1;

    -- Fallback: if no head role set yet, try the old boolean
    IF v_head_first IS NULL THEN
      SELECT first_name INTO v_head_first
      FROM persons
      WHERE family_id = p_family_id
        AND is_head_of_family = true
      LIMIT 1;
    END IF;

    -- Get spouse first name
    SELECT first_name INTO v_spouse_first
    FROM persons
    WHERE family_id = p_family_id
      AND family_role = 'spouse'
    LIMIT 1;

    -- Fallback: if no spouse role set yet, try the old boolean
    IF v_spouse_first IS NULL THEN
      SELECT first_name INTO v_spouse_first
      FROM persons
      WHERE family_id = p_family_id
        AND is_spouse = true
      LIMIT 1;
    END IF;

    -- Build display name: "LastName, Head & Spouse" or "LastName, Head"
    IF v_head_first IS NOT NULL AND v_spouse_first IS NOT NULL THEN
      v_display := v_last_name || ', ' || v_head_first || ' & ' || v_spouse_first;
    ELSIF v_head_first IS NOT NULL THEN
      v_display := v_last_name || ', ' || v_head_first;
    ELSE
      v_display := v_last_name;
    END IF;
  END IF;

  -- Write to BOTH old and new-style columns for backward compat
  UPDATE families
  SET computed_family_name = v_display
  WHERE id = p_family_id;
END;
$$;


-- ============================================================================
-- STEP 6: Update the family_directory_display view
-- Status: CAUTION — preserves column name family_name_display for compat
--
-- NOTE: Review the current view definition first. If the current view has
-- additional columns or joins not captured here, merge them in.
-- Run: SELECT pg_get_viewdef('family_directory_display', true);
-- to see the current definition before replacing.
-- ============================================================================

CREATE OR REPLACE VIEW family_directory_display AS
SELECT
  f.id                    AS family_id,
  -- Preserve the family_name_display column name for frontend compat
  COALESCE(
    f.display_name_override,
    f.computed_family_name,
    COALESCE(f.last_name, f.family_last_name) || ', ' ||
      COALESCE(
        (SELECT first_name FROM persons WHERE family_id = f.id AND family_role = 'head' LIMIT 1),
        (SELECT first_name FROM persons WHERE family_id = f.id AND is_head_of_family = true LIMIT 1),
        ''
      ) ||
      COALESCE(
        ' & ' || (SELECT first_name FROM persons WHERE family_id = f.id AND family_role = 'spouse' LIMIT 1),
        ' & ' || (SELECT first_name FROM persons WHERE family_id = f.id AND is_spouse = true LIMIT 1),
        ''
      )
  )                       AS family_name_display,
  f.address_street,
  f.address_city,
  f.address_state,
  f.address_zip,
  f.home_phone,
  p.id                    AS person_id
FROM persons p
LEFT JOIN families f ON f.id = p.family_id;


-- ============================================================================
-- STEP 7: Update the signup auto-link trigger (handle_new_user)
-- Status: REPLACES existing trigger function
--
-- Logic:
--   1. New user signs up via auth
--   2. Check if their email matches an existing persons record
--   3. Match found → create profile with person_id linked, role = 'member'
--   4. No match → create profile with person_id = NULL, role = 'visitor'
--
-- NOTE: Review the CURRENT handle_new_user function body before replacing.
-- Run: SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- It may contain additional logic (avatar setup, metadata, etc.) that
-- should be preserved in this replacement.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id uuid;
  v_role user_role;
BEGIN
  -- Check if the new user's email matches an existing person
  SELECT id INTO v_person_id
  FROM persons
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  -- Determine role based on match
  IF v_person_id IS NOT NULL THEN
    v_role := 'member';
  ELSE
    v_role := 'visitor';
  END IF;

  -- Create the profile row
  INSERT INTO profiles (id, person_id, role, created_at, updated_at)
  VALUES (
    NEW.id,
    v_person_id,
    v_role,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- If matched, also set the person's user_id for backward compat
  -- (remove this block when persons.user_id is dropped)
  IF v_person_id IS NOT NULL THEN
    UPDATE persons SET user_id = NEW.id WHERE id = v_person_id;
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- STEP 8: Update create_family_for_self to use new columns
-- Status: REPLACES existing function
--
-- NOTE: Review current function body first:
-- SELECT prosrc FROM pg_proc WHERE proname = 'create_family_for_self';
-- Preserve any additional logic not captured here.
-- ============================================================================

-- PLACEHOLDER — Do not run until you've reviewed the current function body.
-- The key change is: use last_name instead of family_name / family_last_name
-- when creating a new family record.
--
-- CREATE OR REPLACE FUNCTION create_family_for_self(
--   p_last_name text,
--   p_address_street text DEFAULT NULL,
--   p_address_city text DEFAULT NULL,
--   p_address_state text DEFAULT NULL,
--   p_address_zip text DEFAULT NULL,
--   p_home_phone text DEFAULT NULL
-- ) RETURNS uuid ...


-- ============================================================================
-- STEP 9 (OPTIONAL): Refresh all existing computed family names
-- Run this after Steps 1-5 to ensure all display names are current.
-- ============================================================================

-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT id FROM families LOOP
--     PERFORM refresh_computed_family_name(r.id);
--   END LOOP;
-- END $$;


-- ============================================================================
-- FUTURE: Phase 2 — Breaking changes (DO NOT RUN YET)
-- Only run after frontend code has been updated.
-- ============================================================================

-- -- Remove dual user link from persons
-- ALTER TABLE persons DROP COLUMN IF EXISTS user_id;

-- -- Remove old boolean flags from persons
-- ALTER TABLE persons DROP COLUMN IF EXISTS is_head_of_family;
-- ALTER TABLE persons DROP COLUMN IF EXISTS is_spouse;

-- -- Remove old name columns from families
-- ALTER TABLE families DROP COLUMN IF EXISTS family_name;
-- ALTER TABLE families DROP COLUMN IF EXISTS family_last_name;
-- ALTER TABLE families DROP COLUMN IF EXISTS custom_family_name;
-- ALTER TABLE families DROP COLUMN IF EXISTS computed_family_name;

-- -- Make last_name required
-- ALTER TABLE families ALTER COLUMN last_name SET NOT NULL;
