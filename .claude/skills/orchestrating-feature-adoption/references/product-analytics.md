# Product Analytics Reference

## Contents
- Current State: No Analytics SDK
- Engagement Data Already in Supabase
- Queryable Adoption Metrics
- WARNING: Missing Professional Analytics
- Lightweight Tracking Pattern
- Notification Delivery Metrics
- Adoption Funnel Queries

## Current State: No Analytics SDK

EBC Connect has **no client-side analytics**. No Mixpanel, PostHog, Amplitude, or Segment in `package.json`. However, the Supabase backend captures engagement signals through its normal CRUD operations. This reference shows how to extract adoption metrics from existing data and how to add lightweight tracking without an external SDK.

## Engagement Data Already in Supabase

These tables capture engagement timestamps as a side effect of feature usage:

```sql
-- event_attendees: RSVP tracking
-- Key columns: person_id, event_id, status, responded_at
-- Created by: services/events.ts rsvpEvent() via RPC rsvp_to_event

-- prayer_prayed: Prayer engagement
-- Key columns: user_id, prayer_id, prayed_at, prayed_on
-- Created by: services/prayer.ts markPrayed() via RPC mark_prayed

-- announcement_reads: Read tracking
-- Key columns: announcement_id, person_id, read_at
-- Created by: lib/announcements.ts markAnnouncementRead() via RPC

-- signup_responses: Form submissions
-- Key columns: person_id, form_id, status, created_at
-- Created by: services/signup-forms.ts submitSignup() via RPC

-- notification_endpoints: Push registration
-- Key columns: user_id, token, platform, is_active, last_seen
-- Created by: lib/notifications.ts registerPushEndpoint()

-- notifications_outbound: Delivery tracking
-- Key columns: kind, status (pending/sent/failed), user_id, error
-- Queried by: lib/notifications.ts
```

## Queryable Adoption Metrics

These queries work against existing tables with no schema changes:

```sql
-- Daily active users by feature
SELECT DATE(responded_at) AS day, COUNT(DISTINCT person_id) AS users
FROM event_attendees
WHERE responded_at > now() - interval '30 days'
GROUP BY day ORDER BY day;

-- Feature adoption rate (% of members who used each feature at least once)
WITH members AS (
  SELECT COUNT(*) AS total FROM profiles WHERE role IN ('member', 'admin', 'leader')
)
SELECT
  'RSVP' AS feature,
  ROUND(100.0 * COUNT(DISTINCT ea.person_id) / m.total, 1) AS pct
FROM event_attendees ea, members m
UNION ALL
SELECT 'Prayer', ROUND(100.0 * COUNT(DISTINCT pp.user_id) / m.total, 1)
FROM prayer_prayed pp, members m
UNION ALL
SELECT 'Announcement', ROUND(100.0 * COUNT(DISTINCT ar.person_id) / m.total, 1)
FROM announcement_reads ar, members m
UNION ALL
SELECT 'Signup', ROUND(100.0 * COUNT(DISTINCT sr.person_id) / m.total, 1)
FROM signup_responses sr, members m;
```

```sql
-- RSVP conversion rate per event
SELECT
  e.title,
  COUNT(DISTINCT ea.person_id) AS total_responses,
  COUNT(DISTINCT CASE WHEN ea.status = 'going' THEN ea.person_id END) AS going,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ea.status = 'going' THEN ea.person_id END)
    / NULLIF(COUNT(DISTINCT ea.person_id), 0), 1) AS conversion_pct
FROM events e
LEFT JOIN event_attendees ea ON e.id = ea.event_id
GROUP BY e.id, e.title
ORDER BY conversion_pct DESC;
```

## WARNING: Missing Professional Analytics

**Detected:** No analytics library in `package.json`.

**Impact:**
- Cannot track screen views or navigation flows
- Cannot measure time-in-app or session length
- Cannot build proper funnels (impression -> interaction -> conversion)
- Cannot run cohort analysis (new vs returning users)
- Cannot correlate engagement with push notification delivery

**Recommended solution for Expo + Supabase stack:**

Option A — **PostHog** (self-hostable, privacy-friendly):
```bash
bun add posthog-react-native
```

Option B — **Lightweight Supabase table** (no new dependency):
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name, created_at);
CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at);
```

## Lightweight Tracking Pattern

If adding an `analytics_events` table, instrument the service layer:

```typescript
// services/analytics.ts — lightweight event tracker
import { supabase } from '@/lib/supabase';

export async function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_name: eventName,
      properties: properties ?? {},
    });
  } catch {
    // Analytics should never break the app
    // Silent failure is acceptable here
  }
}
```

```typescript
// DO — Fire-and-forget, never await in the UI flow
// services/events.ts — add after successful RSVP
export async function rsvpEvent(eventId: string, personId: string, status: RsvpStatus) {
  const { error } = await supabase.rpc('rsvp_to_event', { ... });
  if (error) throw error;
  trackEvent('event.rsvp', { eventId, status }); // fire-and-forget, no await
}

// DON'T — Block the user action on analytics
await trackEvent('event.rsvp', { eventId, status }); // BAD: adds latency
```

```typescript
// DON'T — Track everything
// Track decisions and outcomes, not every tap
// GOOD: trackEvent('prayer.created'), trackEvent('event.rsvp')
// BAD:  trackEvent('button.pressed'), trackEvent('screen.scrolled')
```

## Notification Delivery Metrics

The `notifications_outbound` table tracks push notification delivery:

```sql
-- Push notification delivery success rate
SELECT
  kind,
  COUNT(*) AS total,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) AS delivered,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'sent' THEN 1 END) / COUNT(*), 1) AS delivery_pct
FROM notifications_outbound
WHERE created_at > now() - interval '30 days'
GROUP BY kind;

-- Push opt-in rate
SELECT
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ne.is_active THEN ne.user_id END)
    / COUNT(DISTINCT p.id), 1) AS opt_in_pct
FROM profiles p
LEFT JOIN notification_endpoints ne ON p.id = ne.user_id
WHERE p.role IN ('member', 'admin', 'leader');
```

## Adoption Funnel Queries

```sql
-- Activation funnel: signup → profile → family → first action
SELECT
  COUNT(*) AS total_users,
  COUNT(CASE WHEN per.first_name IS NOT NULL THEN 1 END) AS profile_complete,
  COUNT(CASE WHEN per.family_id IS NOT NULL THEN 1 END) AS has_family,
  COUNT(CASE WHEN ea.person_id IS NOT NULL THEN 1 END) AS has_rsvp,
  COUNT(CASE WHEN pp.user_id IS NOT NULL THEN 1 END) AS has_prayed,
  COUNT(CASE WHEN ar.person_id IS NOT NULL THEN 1 END) AS has_read_announcement
FROM profiles p
LEFT JOIN persons per ON p.person_id = per.id
LEFT JOIN (SELECT DISTINCT person_id FROM event_attendees) ea ON per.id = ea.person_id
LEFT JOIN (SELECT DISTINCT user_id FROM prayer_prayed) pp ON p.id = pp.user_id
LEFT JOIN (SELECT DISTINCT person_id FROM announcement_reads) ar ON per.id = ar.person_id
WHERE p.role IN ('member', 'admin', 'leader', 'pending');
```

See the **instrumenting-product-metrics** skill for a comprehensive analytics implementation plan.
