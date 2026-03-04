# Growth Engineering Reference

## Contents
- Growth Loops in EBC Connect
- Viral Loop: Family Invites
- Notification-Driven Re-engagement
- Admin Approval Lag as a Churn Risk
- Feature Adoption Triggers
- Anti-Patterns

---

## Growth Loops in EBC Connect

EBC Connect has two natural growth loops:

**Viral loop:** Existing member invites family → family member joins → family group grows → more engagement signals → existing member invites more family.

**Content loop:** Admin creates event/announcement → members RSVP/read → engagement increases → admin creates more content → attracts more members.

Both loops are measurable. The viral loop runs through `app/join-family.tsx` (invite code entry). The content loop runs through `app/(tabs)/events.tsx` and `app/(tabs)/announcements.tsx`.

---

## Viral Loop: Family Invites

The family invite token is a 6-character alphanumeric code generated when a family is created. It's the primary referral mechanic in the app. Track the full loop:

```typescript
// app/(tabs)/family.tsx — when user copies/shares invite code
import * as Clipboard from 'expo-clipboard';

const handleCopyInviteCode = async (token: string) => {
  await Clipboard.setStringAsync(token);
  posthog.capture('invite_code_copied', { token_length: token.length });
  showToast('success', 'Invite code copied!');
};

// app/(tabs)/family.tsx — when user shares invite link
import * as Sharing from 'expo-sharing';

const handleShareInviteLink = async (token: string) => {
  await Sharing.shareAsync(`Join our family on EBC Connect with code: ${token}`);
  posthog.capture('invite_link_shared', { method: 'native_share' });
};
```

Track the receiving end in `app/join-family.tsx`:

```typescript
// app/join-family.tsx — handleJoinFamily
const handleJoinFamily = async () => {
  const { familyId, error } = await joinFamily(joinToken);
  posthog.capture('invite_code_used', {
    success: !error,
    family_id: familyId ?? null,
    token_length: joinToken.length,
  });
};
```

Query viral coefficient (invites sent ÷ new users from invites) via Supabase:

```sql
SELECT
  COUNT(DISTINCT p.family_id) AS families_with_multiple_members,
  COUNT(*) AS total_persons,
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT p.family_id), 0), 1) AS avg_family_size
FROM persons p
WHERE p.family_id IS NOT NULL;
```

---

## Notification-Driven Re-engagement

Push notifications are the primary re-engagement lever. The scheduled reminder system via `services/events.ts` → `supabase.rpc('schedule_event_reminder')` already exists. Track reminder-to-RSVP conversion:

```typescript
// lib/notifications.ts — in the response handler for notification taps
// Check if the notification type was an event reminder
if (data?.type === 'event_reminder' && data?.event_id) {
  posthog.capture('reminder_to_event_view', {
    event_id: data.event_id,
    minutes_before: data.minutes_before,
  });
  // Existing router.push('/event-detail', ...) logic
}
```

The `notification_context.tsx` already tracks unread counts. Surface the count in PostHog to understand notification engagement depth:

```typescript
// hooks/notification-context.tsx — when unreadCount changes
useEffect(() => {
  if (unreadCount > 0) {
    posthog.capture('notifications_unread_count_seen', { count: unreadCount });
  }
}, [unreadCount]);
```

---

## Admin Approval Lag as a Churn Risk

New users with `role = 'pending'` cannot access full app features until an admin approves them. This is the most dangerous churn point: a motivated new member who waits >48 hours without approval will likely abandon the app.

Instrument the lag measurement directly in the admin screen:

```typescript
// app/(tabs)/admin.tsx — when admin views pending users list
const pendingWithAge = pendingUsers.map(u => ({
  ...u,
  hours_waiting: (Date.now() - new Date(u.created_at).getTime()) / 3_600_000,
}));

const urgentPending = pendingWithAge.filter(u => u.hours_waiting > 24);

if (urgentPending.length > 0) {
  posthog.capture('pending_users_over_24h', {
    count: urgentPending.length,
    max_hours: Math.max(...urgentPending.map(u => u.hours_waiting)),
  });
}
```

Push a reminder notification to admins after 24 hours via Supabase Edge Function (scheduled via `pg_cron`):

```sql
-- Supabase scheduled job: notify admins of pending users every 24h
SELECT cron.schedule(
  'notify-admins-pending-users',
  '0 9 * * *',  -- 9 AM daily
  $$
  SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/notify-pending-users',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_key') || '"}'::jsonb
  )
  $$
);
```

---

## Feature Adoption Triggers

After activation (Stages 1–4), drive feature breadth via timed nudges. Use the `church_settings` table (already in `hooks/church-settings-context.tsx`) to store feature flag thresholds without a native build:

```typescript
// hooks/church-settings-context.tsx — add to ChurchSettings type
feature_nudge_enabled: boolean;
feature_nudge_delay_days: number;
```

Track feature adoption breadth — how many distinct features a user has touched:

```typescript
// Track each feature area visit once per session
const TRACKED_FEATURES = ['events', 'prayers', 'announcements', 'directory', 'forms', 'family'];

// app/(tabs)/_layout.tsx or per-screen on first mount
posthog.capture('feature_visited', {
  feature: 'events',      // or 'prayers', etc.
  is_first_visit: !hasVisitedEvents,
});
```

Query feature breadth in Supabase once PostHog events are flowing — or build a lightweight tracking table:

```sql
CREATE TABLE IF NOT EXISTS user_feature_visits (
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature    text NOT NULL,
  first_seen timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);
```

For broader feature adoption orchestration, see the **orchestrating-feature-adoption** skill.
