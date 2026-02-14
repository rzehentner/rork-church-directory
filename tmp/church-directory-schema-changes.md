# Church Directory — Proposed Schema Changes

**Date:** February 14, 2026
**Project:** church-directory (Supabase)
**Purpose:** We're planning to clean up the families/persons/profiles table structure. Before we make any changes, I need you to review these proposals and flag anything that would break our current app code — queries, RLS policies, views, triggers, edge functions, or frontend logic.

---

## Change 1: Remove `persons.user_id` Column

**What:** Drop the `user_id` column from the `persons` table entirely.

**Why:** Right now there are two paths connecting an auth user to a person record — `persons.user_id` and `profiles.person_id`. This is a sync risk. Going forward, `profiles` will be the **only** bridge between `auth.users` and `persons`.

**New relationship chain:**
```
auth.users.id = profiles.id → profiles.person_id → persons.id → persons.family_id → families.id
```

**What I need from you:**
- [ ] Are there any queries, views, or RLS policies that reference `persons.user_id`?
- [ ] Does any frontend code (API calls, Supabase client queries) join or filter on `persons.user_id`?
- [ ] Are there any triggers or edge functions that read/write `persons.user_id`?
- [ ] Can all of those be migrated to use `profiles.person_id` instead?

---

## Change 2: Replace Family Name Columns

**What:** Remove all four current name columns (`family_name`, `family_last_name`, `custom_family_name`, `computed_family_name`) and replace with:

| New Column             | Type         | Nullable | Purpose                                          |
|------------------------|--------------|----------|--------------------------------------------------|
| `last_name`            | text         | NOT NULL | The family surname (e.g., "Zehentner", "Smith")  |
| `display_name_override`| text         | YES      | Optional manual override for edge cases           |

The formatted display name (e.g., "Zehentner, Rob & Sarah") will be **computed dynamically** from person records — never stored.

**What I need from you:**
- [ ] Which of the four current name columns does the app actually read/write?
- [ ] Are any of them referenced in views (especially `family_directory_display`), RLS policies, or edge functions?
- [ ] Does the frontend display `computed_family_name` directly, or does it build the display string client-side?
- [ ] Any issues with switching to a dynamically computed display name?

---

## Change 3: Add `family_role` Column to `persons`

**What:** Add a new column to the `persons` table:

| Column        | Type                         | Default | Purpose                                    |
|---------------|------------------------------|---------|--------------------------------------------|
| `family_role` | enum(`head`, `spouse`, `child`, `other`) | `other` | Identifies a person's role within their family |

**How it's used:** The dynamic family display name will be built from this:
- Grabs the `head` person's first name + `spouse` person's first name
- Format: `"LastName, HeadFirstName & SpouseFirstName"`
- If no spouse: `"LastName, HeadFirstName"`
- If `display_name_override` is set on the family, use that instead

**What I need from you:**
- [ ] Any concerns with adding this column and enum type?
- [ ] Will the frontend need updates to set/display this field (e.g., family management screens)?
- [ ] Does the `person_with_tags` view or any other view need to include this new column?

---

## Change 4: Update `family_directory_display` View

**What:** Rewrite the `family_directory_display` view to use the new structure. New logic:

```sql
-- Pseudocode for display name computation
COALESCE(
  families.display_name_override,
  families.last_name || ', ' || head.first_name || COALESCE(' & ' || spouse.first_name, '')
)
```

**What I need from you:**
- [ ] Does the app query `family_directory_display` directly, or does it query the underlying tables?
- [ ] Are there any columns from the current view that the frontend depends on?
- [ ] Will changing the view output break any client-side sorting/filtering?

---

## Change 5: Signup Auto-Link Trigger

**What:** Create (or update) a Postgres trigger on `auth.users` INSERT that handles new signups:

| Scenario | Action |
|----------|--------|
| New user's email **matches** an existing `persons.email` | Create `profiles` row with `person_id` linked, role = `member` |
| New user's email **does not match** | Create `profiles` row with `person_id = NULL`, role = `visitor` |

This replaces any existing signup handling logic.

**What I need from you:**
- [ ] Is there already a trigger or edge function that creates a `profiles` row on signup? If so, what does it do?
- [ ] Does the current `user_role` enum already include `member` and `visitor`, or do we need to add/rename values?
- [ ] Are there any RLS policies that check the `role` field? Will they need updating for the new role values?
- [ ] How does the current approval workflow interact with this? (I see `approved_by` and `approved_at` on profiles — does a `visitor` need admin approval to become a `member`?)

---

## Migration Considerations

These changes will require a migration that should be run in a specific order:

1. Add `family_role` enum and column to `persons` (non-breaking, additive)
2. Backfill `family_role` for existing persons (manual — we'll need to identify heads/spouses/children)
3. Add `last_name` and `display_name_override` to `families` (additive)
4. Backfill `families.last_name` from existing `family_last_name` data
5. Update the `family_directory_display` view to use new columns
6. Update the signup trigger
7. Migrate any code that uses `persons.user_id` to use `profiles.person_id`
8. Drop the old columns (`persons.user_id`, `families.family_name`, `families.family_last_name`, `families.custom_family_name`, `families.computed_family_name`)

**Steps 1–6 are additive and non-breaking.** Steps 7–8 are the breaking changes and should only happen after all app code is updated.

---

## Summary

| Area | Current | Proposed |
|------|---------|----------|
| User ↔ Person link | Two paths (`persons.user_id` + `profiles.person_id`) | Single path via `profiles` only |
| Family name storage | 4 columns | `last_name` + `display_name_override` |
| Display name | Stored in `computed_family_name` | Computed dynamically from `family_role` |
| Person's role in family | Not tracked | New `family_role` enum on `persons` |
| Signup flow | Unknown/manual | Auto-trigger: email match → member, no match → visitor |

**Please review and let me know which of these changes will require app-side updates and roughly how much work is involved.** I'd like to get a sense of the blast radius before we commit to the migration.
