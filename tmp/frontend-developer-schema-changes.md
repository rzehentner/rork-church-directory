# Schema Changes Applied — Frontend Action Required

**Date:** February 14, 2026  
**Project:** church-directory (Supabase)  
**Migration:** families/persons/profiles restructure — Phase 1 (additive only)

---

## What Changed in the Database

The following **additive, non-breaking** changes have been applied. No existing columns or functions were removed — everything old still works during this transition period.

---

### 1. New `family_role` enum + column on `persons`

A new enum type `family_role` was created with values: `head`, `spouse`, `child`, `other`.

A new column `persons.family_role` has been added (NOT NULL, default `'other'`).

Existing data was backfilled from the current booleans:
- `is_head_of_family = true` → `family_role = 'head'`
- `is_spouse = true` → `family_role = 'spouse'`
- All others → `family_role = 'other'`

**`is_head_of_family` and `is_spouse` columns still exist** and are unchanged. They will not be dropped until the frontend has migrated to `family_role`.

**Frontend action needed:**
- [ ] Gradually migrate reads from `is_head_of_family` / `is_spouse` → `family_role`
- [ ] Update any edit forms that set those booleans to also set `family_role`
- [ ] Update any filters/conditionals (e.g., `WHERE is_head_of_family = true` → `WHERE family_role = 'head'`)
- [ ] `person_with_tags` view — verify if it needs to include `family_role`

**Mapping reference:**

| Old Boolean | New Enum Value |
|---|---|
| `is_head_of_family = true` | `family_role = 'head'` |
| `is_spouse = true` | `family_role = 'spouse'` |
| Both false | `family_role = 'child'` or `'other'` (set manually) |

---

### 2. New name columns on `families`

Two new columns added to the `families` table:

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| `last_name` | text | YES (temporary, will become NOT NULL) | The family surname |
| `display_name_override` | text | YES | Optional manual override for display name |

`last_name` was backfilled from the existing `family_last_name` column.

**The old columns still exist:** `family_name`, `family_last_name`, `custom_family_name`, `computed_family_name`. They will not be dropped until the frontend has migrated.

**Frontend action needed:**
- [ ] Migrate writes: when creating/editing families, write to `last_name` (in addition to or instead of old columns)
- [ ] Migrate reads: start reading `last_name` instead of `family_last_name`
- [ ] If your app supports custom display names, write to `display_name_override` instead of `custom_family_name`
- [ ] Update `types/supabase.ts` to include the new columns in the `families` Row/Insert/Update types

---

### 3. Updated `refresh_computed_family_name` function

This function now uses the new `family_role` enum and `families.last_name` column to compute display names. It falls back to the old boolean columns and `family_last_name` if the new data isn't set yet.

**Display name format:**
```
"Zehentner, Rob & Sarah"   ← head + spouse
"Woodward, Clyde"           ← head only, no spouse
```

If `display_name_override` is set on the family, that value is used instead.

The function still writes to `computed_family_name` for backward compatibility.

**Frontend action needed:**
- [ ] No immediate action — this is backward compatible
- [ ] Once frontend reads from the view or calls this function, display names should already be correct

---

### 4. Updated `family_directory_display` view

The view has been updated to compute display names using the new columns, with fallbacks to old columns. **The output column `family_name_display` is preserved** — same name, same position.

**Frontend action needed:**
- [ ] Verify the directory page still renders correctly with the updated view
- [ ] Sorting by `family_name_display` should work unchanged
- [ ] If you add any new columns to the view output, update the frontend query accordingly

---

### 5. Updated `handle_new_user` signup trigger

The trigger on `auth.users` INSERT now implements auto-linking:

| Scenario | What happens |
|---|---|
| New user's email **matches** `persons.email` | Profile created with `person_id` linked, `role = 'member'` |
| New user's email **does NOT match** | Profile created with `person_id = NULL`, `role = 'visitor'` |

The trigger also still writes to `persons.user_id` for backward compatibility during the transition.

**Frontend action needed:**
- [ ] Update `types/supabase.ts` if `visitor` role wasn't already in the `user_role` type (it's been in the DB enum since earlier)
- [ ] Review any role-based guards/filters — make sure `visitor` is handled appropriately:
  - Should visitors see the directory? Probably not until approved.
  - Should visitors see announcements? Only public ones?
  - Should visitors see events? Only public ones?
- [ ] Review RLS policies that check `role IN ('member', 'leader', 'admin')` — decide if `visitor` should be included or explicitly excluded
- [ ] Consider adding a UI flow for admins to promote `visitor` → `member` (or link them to an existing person record)

---

### 6. Functions to review (no changes yet, but will need updating)

These functions reference old column names and will need updates in Phase 2:

| Function | Issue |
|---|---|
| `create_family_for_self` | Uses `p_family_name` param — will need `p_last_name` instead |
| `admin_list_users` | May reference `persons.user_id` — needs to join through `profiles.person_id` |
| `on_profile_insert_autolink_autoapprove` | May overlap with the updated `handle_new_user` — review for conflicts |
| `create_person_when_role_leaves_pending` | May write to old columns — review |

---

## What's NOT Changed Yet (Phase 2 — Pending Frontend Updates)

These columns will be **dropped** in a future migration once the frontend no longer references them:

**On `persons`:**
- `user_id` — replaced by `profiles.person_id` as the sole user↔person link
- `is_head_of_family` — replaced by `family_role = 'head'`
- `is_spouse` — replaced by `family_role = 'spouse'`

**On `families`:**
- `family_name` — replaced by `last_name`
- `family_last_name` — replaced by `last_name`
- `custom_family_name` — replaced by `display_name_override`
- `computed_family_name` — now computed dynamically (but still written to for compat)

---

## Migration Checklist for Frontend

Here's the suggested order for frontend changes:

- [ ] **Update TypeScript types** — Add `family_role`, `last_name`, `display_name_override` to `types/supabase.ts`; add `visitor` to `user_role` type if missing
- [ ] **Update directory queries** — Verify `family_directory_display` view still works as expected; `family_name_display` column name is preserved
- [ ] **Migrate person role logic** — Switch from `is_head_of_family`/`is_spouse` booleans to `family_role` enum in UI components and filters
- [ ] **Migrate family name logic** — Switch from `family_last_name` to `last_name`; from `custom_family_name` to `display_name_override`
- [ ] **Update `persons.user_id` references** — Switch to joining through `profiles.person_id` in `directory.tsx` and `EditingPerson` type
- [ ] **Handle visitor role in UI** — Add appropriate guards, filters, and admin management for visitor users
- [ ] **Test signup flow** — Verify that new signups with matching emails get `member` role and linked `person_id`; non-matching emails get `visitor`
- [ ] **Signal ready for Phase 2** — Once all the above are complete and tested, we'll run the Phase 2 migration to drop old columns

---

## Questions / Concerns

If anything seems off or breaks, check these first:

1. **Display names look wrong?** → Run `SELECT id, last_name, computed_family_name, display_name_override FROM families;` to verify the backfill
2. **family_role is 'other' for everyone?** → The backfill may not have run, or `is_head_of_family`/`is_spouse` were all NULL. Run the backfill query from the migration script.
3. **New signups aren't auto-linking?** → Check `handle_new_user` trigger is attached to `auth.users` on INSERT. Verify the person's email in `persons` matches exactly (case-insensitive).
4. **RLS errors for visitors?** → Check which policies include/exclude the `visitor` role.

Reach out if you need the Phase 2 drop migration or have questions about any of the changes.
