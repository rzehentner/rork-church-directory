# Measurement & Testing Reference

## Contents
- WARNING: No Analytics SDK
- Current Measurement Surfaces
- Copy Testing Without Analytics
- Messaging Metrics to Track
- A/B Testing Copy Changes
- Validation Workflow for Copy Changes
- Instrumentation Checklist

## WARNING: No Analytics SDK

**Detected:** No analytics library (Segment, Amplitude, Mixpanel, PostHog) in `package.json`. No event tracking infrastructure exists.

**Impact:** There is no way to measure whether a copy change improves conversion. Every messaging decision is a guess.

**Recommended Solution:**

Install an analytics SDK and instrument key copy-related events. See the **instrumenting-product-metrics** skill for full setup guidance.

**Quick Start (PostHog example):**

```bash
bun add posthog-react-native
```

```typescript
// lib/analytics.ts
import PostHog from 'posthog-react-native';

export const analytics = new PostHog('YOUR_KEY', {
  host: 'https://app.posthog.com',
});
```

**Why This Matters:** Without analytics, you can't distinguish a copy change that increased profile completion from one that decreased it. Every conversion surface in this app needs event tracking before copy optimization becomes data-driven.

## Current Measurement Surfaces

Even without analytics, some engagement signals are available in the database:

| Signal | Source | What It Measures |
|--------|--------|------------------|
| Profile completion rate | `persons` table (non-null `first_name`, `last_name`) | Visitor-profile copy effectiveness |
| Family join rate | `family_members` table | "Join Your Family" CTA effectiveness |
| RSVP rate | `event_rsvps` table | Event description + CTA copy |
| Prayer creation rate | `prayer_requests` table | Prayer gate copy + "New" CTA |
| Announcement read rate | `announcement_reads` table | Announcement title copy |
| Push notification open rate | Expo Notifications (if tracked) | Notification copy |

Query these via Supabase dashboard or RPC functions to establish baselines before changing copy.

## Copy Testing Without Analytics

Until an analytics SDK is integrated, use these proxy methods:

### Method 1: Database Before/After

```typescript
// Supabase query — count profile completions per day
const { count } = await supabase
  .from('persons')
  .select('*', { count: 'exact' })
  .not('first_name', 'is', null)
  .gte('updated_at', '2026-02-01');
```

1. Record the count before the copy change
2. Deploy the change via `npx eas update`
3. Wait 7 days
4. Record the count again
5. Compare — but note this is NOT a controlled experiment

### Method 2: Console Logging (Development Only)

```typescript
// TEMPORARY — remove before production
console.log('[CTA_IMPRESSION]', { screen: 'dashboard', cta: 'complete_profile' });
console.log('[CTA_TAP]', { screen: 'dashboard', cta: 'complete_profile' });
```

**WARNING:** Console logging is NOT analytics. It only works during development with a connected debugger. Remove before shipping.

### Method 3: Feature Flags via Church Settings

The app already has a `church_settings` table queried via React Query. Use it as a lightweight feature flag:

```typescript
// hooks/church-settings-context.tsx — existing pattern
const { data: settings } = useQuery({
  queryKey: ['church-settings'],
  queryFn: fetchChurchSettings,
});

// Use a setting to toggle between copy variants
const ctaText = settings?.profile_cta_variant === 'B'
  ? 'Tell us about yourself'
  : 'Complete Your Profile';
```

This lets you change copy server-side without an app update, but it's not randomized A/B testing.

## Messaging Metrics to Track

When analytics is added, instrument these copy-specific events:

```typescript
// CTA impressions — fired when a CTA renders on screen
analytics.capture('cta_impression', {
  screen: 'dashboard',
  cta_id: 'complete_profile',
  cta_text: 'Complete Your Profile',
  user_role: person?.role,
});

// CTA taps — fired on press
analytics.capture('cta_tap', {
  screen: 'dashboard',
  cta_id: 'complete_profile',
  cta_text: 'Complete Your Profile',
});

// Empty state impressions — fired when empty state renders
analytics.capture('empty_state_impression', {
  screen: 'prayers',
  has_action_hint: true,
});
```

**Key ratio:** `cta_tap / cta_impression` = tap-through rate. Target >15% for primary CTAs, >5% for secondary.

## A/B Testing Copy Changes

Without a proper experimentation framework, use this manual process:

1. Identify the copy to test (e.g., dashboard profile CTA)
2. Write variant B copy following the voice rules in [content-copy.md](content-copy.md)
3. Add a church_settings toggle (see Method 3 above)
4. Enable variant B for 50% of the time period (e.g., week 1 = A, week 2 = B)
5. Compare the conversion metric from the database
6. Keep the winner, remove the toggle

**Limitation:** This is a time-split test, not a user-split test. Confounding variables (holidays, events calendar) will affect results.

## Validation Workflow for Copy Changes

1. Edit the copy string in the screen file
2. Run `npx tsc --noEmit` to catch template literal or type errors
3. Run `expo lint` to catch formatting issues
4. Test on device: verify the string renders correctly at all screen sizes
5. If the string includes dynamic values (`${person?.first_name}`), test with null/undefined values
6. If validation fails, fix and repeat from step 2

## Instrumentation Checklist

Copy this checklist when adding measurement to a new messaging surface:

- [ ] CTA impression event fires when the component mounts/becomes visible
- [ ] CTA tap event fires on press handler
- [ ] Both events include `screen`, `cta_id`, `cta_text`, `user_role`
- [ ] Empty state impression event fires with `has_action_hint` boolean
- [ ] Error message events include `error_type` (not the raw error message)
- [ ] Toast events distinguish success vs error vs warning
- [ ] No PII (email, phone) in event properties

See the **instrumenting-product-metrics** skill for the full analytics setup.
See the **mapping-conversion-events** skill for funnel event definitions.
