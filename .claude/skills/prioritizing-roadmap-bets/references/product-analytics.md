# Product Analytics Prioritization

## Contents
- Current State
- What to Instrument First
- Proxy Signals Available Today
- Anti-Patterns
- Checklist

## Current State

**EBC Connect has zero product analytics instrumentation.** No Mixpanel, no Amplitude, no PostHog, no Firebase Analytics, no custom event tracking. There are no `track()` calls anywhere in the codebase.

This means prioritization decisions are made blind — without data on which features users actually use, how often they engage, or where they drop off.

### WARNING: Missing Product Analytics Platform

**Detected:** No analytics library in `package.json` dependencies.

**Impact:** Cannot measure feature adoption, cannot validate roadmap bets, cannot identify drop-off points. Every prioritization decision is based on assumption, not evidence.

**Recommended Solution:**

PostHog (already a transitive dependency via `@posthog/core` in `bun.lock`) or Expo's built-in analytics via EAS Insights.

```bash
# PostHog (self-hostable, product analytics + session replay)
bun add posthog-react-native

# OR minimal: Expo Application Analytics (built into EAS)
# No install needed — configure in app.json
```

**Why This Matters:** Without analytics, the team cannot distinguish a feature used by 80% of members from one used by 2%. Every roadmap discussion becomes opinion vs. opinion.

## What to Instrument First

Prioritize events that answer: "Is this feature worth keeping/improving?"

### Tier 1: Activation Events (Highest Priority)

```typescript
// Track these to understand if new users activate:
track('signup_completed');
track('profile_completed', { has_name: true });
track('approval_received');  // Server-side or on next login
track('first_prayer_created');
track('first_rsvp');
track('first_announcement_read');
```

### Tier 2: Core Engagement Events

```typescript
// Track these to measure daily/weekly engagement:
track('prayer_marked', { prayer_id, is_own: boolean });
track('event_rsvped', { event_id, status: 'going' | 'maybe' | 'declined' });
track('signup_submitted', { form_id, status: 'confirmed' | 'waitlisted' });
track('potluck_claimed', { item_id });
track('announcement_viewed', { announcement_id });
```

### Tier 3: Feature Discovery Events

```typescript
// Track these to measure if users find hidden features:
track('tab_navigated', { tab: string });  // Which hidden tabs get visited
track('quick_action_tapped', { action: string });  // Dashboard card taps
track('notification_tapped', { type: string });  // Re-engagement signal
track('calendar_exported', { format: 'ics' | 'device' });
```

## Proxy Signals Available Today

Without analytics, use these existing data points as proxy engagement metrics:

### Database-Queryable Signals

```sql
-- Active prayers (engagement proxy)
SELECT COUNT(*) FROM prayer_requests WHERE status = 'open';

-- RSVP rate per event (adoption proxy)
SELECT e.title,
  COUNT(r.*) as rsvp_count,
  e.total_recipients
FROM events e
LEFT JOIN event_rsvps r ON r.event_id = e.id
GROUP BY e.id;

-- Announcement read rate (already in schema, not displayed)
SELECT title, read_count, total_recipients,
  ROUND(read_count::decimal / NULLIF(total_recipients, 0) * 100) as read_pct
FROM announcements
WHERE published_at IS NOT NULL;

-- Signup form fill rate
SELECT f.title,
  COUNT(r.*) as responses,
  f.max_signups
FROM signup_forms f
LEFT JOIN signup_responses r ON r.form_id = f.id AND r.status != 'cancelled'
GROUP BY f.id;
```

### Client-Side Signals

```typescript
// Notification unread count — already computed
const { unreadCount } = useNotifications();
// High unread = low engagement (users aren't opening the app)

// Network of features a user has visited — could track in AsyncStorage
// But this is a band-aid. Install proper analytics.
```

## Scoring Analytics Initiatives

### DO: Instrument activation funnel first

```typescript
// The activation funnel is the highest-leverage measurement:
// signup → pending → approved → first_action
// Without this, you cannot optimize the most critical path.
// Effort: ~20 track() calls across 5 files
// Impact: Unlocks data-driven activation improvement
```

### DON'T: Instrument everything at once

```typescript
// BAD — adding 50 tracking events in one PR
// This creates noise, makes it hard to validate data quality,
// and slows down the app with unnecessary network calls.

// GOOD — instrument one funnel at a time:
// Phase 1: Activation (signup → first action)
// Phase 2: Core engagement (prayer, RSVP, signup)
// Phase 3: Feature discovery (navigation, search)
```

### DO: Surface existing data before adding new collection

```typescript
// The announcements table ALREADY has read_count and total_recipients.
// Displaying these in the admin tab is ZERO additional data collection.
// Priority: Show existing data > Collect new data > Build dashboards
```

## Anti-Patterns

### WARNING: Building Features Without Measurement

**The Problem:** Shipping features without tracking whether anyone uses them.

**Why This Breaks:** The roadmap accumulates features that may have zero adoption. Without usage data, underperforming features never get cut, and the app grows bloated. Maintenance cost rises with no engagement return.

**The Fix:** Every new feature should ship with at least one tracking event. Use the **instrumenting-product-metrics** skill for implementation patterns.

### WARNING: Confusing Server Logs With Product Analytics

**The Problem:** Assuming Supabase request logs or error logs substitute for product analytics.

**Why This Breaks:** Server logs tell you what the system did, not what the user experienced. They can't tell you: Did the user find the feature? Did they complete the flow? Did they come back?

**The Fix:** Product analytics tracks user intent and outcomes. Server logs track system behavior. Both are needed; neither replaces the other.

## Checklist

Copy this checklist when prioritizing analytics work:
- [ ] Is there any analytics platform installed? (Currently: NO)
- [ ] Are activation funnel events instrumented?
- [ ] Are core engagement actions tracked (prayer, RSVP, signup)?
- [ ] Are existing DB metrics (read_count, total_recipients) surfaced in admin UI?
- [ ] Does every new feature ship with at least one tracking event?
- [ ] Is there a dashboard where admins can see engagement trends?

See the **instrumenting-product-metrics** skill for implementation. See the **mapping-conversion-events** skill for funnel design.
