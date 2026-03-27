# Engagement & Adoption Prioritization

## Contents
- Engagement Model Inventory
- Adoption Gaps to Prioritize
- Scoring Engagement Depth
- Anti-Patterns
- Checklist

## Engagement Model Inventory

EBC Connect has three distinct engagement tiers. Prioritize features that deepen engagement from one-time to daily.

### Tier 1: Daily Repeatable Actions

```typescript
// Prayer "mark prayed" — the deepest engagement loop in the app
// services/prayer.ts
export async function markPrayed(prayerRequestId: string) {
  // RPC: mark_prayed — records one prayer per user per day
  // Returns: updated total_prayers count
  // Resets daily: i_prayed_today flips back to false
}
// This is the ONLY daily-cadence engagement action in the entire app.
// Impact of improving this flow = highest engagement multiplier.
```

### Tier 2: Event-Driven Actions (Weekly/Monthly)

```typescript
// RSVP — one action per event
export async function rsvpEvent(eventId: string, status: 'going' | 'maybe' | 'declined') {
  const { data } = await supabase.rpc('rsvp_event', {
    p_event_id: eventId,
    p_status: status,
  });
}

// Signup form submission — one action per form
export async function submitSignup(formId: string, fields: SignupField[]) {
  const { data } = await supabase.rpc('submit_signup', { ... });
  // Returns: status 'confirmed' or 'waitlisted'
}

// Potluck claim — one action per item
export async function claimPotluckItem(itemId: string, personId: string) {
  const { data } = await supabase.rpc('claim_potluck_item', { ... });
}
```

### Tier 3: Passive Consumption (Read-Only)

```typescript
// Announcements — read-only feed, no interaction beyond viewing
// Dashboard stats — display only, no drill-down actions
// Directory — browse only, no messaging or follow
```

## Adoption Gaps to Prioritize

| Feature Surface | Current State | Gap | Priority Signal |
|----------------|---------------|-----|-----------------|
| Prayer engagement | Daily mark + count | No streaks, no threads, no "answered" celebration | **High** — only daily loop |
| Notification deep-links | Tap marks read only | Does not navigate to content | **High** — breaks re-engagement |
| Announcement engagement | Read-only | No reactions, no read receipts shown | **Medium** — data exists unused |
| Event post-attendance | RSVP only | No check-in, no post-event feedback | **Medium** — event lifecycle incomplete |
| Dashboard personalization | Tag-based "For You" | Empty until admin tags users | **High** — first screen users see |

## Scoring Engagement Depth

### DO: Prioritize features that increase action frequency

```typescript
// HIGH priority: Prayer streaks (deepens the only daily action)
// The data model already tracks per-user daily state:
interface PrayerRequest {
  i_prayed_today: boolean;    // ← already computed in the view
  total_prayers: number;      // ← already aggregated
  last_prayed_at: string;     // ← timestamp exists
}
// A streak counter needs NO new backend — just client-side
// consecutive-day calculation from last_prayed_at history.
```

### DO: Fix broken re-engagement loops first

```typescript
// CRITICAL gap: Notification tap does NOT navigate to content
// hooks/notification-context.tsx, line ~93:
const handleNotificationResponse = (response: any) => {
  const notificationData = response.notification.request.content.data;
  if (notificationData?.id) {
    markNotificationRead(notificationData.id);
    // ← STOPS HERE. No router.push() to the relevant screen.
    // Users tap a notification about an event and land on... nothing.
  }
};

// Fix: Add deep-link routing based on notification type
// This is LOW effort and HIGH impact on re-engagement.
```

### DON'T: Build new engagement features before fixing broken ones

```typescript
// BAD priority order:
// 1. Build chat feature (new tables, new screens, real-time)
// 2. Fix notification deep-links (one router.push call)
//
// GOOD priority order:
// 1. Fix notification deep-links (unblocks re-engagement)
// 2. Add announcement read receipts (data already exists)
// 3. Add prayer streaks (deepens existing daily action)
// 4. THEN consider net-new engagement features
```

## Anti-Patterns

### WARNING: Vanity Metrics Over Actionable Engagement

**The Problem:** Dashboard shows counts (upcoming events, unread announcements) but no engagement quality signal.

**Why This Breaks:** An admin cannot distinguish "100 members, 5 active" from "100 members, 80 active." Counts don't drive prioritization decisions.

**The Fix:** When adding metrics, track actions not views:

```typescript
// BAD — counting passive consumption
{ upcomingEventsCount: number }  // How many events exist (not actionable)

// GOOD — counting engagement actions
{ eventsRsvpedThisWeek: number }  // How many events users responded to
{ prayersPrayedToday: number }    // Daily active prayer engagement
```

### WARNING: Ignoring the Notification → Content Loop

**The Problem:** Push notifications bring users back to the app, but tapping them doesn't navigate to the relevant content.

**Why This Breaks:** Users learn that notifications are useless, disable them, and the entire re-engagement channel dies. This is the highest-leverage fix in the app.

**The Fix:** Route notification taps to the relevant screen:

```typescript
// notification-context.tsx — add deep-link routing
if (notificationData?.type === 'event') {
  router.push(`/event-detail?id=${notificationData.event_id}`);
} else if (notificationData?.type === 'announcement') {
  router.push('/(tabs)/announcements');
} else if (notificationData?.type === 'prayer') {
  router.push('/(tabs)/prayers');
}
```

## Checklist

Copy this checklist when prioritizing engagement work:
- [ ] Does this increase action frequency (daily > weekly > monthly)?
- [ ] Are broken engagement loops fixed before building new ones?
- [ ] Does the notification → content deep-link work for this feature?
- [ ] Can admins see engagement data (not just counts)?
- [ ] Does this feature have a natural re-engagement trigger?

See the **orchestrating-feature-adoption** skill for driving adoption of shipped features. See the **instrumenting-product-metrics** skill for measuring engagement.
