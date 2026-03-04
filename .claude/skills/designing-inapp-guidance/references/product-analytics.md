# Product Analytics for Guidance

## Contents
- Current State
- WARNING: Missing Analytics Library
- Activation Metrics to Track
- Engagement Metrics to Track
- Measuring Guidance Effectiveness
- Lightweight Supabase Tracking Pattern

## Current State

EBC Connect has **no analytics library** in its dependencies. There is no tracking of screen views, feature usage, or guidance interaction. The notification context polls for unread counts but does not track engagement.

The only usage signals available today are Supabase database records:
- RSVP entries (`rsvp_status` on events)
- Prayer request counts (`prayer_requests_with_counts` view)
- Signup form submissions (`signup_status`)
- Announcement read status (`is_read` on `announcements_for_me`)

## WARNING: Missing Analytics Library

**Detected:** No analytics SDK (Amplitude, Mixpanel, PostHog, Segment, or even `expo-analytics`) in `package.json`.

**Impact:**
1. Cannot measure whether in-app guidance CTAs drive adoption
2. No visibility into which screens users visit or abandon
3. No funnel analysis for onboarding completion
4. No A/B testing infrastructure for guidance copy

**Recommended Approach:** Given the Supabase backend, track events server-side via a Supabase `analytics_events` table or RPC. This avoids adding a third-party SDK.

```sql
-- Supabase migration: lightweight event tracking
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_name text not null,
  properties jsonb default '{}',
  created_at timestamptz default now()
);

-- RPC for client-side tracking
create or replace function track_event(
  p_event_name text,
  p_properties jsonb default '{}'
) returns void as $$
begin
  insert into analytics_events (user_id, event_name, properties)
  values (auth.uid(), p_event_name, p_properties);
end;
$$ language plpgsql security definer;
```

## Activation Metrics to Track

These events map to the activation milestones that guidance should drive users toward.

| Event | Trigger | Properties |
|-------|---------|------------|
| `profile_completed` | Visitor profile saved | `{ has_photo: boolean }` |
| `family_joined` | User joins or creates family | `{ method: 'create' \| 'token' }` |
| `first_rsvp` | First event RSVP | `{ event_id, status }` |
| `first_prayer` | First prayer request created | `{ has_details: boolean }` |
| `biometric_enabled` | Biometric auth turned on | `{ type: 'face' \| 'fingerprint' }` |
| `notifications_enabled` | Push notifications enabled | `{}` |

```tsx
// services/analytics.ts — tracking helper
import { supabase } from '@/lib/supabase';

export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
) {
  try {
    await supabase.rpc('track_event', {
      p_event_name: eventName,
      p_properties: properties,
    });
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
    // NEVER block user actions on analytics failures
  }
}
```

### DO: Fire-and-forget analytics calls

Analytics should never block the UI or cause errors visible to users. Wrap in try-catch and log warnings only.

### DON'T: Track everything

Track activation milestones and guidance interactions — not every button tap. Excessive tracking bloats the database and makes analysis harder.

## Engagement Metrics to Track

These measure ongoing usage after activation.

| Event | Trigger | Properties |
|-------|---------|------------|
| `screen_viewed` | Screen mount | `{ screen: string }` |
| `announcement_read` | Announcement opened | `{ announcement_id }` |
| `event_rsvp_changed` | RSVP updated | `{ event_id, from, to }` |
| `prayer_prayed` | "I prayed" tapped | `{ prayer_id }` |
| `signup_submitted` | Form submitted | `{ form_id, form_type }` |
| `potluck_claimed` | Potluck item claimed | `{ form_id, item_id }` |

## Measuring Guidance Effectiveness

Track when guidance elements are shown and acted upon.

```tsx
// Example: tracking CTA interaction
<TouchableOpacity
  style={styles.joinFamilyCard}
  onPress={() => {
    trackEvent('guidance_cta_tapped', { cta: 'join_family', screen: 'dashboard' });
    router.push('/(tabs)/family');
  }}
>
```

| Metric | Formula | Target |
|--------|---------|--------|
| CTA tap rate | taps / impressions | > 15% |
| Completion rate | completions / taps | > 50% |
| Empty state exit rate | navigation away / empty state views | > 30% |
| Toast action rate | action taps / toasts with actions | > 10% |

### DO: Track both impression and interaction for guidance elements

You need both to calculate conversion rates. An impression fires when the component mounts; an interaction fires on press.

### DON'T: Use client-side timestamps for analytics

Use `created_at timestamptz default now()` in the database. Client clocks are unreliable and timezone-inconsistent.

## Lightweight Supabase Tracking Pattern

For projects that want analytics without a third-party SDK, query existing Supabase tables as proxy metrics.

```tsx
// Activation funnel from existing data (no new tables needed)
// Step 1: User created → auth.users count
// Step 2: Profile completed → people table where first_name is not null
// Step 3: Family joined → family_members table
// Step 4: First RSVP → event_rsvps table (earliest per user)
// Step 5: First prayer → prayer_requests table (earliest per user)

// Supabase RPC for admin dashboard activation funnel
const { data } = await supabase.rpc('get_activation_funnel');
```

This avoids adding new infrastructure while giving admins visibility into where users drop off. See the **supabase** skill for RPC patterns.
