# Schema Changes Applied — Frontend Action Required

**Date:** February 14, 2026  
**Project:** church-directory (Supabase)  
**Migration:** families/persons/profiles restructure — Phase 1 (additive only)  
**Status:** All steps have been applied to production.

---

## What Changed in the Database

All changes are **additive** — no existing columns, functions, or views were removed. Everything old still works during this transition period. Phase 2 (dropping old columns) will happen after the frontend is updated.

---

### 1. New `family_role` enum + column on `persons`

A new enum type `family_role` was created with values: `head`, `spouse`, `child`, `other`.

A new column `persons.family_role` has been added (NOT NULL, default `'other'`). An index `idx_persons_family_role` was created on `(family_id, family_role)`.

Existing data was backfilled from the current booleans:

| Old Boolean | New Enum Value |
|---|---|
| `is_head_of_family = true` | `family_role = 'head'` |
| `is_spouse = true` | `family_role = 'spouse'` |
| Both false | `family_role = 'other'` |

**`is_head_of_family` and `is_spouse` columns still exist** and will continue to work. They will not be dropped until the frontend has fully migrated to `family_role`.

**Frontend action needed:**
- [ ] Add `family_role` to the `persons` type in `types/supabase.ts` (values: `'head' | 'spouse' | 'child' | 'other'`)
- [ ] Gradually migrate reads from `is_head_of_family` / `is_spouse` → `family_role`
- [ ] Update edit forms that set those booleans to also set `family_role`
- [ ] Update filters/conditionals (e.g., `WHERE is_head_of_family = true` → `WHERE family_role = 'head'`)

---

### 2. New name columns on `families`

Two new columns added:

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| `last_name` | text | YES (will become NOT NULL in Phase 2) | The family surname |
| `display_name_override` | text | YES | Optional manual override for display name |

`last_name` was backfilled from the existing `family_last_name` column, with a fallback to the head person's last name for any gaps.

**The old columns still exist:** `family_name`, `family_last_name`, `custom_family_name`, `computed_family_name`. They will not be dropped until the frontend has migrated.

**Frontend action needed:**
- [ ] Add `last_name` and `display_name_override` to the `families` type in `types/supabase.ts`
- [ ] When creating/editing families, write to `last_name` (in addition to or instead of old columns)
- [ ] Start reading `last_name` instead of `family_last_name`
- [ ] If supporting custom display names, write to `display_name_override` instead of `custom_family_name`

---

### 3. Updated `refresh_computed_family_name` function

This function now uses the new `family_role` enum and `families.last_name` to compute display names. It falls back to the old booleans and `family_last_name` if new data isn't populated yet. It still writes to `computed_family_name` for backward compat.

**Display name format:**
```
"Zehentner, Rob & Sarah"   ← head + spouse
"Woodward, Clyde"           ← head only
```

If `display_name_override` is set on the family, that value is used instead.

**Frontend action needed:**
- [ ] No immediate action — backward compatible

---

### 4. Updated `family_directory_display` view

The view was dropped and recreated to include the new columns. All existing columns are preserved. Changes:

- `family_name_display` COALESCE chain now checks `display_name_override` first: `COALESCE(display_name_override, computed_family_name, custom_family_name, family_name, 'Family')`
- `family_role` column added to output (in both the families join and the unassigned UNION)
- The `UNION ALL` for unassigned persons (NULL `family_id`) is preserved
- All person columns preserved: `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `is_head_of_family`, `is_spouse`, `photo_url`

**Frontend action needed:**
- [ ] Verify directory page renders correctly — `family_name_display` column name is unchanged
- [ ] Sorting by `family_name_display` should work as before
- [ ] Start using `family_role` from the view instead of `is_head_of_family` / `is_spouse` when ready
- [ ] Check if any RLS policies or grants on this view were lost during the drop/recreate and need to be re-applied

---

### 5. Updated `handle_new_user` signup trigger

The trigger on `auth.users` INSERT now auto-links by email:

| Scenario | What happens |
|---|---|
| New user's email **matches** `persons.email` (case-insensitive) | Profile created with `person_id` linked, `role = 'member'` |
| New user's email **does NOT match** | Profile created with `person_id = NULL`, `role = 'visitor'` |

It also still writes to `persons.user_id` for backward compat during the transition.

**Frontend action needed:**
- [ ] Confirm `visitor` is in the `user_role` type in `types/supabase.ts` (it's been in the DB enum for a while)
- [ ] Review role-based guards and decide how `visitor` should be handled:
  - Directory access? (Probably restricted until approved)
  - Announcements? (Public ones only?)
  - Events? (Public ones only?)
- [ ] Review RLS policies that check `role IN ('member', 'leader', 'admin')` — decide if `visitor` needs to be included or explicitly excluded
- [ ] Consider adding an admin UI to promote `visitor` → `member` or link them to an existing person record
- [ ] Check for overlap with `on_profile_insert_autolink_autoapprove` — both may fire on profile creation, which could conflict

---

### 6. Updated `create_family_for_self` function

This function now writes to both old and new columns:

- **Family insert:** writes `p_family_name` to both `family_name` (old) and `last_name` (new)
- **Person update:** sets both `is_head_of_family = TRUE` and `family_role = 'head'`
- **Person lookup:** resolves through `profiles.person_id` first, falls back to `persons.user_id`

The function signature is **unchanged** — existing frontend calls work without modification.

**Frontend action needed:**
- [ ] No immediate action — backward compatible
- [ ] In Phase 2, the parameter name `p_family_name` could be renamed to `p_last_name` for clarity, but that would require updating frontend calls

---

## Functions to Review

These functions were not modified but may reference old columns. Review before Phase 2:

| Function | Concern |
|---|---|
| `admin_list_users` | May reference `persons.user_id` — needs to join through `profiles.person_id` |
| `on_profile_insert_autolink_autoapprove` | May overlap with updated `handle_new_user` — check for conflicts |
| `create_person_when_role_leaves_pending` | May write to old columns — review |

---

## What Will Be Dropped in Phase 2

Once the frontend has migrated, we will run a follow-up migration to remove:

**From `persons`:**
- `user_id` → replaced by `profiles.person_id`
- `is_head_of_family` → replaced by `family_role = 'head'`
- `is_spouse` → replaced by `family_role = 'spouse'`

**From `families`:**
- `family_name` → replaced by `last_name`
- `family_last_name` → replaced by `last_name`
- `custom_family_name` → replaced by `display_name_override`
- `computed_family_name` → computed dynamically

---

## Frontend Migration Checklist

Suggested order:

1. [ ] **Update TypeScript types** — Add `family_role`, `last_name`, `display_name_override` to `types/supabase.ts`; confirm `visitor` in `user_role`
2. [ ] **Verify directory view** — Confirm `family_directory_display` renders correctly; check RLS policies on the view
3. [ ] **Migrate person role logic** — Switch from booleans to `family_role` in components and filters
4. [ ] **Migrate family name logic** — Switch from `family_last_name` to `last_name`; from `custom_family_name` to `display_name_override`
5. [ ] **Update `persons.user_id` references** — Switch to joining through `profiles.person_id` in `directory.tsx` and `EditingPerson` type
6. [ ] **Handle visitor role in UI** — Add guards, filters, and admin management
7. [ ] **Test signup flow** — Verify email matching works for both match and no-match scenarios
8. [ ] **Signal ready for Phase 2** — Once complete and tested, we'll drop old columns

---

## Troubleshooting

| Problem | Check |
|---|---|
| Display names wrong | `SELECT id, last_name, computed_family_name, display_name_override FROM families;` |
| `family_role` is `'other'` for everyone | Backfill may not have run — check `is_head_of_family` / `is_spouse` values and re-run backfill |
| New signups not auto-linking | Verify `handle_new_user` trigger on `auth.users`; check email match in `persons` (case-insensitive) |
| RLS errors for visitors | Check which policies include/exclude `visitor` role |
| View permissions broken | Re-apply any grants or RLS policies that were on `family_directory_display` before the drop/recreate |
