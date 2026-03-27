# Roadmap & Experiments Scoping

## Contents
- Feature Prioritization Framework
- Experiment Scoping Patterns
- Church Settings as Feature Flags
- Rollout Strategies
- Anti-Patterns

## Feature Prioritization Framework

### Size Features by Layer Count

Use this quick sizing model based on how many codebase layers a feature touches:

```markdown
## Layer Count Sizing

| Layers | Size | Typical Scope |
|--------|------|--------------|
| 1 | XS | Style change, copy update, icon swap |
| 2 | S | New component + styles, or service + types |
| 3 | M | Screen + service + styles (one CRUD operation) |
| 4 | L | Screen + service + types + styles (full CRUD) |
| 5+ | XL | Multiple screens + services + context + Supabase schema |

## Layers in this codebase:
1. Screen (app/)
2. Service (services/)
3. Types (types/)
4. Styles (styles/)
5. Context/Hook (hooks/)
6. Component (components/)
7. Supabase schema (migration)
```

### Prioritize by Role Impact

```markdown
## Role-based impact matrix

| Feature | Pending | Visitor | Member | Leader | Admin |
|---------|---------|---------|--------|--------|-------|
| Profile completion | HIGH | HIGH | - | - | - |
| Prayer requests | - | MED | HIGH | MED | LOW |
| Event management | - | - | MED | HIGH | HIGH |
| Bulk operations | - | - | - | HIGH | HIGH |
| User approvals | - | - | - | MED | HIGH |
```

Features impacting more roles = higher reach. Features impacting leader/admin roles = higher leverage (they create content for everyone).

## Experiment Scoping Patterns

### Pattern: A/B Test via Church Settings

The `church-settings-context.tsx` already loads configuration from Supabase:

```typescript
// hooks/church-settings-context.tsx
const { data: settings } = useQuery({
  queryKey: ['church-settings'],
  queryFn: async () => {
    const { data } = await supabase
      .from('church_settings')
      .select('*')
      .single();
    return data;
  },
  staleTime: 5 * 60 * 1000,
});
```

**Scope a feature flag using this existing pattern:**

```markdown
Feature: [Name] with Feature Flag
- [ ] Add `enable_[feature]` boolean to church_settings table
- [ ] Read flag in church-settings-context.tsx
- [ ] Conditionally render feature based on flag
- [ ] Default to false (opt-in rollout)
- [ ] Admin UI toggle in settings tab of admin screen
```

This avoids adding a feature flag library. The church_settings table already exists and is cached via React Query.

### Pattern: Role-Gated Rollout

Instead of feature flags, use the existing role system for gradual rollout:

```markdown
## Rollout Plan: [Feature Name]
1. Week 1: Admin-only (role === 'admin')
2. Week 2: Leader + Admin (isAdminOrLeader)
3. Week 3: All members (role !== 'pending' && role !== 'visitor')
4. Week 4: All authenticated users
```

This uses existing `me-context.tsx` role checks — no new infrastructure:

```typescript
// hooks/me-context.tsx provides:
const { myRole, isAdmin, isAdminOrLeader } = useMe();

// Screen-level gating:
if (!isAdmin) return null; // Phase 1
if (!isAdminOrLeader) return null; // Phase 2
```

## Church Settings as Feature Flags

### Scoping New Settings

When a feature needs a toggle, scope it through the existing church settings flow:

```markdown
Feature: Configurable [X]
├── Backend: Add column to church_settings table (Supabase migration)
├── Context: Expose in useChurchSettings() hook
├── Admin UI: Toggle in admin.tsx Church settings tab
├── Screen: Conditional render based on setting value
└── Types: Regenerate types/supabase.ts
```

**Acceptance criteria:**

```markdown
- [ ] Setting stored in church_settings table
- [ ] Default value specified in migration (not in app code)
- [ ] Admin can toggle in Church settings tab
- [ ] Change takes effect within 5 minutes (React Query staleTime)
- [ ] Setting survives app restart
```

## Rollout Strategies for EBC Connect

### OTA vs Native Build

Scope impacts deployment strategy:

```markdown
## OTA-deployable (npx eas update):
- UI changes, new screens, service logic, styles
- Feature flags via church_settings
- Bug fixes in JS/TS code

## Requires native build (eas build):
- New native modules (e.g., adding expo-camera)
- Changes to app.json/app.config.js
- Native permission additions
- Expo SDK upgrades
```

**Always note in scope which deployment method is needed:**

```markdown
- [ ] Deployment: OTA update (no native changes)
# or
- [ ] Deployment: Requires new native build (adds expo-[module])
```

See the **eas** skill for build and update deployment patterns.

## Scoping Checklist for Roadmap Items

```markdown
- [ ] Size estimated (XS/S/M/L/XL) using layer count
- [ ] Role impact identified (which roles benefit)
- [ ] Rollout strategy defined (feature flag, role-gate, or ship-to-all)
- [ ] Deployment method noted (OTA or native build)
- [ ] Dependencies identified (does this need another feature first?)
- [ ] Success metric defined (what changes if this ships?)
- [ ] Cut list defined (what's explicitly NOT in scope?)
```

## Anti-Patterns

### WARNING: Scoping Features Without a Cut List

**The Problem:** Defining what's IN scope but not what's OUT.

```markdown
# BAD - Unbounded scope
Feature: "Improve Events"
- Better event cards
- Calendar integration
- Search and filtering
- Image galleries
- Recurring events
```

**Why This Breaks:** Without explicit exclusions, scope creeps. Every reviewer adds "while we're at it..." items. The feature never ships.

**The Fix:** Always include a "NOT in scope" section:

```markdown
Feature: Event Search & Filtering
## In scope:
- [ ] Text search by title/description/location
- [ ] Filter by RSVP status
- [ ] Filter by tag

## NOT in scope (future slices):
- Full-text search (Supabase FTS)
- Date range filtering
- Saved/favorite filters
- Search history
```

### WARNING: Scoping Supabase Schema Changes as "Small"

**The Problem:** Treating database schema changes as simple tasks.

**Why This Breaks:** Schema changes require:
1. Supabase migration
2. Type regeneration (`npx supabase gen types`)
3. View updates (if using `events_for_me` or similar)
4. RPC function updates (if logic moves server-side)
5. Service layer updates
6. Screen updates

That's 6 layers minimum. Never classify a schema change as "small."

**The Fix:**

```markdown
- [ ] Define new table/columns in Supabase migration
- [ ] Update views that depend on changed tables
- [ ] Update RPC functions if affected
- [ ] Regenerate types: npx supabase gen types typescript --project-id rwbppxcusppltwkcjmdu > types/supabase.ts
- [ ] Update service functions to use new schema
- [ ] Update screens to display new data
```

See the **prioritizing-roadmap-bets** skill for deciding what to build next.
See the **supabase** skill for migration and schema change patterns.
