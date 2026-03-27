# Product Analytics Reference

## Contents
- Analytics State in EBC Connect
- Existing Tracking Surfaces
- Announcement Read Tracking
- Notification Tracking
- RSVP and Prayer Interaction Data
- WARNING: No Analytics SDK
- Deriving Release Impact from Supabase Data
- DO/DON'T Patterns
- Measuring Release Note Effectiveness

## Analytics State in EBC Connect

EBC Connect has **no dedicated analytics SDK** (no Mixpanel, Amplitude, PostHog, or Segment). User behavior is tracked implicitly through Supabase tables that record interactions. Release notes cannot reference "analytics" to users, but understanding what data exists helps write more targeted notes.

## Existing Tracking Surfaces

All "analytics" in this app come from Supabase tables that record user actions as a side effect of features:

| Table | What it tracks | Release note relevance |
|---|---|---|
| `announcement_reads` | Who read which announcement, when | Measures announcement reach |
| `event_rsvps` | RSVP status per user per event | Measures event engagement |
| `prayer_prayed` | Who prayed for which request | Measures prayer engagement |
| `signup_submissions` | Form submissions | Measures form completion |
| `notification_endpoints` | Push token registration | Measures notification reach |
| `user_notifications` | Notification delivery + read status | Measures notification engagement |

## Announcement Read Tracking

The `mark_announcement_read` RPC atomically records reads:

```typescript
// lib/announcements.ts
export async function markAnnouncementRead(announcementId: string): Promise<void> {
  await supabase.rpc('mark_announcement_read', { p_announcement_id: announcementId });
}
```

The `announcements_for_me` view exposes `is_read` as a computed boolean. This is the closest thing to "release note view tracking" — if you publish a "What's New" announcement, you can query how many people read it.

```sql
-- Check how many users read a specific announcement
SELECT COUNT(*) FROM announcement_reads
WHERE announcement_id = '<announcement-id>';
```

## Notification Tracking

Push notification delivery and read status are tracked:

```typescript
// lib/notifications.ts
export async function markNotificationAsRead(id: string) {
  await supabase.from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}
```

The `unreadCount` from `useNotifications` context drives the bell badge on the dashboard. This tells you how many users have unread notifications, but not which ones they engaged with.

## RSVP and Prayer Interaction Data

Event RSVPs track engagement per event:

```typescript
// services/events.ts — RSVP data
// rsvp_status enum: 'going' | 'maybe' | 'not_going'
// events_for_me view includes my_rsvp_status and attendance_count
```

Prayer interactions track individual "prayed" actions:

```typescript
// services/prayer.ts
// prayer_prayed table: prayer_request_id, person_id, prayed_at
// prayer_requests_with_counts view: total_prayers, has_prayed (per user)
```

These can inform release notes by showing which features have the most engagement — prioritize those in release notes.

## WARNING: No Analytics SDK

**Detected:** No analytics library in `package.json` (no Mixpanel, Amplitude, PostHog, Segment, or Firebase Analytics).

**Impact:** Cannot measure:
- Screen view frequency or duration
- Feature adoption rates
- Funnel drop-off (e.g., how many start sign-up vs. complete it)
- Release note announcement click-through
- A/B test results for different release note formats

**Workaround:** Use Supabase table queries (announcement reads, RSVP counts, prayer counts) as proxy engagement metrics. For true product analytics, consider adding a lightweight SDK.

**If adding analytics later**, the key events to instrument:
- `screen_view` with screen name
- `feature_used` with feature identifier
- `announcement_read` with announcement ID
- `rsvp_submitted` with event ID and status
- `prayer_created` and `prayer_prayed`

See the **supabase** skill for querying these tables directly.

## DO/DON'T Patterns

### DO: Use existing data to prioritize release note content

```markdown
// Query RSVP counts to see which features are most used
// If events have 10x more RSVPs than form submissions,
// lead release notes with event improvements
```

### DON'T: Claim analytics capabilities the app doesn't have

```markdown
// BAD — no screen tracking exists
- "We've seen that 80% of users visit the Events tab first"

// GOOD — based on actual data
- "Events is our most active feature based on RSVP activity"
```

### DO: Track release announcement reach

```markdown
// After publishing a "What's New" announcement, check:
SELECT COUNT(*) FROM announcement_reads
WHERE announcement_id = '<your-release-announcement-id>';
```

### DON'T: Add tracking URLs in announcement body

The announcement body is plain text displayed in-app. External URLs won't be clickable in the React Native `Text` component without explicit `Linking` handling (which the announcements screen doesn't implement).

## Measuring Release Note Effectiveness

Since there's no analytics SDK, use this approach:

1. Publish a "What's New" announcement via the admin panel
2. Wait 48-72 hours for read-through
3. Query `announcement_reads` for that announcement's ID
4. Compare read count to total active users (profiles with `role = 'member'`)
5. If read rate is low, consider using push notifications for the next release

### Validation Loop

1. Publish the announcement
2. Query: `SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = ?`
3. If read count < 50% of active members after 72 hours, send a push notification
4. Re-query after the push to measure lift
