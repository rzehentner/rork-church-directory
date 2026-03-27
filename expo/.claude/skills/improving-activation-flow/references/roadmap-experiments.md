# Roadmap & Experiments Reference

## Contents
- Current Feature Flag Surface
- Church Settings as Config
- Activation Experiments to Run
- Role-Based Feature Gating
- OTA Update Strategy
- Anti-Patterns

## Current Feature Flag Surface

EBC Connect has **no experiment infrastructure**. Feature visibility is controlled
entirely by role checks:

```typescript
// app/(tabs)/_layout.tsx:10
const isAdmin = !isLoading && (profile?.role === 'admin' || profile?.role === 'leader');

// app/(tabs)/dashboard.tsx:321-325
if (isAdmin) {
  quickActions.push({
    id: 'admin', label: 'Admin', /* ... */
  });
}
```

This is binary role gating, not experimentation. Every user with the same role sees
the same app.

## Church Settings as Config

`hooks/church-settings-context.tsx` manages church configuration via a single
Supabase row. It stores church name, pastor, address, contact info, and service times.

```typescript
// ChurchSettings interface — all church-level config
export interface ChurchSettings {
  churchName: string;
  pastorName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  serviceTimes: ServiceTime[];
}
```

This table could be extended with feature flag columns (`enable_prayer_wall: boolean`,
`onboarding_version: number`), but mixing config and flags in one table is fragile.

**Better approach:** Add a `feature_flags` table with key/value pairs and a TTL cache
via TanStack Query. See the **tanstack-query** skill for cache configuration.

## Activation Experiments to Run

| Experiment | Hypothesis | Variants | Metric |
|-----------|-----------|----------|--------|
| Profile photo required | Requiring photo increases directory engagement | A: optional (current) B: required | Directory views per user |
| Onboarding checklist | Visible checklist increases family join rate | A: no checklist B: dashboard checklist | `family_joined` conversion |
| Welcome modal | Post-approval modal increases first-week activity | A: silent approval B: welcome modal | Sessions in first 7 days |
| Simplified dashboard | Fewer cards reduce new-user bounce | A: 6 cards B: 3 cards for new users | Time to first feature tap |
| Push notification CTA | Explicit opt-in prompt increases push adoption | A: silent (current) B: in-app prompt | Push registration rate |

## Role-Based Feature Gating

The existing role system provides a rudimentary rollout mechanism:

```typescript
// hooks/me-context.tsx:30-32
const isAdmin = profile?.role === 'admin';
const isLeader = profile?.role === 'leader';
const isAdminOrLeader = isAdmin || isLeader;
```

To roll out a new feature gradually:
1. Ship behind an `isAdminOrLeader` check first
2. Test with church leadership
3. Remove the gate to ship to all members

```typescript
// GOOD — progressive rollout via role gate
const showNewFeature = isAdminOrLeader; // Phase 1: leaders only
// Later: const showNewFeature = true; // Phase 2: everyone
```

This is not A/B testing, but it provides a safe deployment path for a small-community app.

## OTA Update Strategy

EBC Connect uses Expo Updates for OTA JS bundle pushes:

```bash
npx eas update  # Push JS changes without app store review
```

Runtime version policy is `appVersion`, so OTA updates only reach builds with matching
app versions. See the **eas** skill for build and update configuration.

**Activation flow changes are good candidates for OTA** because they are JS-only
(no native module changes). Profile screens, dashboard CTAs, and guidance surfaces
can all be updated without a store submission.

## Anti-Patterns

### WARNING: No Rollback Strategy for Activation Changes

If an activation flow change causes drop-off (e.g., a required step that blocks users),
there is no way to revert without pushing another OTA update or store build.

**The Fix:** Use a server-side flag in `church_settings` or a `feature_flags` table:

```typescript
// GOOD — server-controlled activation flow
const { data: flags } = useQuery({
  queryKey: ['feature-flags'],
  queryFn: () => supabase.from('feature_flags').select('*'),
  staleTime: 5 * 60 * 1000,
});
const requirePhoto = flags?.find(f => f.key === 'require_profile_photo')?.enabled ?? false;
```

Disable the flag server-side to instantly revert, no app update needed.

### WARNING: No Experiment Assignment Tracking

Without tracking which users see which variant, you cannot measure experiment results.
Even role-gated rollouts need to record `{ user_id, experiment, variant, timestamp }`
to correlate with outcomes.

## Rollout Checklist

Copy this checklist for shipping activation changes:

- [ ] Step 1: Define the change and its success metric
- [ ] Step 2: Gate behind admin/leader role or feature flag for initial test
- [ ] Step 3: Ship via OTA update (`npx eas update`)
- [ ] Step 4: Monitor for 48 hours (check Supabase logs, user reports)
- [ ] Step 5: Remove gate or expand to all users
- [ ] Step 6: Document the change in release notes (see **writing-release-notes** skill)
