# Strategy & Monetization Reference

## Contents
- Monetization Context
- Role Hierarchy as Value Ladder
- Adding a New Tier
- WARNING: No Feature Flag System
- Value Communication Strategy
- Tier Restructuring Checklist

## Monetization Context

EBC Connect is a **free community app** with zero commercial monetization. There are no subscriptions, in-app purchases, ads, or payment flows. The app is funded and maintained by the church.

The "monetization" equivalent is **community adoption** — the more members actively use the app, the more value it provides to the church. The "revenue metric" is engagement, not dollars.

## Role Hierarchy as Value Ladder

The five-tier role system IS the offer ladder:

```
┌─────────────────────────────────────────┐
│  ADMIN                                  │
│  Full control: user management,         │
│  directory admin, all leader features   │
├─────────────────────────────────────────┤
│  LEADER                                 │
│  Content creation: announcements,       │
│  event editing, prayer management,      │
│  bulletin generation, admin panel       │
├─────────────────────────────────────────┤
│  MEMBER                                 │
│  Full community: RSVP, prayers,         │
│  directory, family, forms, all content  │
├─────────────────────────────────────────┤
│  VISITOR                                │
│  Browse: dashboard, events, prayers,    │
│  announcements (no active gating vs     │
│  member in current implementation)      │
├─────────────────────────────────────────┤
│  PENDING                                │
│  Onboarding: profile completion,        │
│  family join, content browsing          │
│  while awaiting approval                │
└─────────────────────────────────────────┘
```

### Current Implementation

```tsx
// hooks/me-context.tsx — the role derivation hub
const isAdmin = profile?.role === 'admin';
const isLeader = profile?.role === 'leader';
const isAdminOrLeader = isAdmin || isLeader;
```

### DO: Differentiate Visitor from Member

```tsx
// GOOD — give visitors a reason to get approved
// Currently visitor and member have identical access
// Consider restricting visitor from:
// - Submitting prayer requests
// - RSVP to events
// - Viewing full directory
// This creates clear "upgrade" value
```

### DON'T: Collapse All Non-Admin Roles into One

```tsx
// BAD — binary admin/not-admin with no middle ground
if (isAdmin) { showEverything(); }
else { showBasicView(); }
// Leaders have no distinct value, no reason to accept the role
```

## Adding a New Tier

When the church needs a new role (e.g., `moderator`, `deacon`, `youth_leader`):

### Step 1: Update Supabase Enum

```sql
-- Add to the user_role enum in Supabase
ALTER TYPE user_role ADD VALUE 'moderator' BEFORE 'leader';
```

### Step 2: Regenerate Types

```bash
npx supabase gen types typescript --project-id rwbppxcusppltwkcjmdu > types/supabase.ts
```

### Step 3: Update me-context.tsx

```tsx
// hooks/me-context.tsx — add new derived boolean
const isModerator = profile?.role === 'moderator';
const isModeratorOrAbove = isModerator || isLeader || isAdmin;
```

### Step 4: Gate Features

```tsx
// Use the new role check in screens
const { isModeratorOrAbove } = useMe();

{isModeratorOrAbove && <PrayerModerationTools />}
```

### Step 5: Update Content Targeting

```tsx
// Add new role to roles_allowed options
roles_allowed: ['moderator', 'leader', 'admin']
```

## WARNING: No Feature Flag System

**The Problem:** Feature gating is hardcoded to roles. There's no way to:
- A/B test a feature for a subset of users
- Gradually roll out a new feature
- Disable a feature without a code deploy
- Enable features per-church (if multi-tenant)

**Impact:** Every feature change requires a code deploy (OTA at minimum). Cannot test whether a new tier structure improves engagement before committing.

**Recommended Approach:**

```tsx
// Use church_settings table for simple feature flags
// Add a jsonb column for feature flags:
// church_settings.feature_flags: { "prayer_moderation": true, "bulletin_v2": false }

const { churchSettings } = useChurchSettings();
const flags = churchSettings?.feature_flags ?? {};

{flags.prayer_moderation && <PrayerModerationTools />}
```

This avoids adding a third-party feature flag SDK while leveraging existing infrastructure. See the **supabase** skill for schema changes.

## Value Communication Strategy

Each tier needs clear messaging about what it unlocks:

### Pending → Member Upgrade

```tsx
// Current: passive "pending approval" banner
// Better: show what they'll unlock
<View style={styles.pendingCard}>
  <Text style={styles.pendingTitle}>Almost there!</Text>
  <Text style={styles.pendingBody}>
    Once approved, you'll be able to RSVP to events,
    submit prayer requests, and connect with the full
    church directory.
  </Text>
</View>
```

### Member → Leader Value

```tsx
// When promoting a member to leader, communicate the value:
// "As a leader, you can create announcements, manage events,
//  and help moderate prayer requests for the community."
```

### DO: Show Value Before Granting Access

```tsx
// GOOD — preview what the next tier unlocks
{!isAdminOrLeader && (
  <View style={styles.leaderPreview}>
    <Text>Leaders can create events and announcements</Text>
    <Text style={styles.muted}>
      Talk to your pastor about becoming a leader
    </Text>
  </View>
)}
```

### DON'T: Silently Gate Features

```tsx
// BAD — feature just doesn't exist for lower tiers
// Member sees 6 quick actions, leader sees 7, no explanation why
// Members don't even know Admin tools exist
```

## Tier Restructuring Checklist

Copy this when modifying the role hierarchy:

- [ ] Map current features to roles (see Tier Value Map in SKILL.md)
- [ ] Identify value gaps (tiers with identical access)
- [ ] Update Supabase `user_role` enum if adding/removing roles
- [ ] Regenerate types: `npx supabase gen types typescript`
- [ ] Update `me-context.tsx` with new derived booleans
- [ ] Update all screen-level role checks (search for `profile?.role`)
- [ ] Update `roles_allowed` options in content creation forms
- [ ] Update Supabase RLS policies and RPC `has_role()` checks
- [ ] Update the admin panel's user role dropdown
- [ ] Test every screen as every role (see measurement-testing.md matrix)
- [ ] Update onboarding copy to communicate new tier values

See the **mapping-user-journeys** skill for visualizing tier progression paths.
See the **prioritizing-roadmap-bets** skill for deciding which tier changes to ship first.
