# Product Analytics Reference

## Contents
- Current State: Console.log Only
- Activation Funnel Definition
- Event Taxonomy
- Missing Infrastructure
- Implementation Approach
- Anti-Patterns

## Current State: Console.log Only

EBC Connect has **no analytics SDK**. All instrumentation is `console.log` with emoji
prefixes scattered across contexts and screens:

```typescript
// hooks/church-settings-context.tsx:110
console.log('📍 Loading church settings from Supabase');
// hooks/church-settings-context.tsx:144
console.log('💾 Saving church settings to Supabase:', newSettings.churchName);
// app/(tabs)/dashboard.tsx:136
console.log('🏷️ Loading tagged events for person:', myPersonId);
// hooks/user-context.tsx:129
console.log('Creating family with data:', familyData);
```

These logs are not structured, not queryable, and lost when the app closes. They provide
zero production visibility into user behavior.

## Activation Funnel Definition

The activation funnel for EBC Connect has these measurable steps:

| Step | Event Name | Source | Measurement |
|------|-----------|--------|-------------|
| 1. Signup | `account_created` | `app/(auth)/login.tsx` | Supabase auth event |
| 2. Profile started | `profile_form_opened` | `app/visitor-profile.tsx` mount | Screen view |
| 3. Profile completed | `profile_completed` | `visitor-profile.tsx:155` | `refetch()` succeeds |
| 4. Profile skipped | `profile_skipped` | `visitor-profile.tsx:189` | Skip button pressed |
| 5. Admin approved | `user_approved` | `app/(tabs)/admin.tsx` | Role change to `member` |
| 6. Family created | `family_created` | `hooks/user-context.tsx:128` | RPC succeeds |
| 7. Family joined | `family_joined` | `hooks/user-context.tsx:143` | Token join succeeds |
| 8. First event RSVP | `event_rsvp` | `services/events.ts` | RSVP mutation |
| 9. First prayer | `prayer_created` | `services/prayer.ts` | Insert succeeds |

**Activation = Steps 1 + 3 + 5 + (6 or 7)**. A user who has completed profile, been
approved, and joined a family is considered "activated."

## Event Taxonomy

Use this naming convention for product events:

```typescript
// Category_action format
interface ProductEvent {
  name: string;        // e.g., 'profile_completed'
  properties: {
    user_id: string;
    timestamp: string;
    screen?: string;   // Expo Router pathname
    [key: string]: unknown;
  };
}

// Activation events
'account_created'       // signup
'profile_completed'     // visitor-profile save
'profile_skipped'       // visitor-profile skip
'user_approved'         // admin approves account
'family_created'        // new family via RPC
'family_joined'         // join via token

// Engagement events
'event_viewed'          // event-detail screen
'event_rsvp'            // RSVP action
'prayer_created'        // new prayer request
'prayer_prayed'         // "I prayed" action
'announcement_read'     // mark as read
'directory_searched'    // search action
'notification_opened'   // tap notification
```

## Missing Infrastructure

### WARNING: No Analytics SDK

**Detected:** No analytics library in `package.json`
**Impact:** Zero visibility into user activation, retention, or feature adoption

**Recommended for Expo apps:**

| Option | Tradeoff |
|--------|----------|
| Expo Analytics (expo-insights) | Free, built into EAS, limited events |
| PostHog React Native | Open source, self-hostable, full funnel |
| Mixpanel React Native | Powerful funnels, paid at scale |
| Firebase Analytics | Free tier generous, Google ecosystem lock-in |

### WARNING: No Feature Flags

**Detected:** No feature flag system in dependencies or church settings
**Impact:** Cannot A/B test activation flows or progressively roll out changes

The `church_settings` table could serve as a basic feature flag store by adding boolean
columns, but this is not a production-grade solution.

## Implementation Approach

To add analytics without a third-party SDK, create a lightweight event logger:

```typescript
// lib/analytics.ts — minimal structured event logging
import { supabase } from '@/lib/supabase';

interface AnalyticsEvent {
  event_name: string;
  user_id?: string;
  properties?: Record<string, unknown>;
}

export async function trackEvent({ event_name, user_id, properties }: AnalyticsEvent) {
  // Log to Supabase table for server-side analysis
  const { error } = await supabase
    .from('analytics_events')
    .insert({ event_name, user_id, properties, created_at: new Date().toISOString() });

  if (error) console.error('Analytics error:', error.message);
}
```

Then instrument activation milestones:

```typescript
// app/visitor-profile.tsx — after successful save
await refetch();
trackEvent({ event_name: 'profile_completed', user_id: profile?.id });
```

See the **instrumenting-product-metrics** skill for full implementation guidance.

## Anti-Patterns

### WARNING: Using Console.log as Analytics

**The Problem:**

```typescript
// BAD — lost on app close, not queryable, no user attribution
console.log('🏷️ Loading tagged events for person:', myPersonId);
```

**Why This Breaks:**
1. Logs disappear when the app closes on native
2. No way to aggregate across users
3. No funnel analysis possible
4. Cannot measure conversion rates between activation steps

**The Fix:** Replace with structured events that persist to a queryable store.

### WARNING: Counting Queries as Engagement

The dashboard counts (events, announcements, prayers) measure **content volume**, not
**user engagement**. Having 5 upcoming events tells you nothing about whether users
are RSVPing, viewing details, or adding to calendars.

**The Fix:** Track user actions (views, taps, submissions), not data counts.
