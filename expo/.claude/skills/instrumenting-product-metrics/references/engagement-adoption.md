# Engagement & Adoption Metrics

## Contents
- Core Engagement Events
- Weekly Active User Definition
- Feature Adoption Tracking
- Anti-Patterns
- Retention Signals

## Core Engagement Events

These are the actions that define an engaged user in EBC Connect. Ordered by signal strength:

| Event | Signal Strength | Source File | Current Tracking |
|-------|----------------|-------------|-----------------|
| `event_rsvp` | High | `app/(tabs)/events.tsx` | None |
| `prayer_prayed` | High | `app/(tabs)/prayers.tsx` | None |
| `signup_submitted` | High | `app/signup-form.tsx` | None |
| `potluck_claimed` | Medium | `app/potluck-sheet.tsx` | None |
| `announcement_read` | Low | `app/(tabs)/announcements.tsx` | None |
| `directory_contact_tapped` | Low | `app/(tabs)/directory.tsx` | None |

### RSVP Tracking — Highest Value Event

The RSVP flow in `app/(tabs)/events.tsx` uses optimistic updates. Track AFTER the server confirms:

```typescript
// In events.tsx handleRSVP, after rsvpEvent() succeeds
const handleRSVP = async (eventId: string, status: RSVPStatus) => {
  // ... optimistic update ...
  try {
    await rsvpEvent(eventId, status);
    posthog.capture('event_rsvp', {
      event_id: eventId,
      status,  // 'going' | 'maybe' | 'declined'
      is_change: previousStatus !== null,
    });
  } catch (error) {
    // ... revert optimistic update ...
  }
};
```

### Prayer Engagement — Daily Retention Signal

`prayers.tsx` toggles between `markPrayed` and `unmarkPrayedToday`. Track both:

```typescript
// In prayers.tsx handlePrayToggle
if (prayer.i_prayed_today) {
  await unmarkPrayedToday(prayer.id);
  posthog.capture('prayer_unprayed', { prayer_id: prayer.id });
} else {
  await markPrayed(prayer.id);
  posthog.capture('prayer_prayed', { prayer_id: prayer.id });
}
```

### Signup Submission — Conversion With Outcome

The `submitSignup` RPC returns `confirmed` or `waitlisted`. Track the outcome:

```typescript
// In signup-form.tsx after submitSignup succeeds
const result = await submitSignup(params);
posthog.capture('signup_submitted', {
  form_id: formId,
  event_id: eventId,
  signup_mode: mode,  // 'myself' | 'family' | 'other'
  result: result.status,  // 'confirmed' | 'waitlisted'
});
```

## Weekly Active User (WAU) Definition

A user is **weekly active** if they performed at least ONE of these within the last 7 days:
- `event_rsvp` (any status)
- `prayer_prayed`
- `signup_submitted`
- `potluck_claimed`
- `prayer_request_created`

**Do NOT count** passive actions as WAU signals:
- `dashboard_viewed` — opens automatically
- `notification_tapped` — reactive, not intentional
- `announcement_read` — passive consumption

## Feature Adoption Tracking

For each major feature, track first-time usage with a `$set_once` property:

```typescript
// First RSVP ever
posthog.capture('event_rsvp', { status, event_id });
posthog.people.set_once({ first_rsvp_date: new Date().toISOString() });

// First prayer ever
posthog.capture('prayer_prayed', { prayer_id });
posthog.people.set_once({ first_prayer_date: new Date().toISOString() });
```

This lets you build adoption cohorts: "users who RSVPed within 7 days of activation" vs. those who didn't.

## WARNING: Tracking Optimistic State Instead of Server State

**The Problem:**

```typescript
// BAD — fires before server confirms, may never succeed
setOptimisticRSVP(eventId, status);
posthog.capture('event_rsvp', { status });
await rsvpEvent(eventId, status); // might fail
```

**Why This Breaks:**
1. Inflated event counts when server calls fail
2. Funnel analysis shows false conversions
3. Cannot trust any metric built on these events

**The Fix:**

```typescript
// GOOD — track after server confirmation
try {
  await rsvpEvent(eventId, status);
  posthog.capture('event_rsvp', { status, event_id: eventId });
} catch (error) {
  posthog.capture('event_rsvp_failed', { error: error.message });
  revertOptimisticUpdate();
}
```

## WARNING: Tracking Page Views Without Context

**The Problem:**

```typescript
// BAD — useless without context
posthog.capture('screen_viewed');
```

**Why This Breaks:**
1. No way to segment by screen
2. Cannot build feature-specific funnels
3. High-volume, low-signal noise

**The Fix:**

```typescript
// GOOD — structured with screen identity
posthog.capture('screen_viewed', {
  screen: 'events',
  entry_point: 'dashboard_hub',  // how they got here
});
```

## DO/DON'T

```typescript
// DON'T — Track every button press
onPress={() => {
  posthog.capture('button_pressed', { label: 'Going' });
  handleRSVP('going');
}}

// DO — Track meaningful outcomes
onPress={() => handleRSVP('going')}
// Track inside handleRSVP after server success
```

```typescript
// DON'T — Use generic event names
posthog.capture('action', { type: 'rsvp', subtype: 'going' });

// DO — Use specific, filterable event names
posthog.capture('event_rsvp', { status: 'going' });
```

## Retention Signals

Track these to measure re-engagement:

| Signal | Event | Where |
|--------|-------|-------|
| Return visit | `dashboard_viewed` | `app/(tabs)/dashboard.tsx` on mount |
| Push re-entry | `notification_tapped` | `hooks/notification-context.tsx` response listener |
| Biometric login | `sign_in` with `method: biometric` | `app/(auth)/login.tsx` |

### Dashboard as Session Start Proxy

```typescript
// In dashboard.tsx useEffect on mount
useEffect(() => {
  posthog.capture('dashboard_viewed', {
    family_members_count: stats.familyMembersCount,
    upcoming_events_count: stats.upcomingEventsCount,
    unread_announcements: stats.unreadAnnouncementsCount,
  });
}, []);
```

## Engagement Instrumentation Checklist

Copy this checklist and track progress:
- [ ] Add `event_rsvp` in `app/(tabs)/events.tsx` after `rsvpEvent()` succeeds
- [ ] Add `prayer_prayed` / `prayer_unprayed` in `app/(tabs)/prayers.tsx`
- [ ] Add `signup_submitted` in `app/signup-form.tsx` with `result` property
- [ ] Add `potluck_claimed` / `potluck_unclaimed` in `app/potluck-sheet.tsx`
- [ ] Add `dashboard_viewed` in `app/(tabs)/dashboard.tsx` mount effect
- [ ] Add `notification_tapped` in `hooks/notification-context.tsx` response listener
- [ ] Set `$set_once` properties for first-time feature usage
- [ ] Verify WAU query returns plausible numbers before sharing

## Related Skills

- See the **orchestrating-feature-adoption** skill for driving adoption
- See the **tanstack-query** skill for mutation callback patterns
- See the **mapping-conversion-events** skill for conversion tracking
