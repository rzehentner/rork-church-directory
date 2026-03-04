# Roadmap & Experiments Reference

## Contents
- Current Feature Flag State
- Experiment Infrastructure Gaps
- Role-Based Feature Rollout
- OTA Update Strategy for Experiments
- Prioritizing Journey Improvements

## Current Feature Flag State

### WARNING: No Feature Flag System

**Detected:** No feature flag library (LaunchDarkly, Unleash, Statsig, GrowthBook, or custom) in dependencies. No `feature_flags` table in Supabase schema.

**Impact:** All features ship to 100% of users simultaneously. No ability to:
- A/B test onboarding flows
- Gradually roll out new screens
- Kill-switch a broken feature without an app update
- Target features by role beyond hardcoded `isAdminOrLeader` checks

### Recommended Solution

For this stack, use **Supabase + church_settings** as a lightweight flag system:

```typescript
// Leverage existing church-settings-context for flags
// hooks/church-settings-context.tsx already uses React Query
// Add a 'feature_flags' JSONB column to church_settings table

// Usage in screens:
const { settings } = useChurchSettings();
const isNewPrayerUIEnabled = settings?.feature_flags?.new_prayer_ui ?? false;

if (isNewPrayerUIEnabled) {
  return <NewPrayerScreen />;
}
return <PrayerScreen />;
```

This approach reuses the existing `ChurchSettingsProvider` (which already caches via React Query with 5-minute stale time) and requires no new dependencies. See the **tanstack-query** skill for cache configuration.

## Role-Based Feature Rollout

The existing role system provides a natural rollout mechanism:

```typescript
// hooks/me-context.tsx — existing role derivation
const isAdmin = myRole === 'admin';
const isLeader = myRole === 'leader';
const isAdminOrLeader = isAdmin || isLeader;
```

**Current role-gated features:**

| Feature | Gated To | Location |
|---------|----------|----------|
| Create events | Admin/Leader | `app/(tabs)/events.tsx` header button |
| Create announcements | Admin/Leader | `app/(tabs)/announcements.tsx` header |
| Bulk prayer actions | Admin/Leader | `app/(tabs)/prayers.tsx` select mode |
| Admin panel | Admin/Leader | `app/(tabs)/admin.tsx` (hidden tab) |
| User approval | Admin | `app/(tabs)/admin.tsx` approve mutation |

### DO: Gate at the UI Level AND Service Level

```typescript
// GOOD — UI hides the button, service validates the role
// UI layer (screen)
{isAdminOrLeader && <CreateButton onPress={handleCreate} />}

// Service layer (defense in depth)
export async function createEvent(data: EventInput) {
  // Supabase RLS policies enforce role checks server-side
  const { error } = await supabase.from('events').insert(data);
  if (error) throw error;
}
```

### DON'T: Gate Only in the UI

```typescript
// BAD — hiding a button doesn't prevent API calls
// A user who discovers the route can still navigate to /create-event
// and submit data if there's no server-side check
```

## OTA Update Strategy for Experiments

EAS Update enables JS-only changes without app store review. This makes it viable for rapid experiment iteration. See the **eas** skill for deployment details.

**Experiment deployment flow:**

1. Implement variant behind feature flag in `church_settings`
2. Deploy code with both variants via `npx eas update`
3. Enable flag for test group (leaders first, then members)
4. Measure via analytics events (see **instrumenting-product-metrics** skill)
5. Roll out to 100% or roll back by toggling the flag

### WARNING: No Staged Rollout for OTA Updates

**The Problem:** `eas update` publishes to all users on the matching runtime version. There's no built-in percentage rollout.

**Why This Breaks:** A broken JS update affects all users immediately. Combined with no feature flags, there's no way to limit blast radius.

**The Fix:** Use feature flags in `church_settings` as the gating mechanism, not OTA targeting. Ship code with the flag off, then enable server-side.

## Prioritizing Journey Improvements

Use this framework to prioritize which user journeys to improve first. See the **prioritizing-roadmap-bets** skill and **scoping-feature-work** skill for detailed frameworks.

### Impact vs Effort Matrix for EBC Connect Journeys

| Journey Fix | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Add empty states to forms/activity | High (reduces confusion) | Low (UI only) | P0 |
| Staged loading messages in entry gate | Medium (reduces perceived wait) | Low | P0 |
| Pending user dashboard guidance | High (reduces support requests) | Low | P1 |
| Consistent React Query refetch | High (data freshness) | Medium | P1 |
| Calendar add after RSVP | Medium (engagement loop) | Low | P1 |
| Feature flag via church_settings | High (enables experimentation) | Medium | P2 |
| Analytics event tracking | High (enables data-driven decisions) | Medium | P2 |
| Web-specific error modals | Medium (web UX) | Medium | P3 |

### Experiment Ideas by Journey

**Onboarding:**
- Variant A: Current skip-allowed visitor profile
- Variant B: Required profile completion (no skip button)
- Metric: Family join rate within 24 hours

**Feature Discovery:**
- Variant A: Current static quick action grid
- Variant B: Dynamic grid that surfaces incomplete actions first
- Metric: Feature breadth (distinct features used in first week)

**Prayer Engagement:**
- Variant A: Current simple "I Prayed" button
- Variant B: Add daily prayer streak counter
- Metric: Return rate to prayer screen within 7 days

## Experiment Planning Checklist

Copy this checklist and track progress:
- [ ] Define hypothesis: "If we [change], then [metric] will [direction] by [amount]"
- [ ] Identify the screen(s) and component(s) to modify
- [ ] Add feature flag to church_settings (default: off)
- [ ] Implement both variants with flag check
- [ ] Add analytics events for the metric being tested
- [ ] Deploy via `npx eas update`
- [ ] Enable flag for leaders/admins first
- [ ] Monitor for 1 week, check metrics
- [ ] Roll out to all users or revert
