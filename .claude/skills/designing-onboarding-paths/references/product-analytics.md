# Product Analytics Reference

## Contents
- Current Analytics State
- Missing Analytics Infrastructure
- Key Activation Events to Track
- Engagement Metrics
- Implementing Analytics
- Supabase-Based Metrics
- Anti-Patterns

## Current Analytics State

EBC Connect has **no analytics library** integrated. The app uses `console.log` for development-time debugging only. This means:

- No tracking of onboarding completion rates
- No feature usage metrics
- No retention or engagement data
- No funnel visibility (signup → profile → family → active usage)

The notification system and React Query polling provide some server-side signals, but there is no client-side event tracking.

## WARNING: Missing Professional Analytics

**Detected:** No analytics library in dependencies (no Segment, Mixpanel, Firebase Analytics, PostHog, or Amplitude).

**Impact:** Cannot measure onboarding conversion, feature adoption, or engagement. Product decisions are made blind.

### Recommended Solution

For an Expo app, use `expo-analytics` patterns with a provider like PostHog (privacy-friendly, self-hostable) or Firebase Analytics (free, Google ecosystem):

```bash
bun add @posthog/react-native
# OR
bun add @react-native-firebase/analytics
```

### Quick Start (PostHog Example)

```typescript
// lib/analytics.ts
import PostHog from '@posthog/react-native';

export const posthog = new PostHog('phc_YOUR_KEY', {
  host: 'https://app.posthog.com',
});

// Track activation events
export function trackOnboardingStep(step: string, properties?: Record<string, any>) {
  posthog.capture('onboarding_step_completed', { step, ...properties });
}

export function trackFeatureUsed(feature: string) {
  posthog.capture('feature_used', { feature });
}
```

## Key Activation Events to Track

These events map directly to the onboarding state machine:

| Event | Trigger Location | Properties |
|-------|-----------------|------------|
| `signup_completed` | `app/(auth)/login.tsx` after `signUp()` | `method: 'email' \| 'magic_link'` |
| `profile_completed` | `app/visitor-profile.tsx` after save | `has_avatar`, `has_phone`, `has_dob` |
| `profile_skipped` | `app/visitor-profile.tsx` skip handler | — |
| `family_joined` | `app/join-family.tsx` success | `method: 'replace' \| 'token'` |
| `family_created` | User context `createFamily()` | `member_count` |
| `biometric_enabled` | `app/(auth)/login.tsx` enable prompt | `type: 'fingerprint' \| 'face'` |
| `notification_enabled` | `app/(tabs)/settings.tsx` toggle | `categories[]` |

## Engagement Metrics

Track these post-activation events to measure ongoing engagement:

```typescript
// Events to instrument
'event_rsvp'         // { event_id, status: 'going'|'maybe'|'declined' }
'prayer_created'     // { is_anonymous }
'prayer_prayed'      // { prayer_id }
'announcement_read'  // { announcement_id, from_tag: boolean }
'form_submitted'     // { form_id, field_count }
'directory_searched'  // { query_length }
'calendar_exported'  // { event_id }
```

### Activation Funnel

The critical funnel to measure:

```
Signup → Profile Complete → Family Joined → First RSVP → Weekly Active
  100%      ?%                  ?%              ?%            ?%
```

Without analytics, these conversion rates are unknown.

## Implementing Analytics

### Where to Instrument

Place analytics calls alongside existing action handlers. NEVER create separate analytics-only effects.

```typescript
// DO — instrument inside existing handler
const handleSaveProfile = async () => {
  // ... existing validation and save logic ...
  await refetch();
  trackOnboardingStep('profile_completed', {
    has_avatar: !!avatarUrl,
    has_phone: !!profileForm.phone,
  });
  Alert.alert('Success', ...);
};

// DON'T — separate useEffect watching for analytics
useEffect(() => {
  if (person?.first_name) {
    trackOnboardingStep('profile_completed'); // Fires on every render!
  }
}, [person]);
```

### User Identification

Tie analytics to Supabase auth user ID:

```typescript
// In auth-context.tsx after successful sign-in
posthog.identify(user.id, {
  role: profile?.role,
  has_person: !!person,
  has_family: !!family,
});
```

## Supabase-Based Metrics

Even without a client-side analytics tool, you can query Supabase for basic metrics:

```sql
-- Activation funnel from Supabase
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM persons WHERE persons.user_id = profiles.id
  )) as completed_profile,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM persons p WHERE p.user_id = profiles.id AND p.family_id IS NOT NULL
  )) as joined_family
FROM profiles
WHERE created_at > NOW() - INTERVAL '30 days';
```

See the **supabase** skill for query patterns and RPC function usage.

## Anti-Patterns

### WARNING: Tracking Everything

**The Problem:**

Instrumenting every button tap, scroll, and screen view without a hypothesis.

**Why This Breaks:**
1. Data noise makes real signals impossible to find
2. Performance overhead from excessive event volume
3. Storage costs grow unbounded
4. Privacy concerns with over-collection

**The Fix:**

Only track events that answer a specific product question. Start with the activation funnel, then add engagement events one at a time as questions arise.

### WARNING: Analytics in useEffect

**The Problem:**

```typescript
// BAD — fires on mount, re-render, and dependency changes
useEffect(() => {
  trackEvent('screen_viewed', { screen: 'dashboard' });
}, []);
```

**Why This Breaks:**
1. React 18+ strict mode double-fires effects in development
2. Tab switches re-mount screens, inflating view counts
3. No connection to user intent — viewing isn't engaging

**The Fix:**

Track user *actions* (taps, submissions, toggles) in event handlers, not passive views in effects. If screen views matter, use Expo Router's navigation events.
