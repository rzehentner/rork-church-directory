# Product Analytics Reference

## Contents
- Current Analytics State
- Key Journey Events to Instrument
- Activation Funnel Definition
- Engagement Metrics
- Implementation Patterns
- Anti-Patterns

## Current Analytics State

### WARNING: No Analytics Library Installed

**Detected:** No analytics SDK (Mixpanel, Amplitude, PostHog, Segment, expo-analytics) in `package.json`.

**Impact:** There is zero visibility into user behavior, funnel drop-off, feature adoption, or activation rates. Product decisions are made without data.

### Recommended Solution

For an Expo app with Supabase backend, use one of:

| Option | Best For | Install |
|--------|----------|---------|
| PostHog | Self-hostable, full suite | `bun add posthog-react-native` |
| Mixpanel | Event analytics, funnels | `bun add mixpanel-react-native` |
| Supabase edge function + table | Minimal, no new vendor | Custom — log to `analytics_events` table |

**Quick Start (Supabase-native approach):**

```typescript
// services/analytics.ts — lightweight event tracking via Supabase
import { supabase } from '@/lib/supabase';

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('analytics_events').insert({
    user_id: user?.id,
    event_name: eventName,
    properties,
    created_at: new Date().toISOString(),
  });
}
```

## Key Journey Events to Instrument

Map these events to the user journeys identified in the main skill:

### Activation Funnel Events

```typescript
// Track each step of the onboarding funnel
trackEvent('auth.signup_started');
trackEvent('auth.signup_completed');
trackEvent('auth.login_success', { method: 'password' | 'magic_link' | 'biometric' });
trackEvent('profile.visitor_started');
trackEvent('profile.visitor_completed', { skipped: boolean });
trackEvent('family.join_started');
trackEvent('family.join_completed', { method: 'create' | 'join' });
trackEvent('activation.complete'); // first meaningful action after setup
```

### Engagement Events

```typescript
// Core engagement actions
trackEvent('event.viewed', { eventId });
trackEvent('event.rsvp', { eventId, status: 'going' | 'maybe' | 'not_going' });
trackEvent('prayer.created', { anonymous: boolean });
trackEvent('prayer.prayed', { prayerId });
trackEvent('announcement.read', { announcementId });
trackEvent('form.submitted', { formId, mode: 'myself' | 'family' | 'other' });
trackEvent('potluck.claimed', { formId, itemId });
trackEvent('directory.searched', { query: string });
```

### Navigation Events

```typescript
// Feature discovery tracking
trackEvent('nav.tab_pressed', { tab: string });
trackEvent('nav.quick_action', { action: string });
trackEvent('nav.notification_opened', { notificationId });
```

## Activation Funnel Definition

Define activation as: **user has completed profile AND joined a family AND performed one engagement action** (RSVP, prayer, or form submission).

```
Signup → Profile Complete → Family Joined → First Action
  100%      ?%                  ?%              ?%
```

**Where to measure each step:**

| Step | Screen | Signal |
|------|--------|--------|
| Signup | `app/(auth)/login.tsx` | `auth.signup_completed` event |
| Profile | `app/visitor-profile.tsx` | `profile.visitor_completed` event |
| Family | `app/(tabs)/family.tsx` | `family.join_completed` event |
| First Action | Any engagement screen | First `event.rsvp` or `prayer.created` |

## Engagement Metrics

### Retention Signals

| Metric | Definition | Where to Measure |
|--------|-----------|-----------------|
| DAU/WAU | Unique users opening app | Entry gate (`app/index.tsx`) |
| Feature breadth | Distinct features used per session | Quick action taps + tab switches |
| Content creation | Events/prayers/announcements created | Service function calls |
| Social actions | RSVPs + prayers + form submissions | Service function calls |

### Feature Adoption Rates

Track which features users actually discover and use:

```typescript
// Measure adoption by comparing feature users to total active users
// Query: SELECT event_name, COUNT(DISTINCT user_id) FROM analytics_events
//        WHERE created_at > now() - interval '7 days'
//        GROUP BY event_name ORDER BY count DESC;
```

## Implementation Patterns

### DO: Track at Service Layer, Not UI Layer

```typescript
// GOOD — tracking in service ensures all paths are captured
// services/events.ts
export async function rsvpEvent(eventId: string, userId: string, status: string) {
  const result = await supabase.rpc('rsvp_event', { ... });
  trackEvent('event.rsvp', { eventId, status }); // always fires
  return result;
}
```

### DON'T: Track in UI Event Handlers

```typescript
// BAD — tracking in onPress misses programmatic calls and is easy to forget
<TouchableOpacity onPress={() => {
  trackEvent('event.rsvp', { eventId, status }); // fragile
  handleRSVP(status);
}}>
```

### DO: Use a Typed Event Catalog

```typescript
// GOOD — type-safe event names prevent typos and enable autocomplete
type AnalyticsEvent =
  | { name: 'auth.login_success'; properties: { method: string } }
  | { name: 'event.rsvp'; properties: { eventId: string; status: string } }
  | { name: 'prayer.created'; properties: { anonymous: boolean } };

function trackEvent<T extends AnalyticsEvent>(
  name: T['name'],
  properties: T['properties']
) { /* ... */ }
```

### DON'T: Fire Analytics on Every Render

```typescript
// BAD — useEffect without dependencies fires on every render cycle
useEffect(() => {
  trackEvent('screen.viewed', { screen: 'dashboard' });
}); // missing dependency array!
```

## Analytics Implementation Checklist

Copy this checklist and track progress:
- [ ] Choose analytics approach (PostHog, Mixpanel, or Supabase table)
- [ ] Create `services/analytics.ts` with typed event catalog
- [ ] Instrument activation funnel events (signup → profile → family → first action)
- [ ] Add engagement event tracking to service functions
- [ ] Track navigation events (tab presses, quick actions)
- [ ] Create Supabase view or dashboard for funnel analysis
- [ ] Add screen view tracking to root layout
- [ ] Ensure events fire on service success, not UI handler
