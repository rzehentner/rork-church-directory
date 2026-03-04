# Strategy & Monetization Reference

## Contents
- EBC Connect's Value Model
- Success Metrics That Earn Trust
- Church Settings as a Strategy Lever
- Admin Adoption as a Multiplier
- Reporting Engagement to Leadership
- Anti-Patterns

---

## EBC Connect's Value Model

EBC Connect is a community tool for a specific church — it has no revenue model and no paywall. "Monetization" here means **capturing and demonstrating value** to the church leadership who decides whether the app continues to be used, maintained, and promoted.

The app succeeds when leadership can see:
1. Adoption rate among the congregation
2. Engagement with events, prayers, and announcements
3. Reduction in administrative overhead (form submissions, signups, directory management)

Frame every metric in terms of community outcomes, not app usage.

---

## Success Metrics That Earn Trust

These are the numbers to surface to church leadership (via the admin panel or a monthly report):

| Metric | What It Signals | Supabase Query |
|--------|----------------|----------------|
| Total activated members | App is being adopted | `persons` with `family_id` |
| Monthly active families | Families are engaged, not just individuals | Distinct `family_id` in event RSVPs / 30 days |
| Total event RSVPs | Events are being communicated effectively | `event_rsvps` count |
| Prayer requests submitted | Members trust the app for pastoral use | `prayer_requests` count |
| Announcement reach | Content is reaching the congregation | `announcement_reads` ÷ total members |
| Form signups completed | Administrative overhead reduced | `signup_responses` with `status = 'confirmed'` |
| Pending approval lag | Admin responsiveness signal | `avg(approved_at - created_at)` |

Present these in the admin tab (`app/(tabs)/admin.tsx`). The admin panel already has member management — extend it with a stats card:

```typescript
// app/(tabs)/admin.tsx — add to admin stats section
const { data: engagementStats } = useQuery({
  queryKey: ['admin-engagement-stats'],
  queryFn: async () => {
    const [rsvps, prayers, reads] = await Promise.all([
      supabase.from('event_rsvps').select('id', { count: 'exact', head: true }),
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true }),
      supabase.from('announcement_reads').select('id', { count: 'exact', head: true }),
    ]);
    return {
      totalRsvps:  rsvps.count  ?? 0,
      totalPrayers: prayers.count ?? 0,
      totalReads:  reads.count  ?? 0,
    };
  },
  staleTime: 5 * 60 * 1000,
});
```

---

## Church Settings as a Strategy Lever

The `church_settings` table (accessed via `hooks/church-settings-context.tsx`) is the configuration layer for all church-specific values. It's already used for church name and contact info. Extend it to control feature flags and messaging without a native build:

```typescript
// types/supabase.ts — extend ChurchSettings type
export interface ChurchSettings {
  church_name: string;
  pastor_name: string;
  contact_email: string;
  // Strategy levers:
  welcome_message: string;            // Dashboard greeting copy
  onboarding_cta_label: string;       // "Join a Family Group" CTA text
  pending_approval_message: string;   // What pending users see while waiting
  feature_directory_enabled: boolean; // Show/hide directory tab
  feature_potluck_enabled: boolean;   // Show/hide potluck tab
}
```

This lets leadership customize messaging without touching code. Track settings changes as admin events:

```typescript
// When church settings are saved in admin screen
posthog.capture('church_settings_updated', {
  fields_changed: Object.keys(changedFields),
  updated_by_role: myRole,
});
```

---

## Admin Adoption as a Multiplier

The app's value compounds when admins and leaders actively use it to create content. A church with no active admins has no events, announcements, or forms — and engagement drops to zero. Track admin content creation as a leading indicator of overall app health:

```typescript
// app/create-event.tsx — after successful event creation
posthog.capture('admin_event_created', {
  has_image:     !!imageUrl,
  has_location:  !!location,
  is_public:     isPublic,
  roles_allowed: rolesAllowed,
  days_until:    Math.round((new Date(startAt).getTime() - Date.now()) / 86_400_000),
});

// app/create-announcement.tsx — after successful announcement creation
posthog.capture('admin_announcement_created', {
  has_image: !!imageUrl,
  tag_count: selectedTags.length,
});
```

Use Supabase to compute content creation velocity (events created per month):

```sql
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(*)                         AS events_created,
  COUNT(DISTINCT created_by)       AS distinct_admins
FROM events
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY 1
ORDER BY 1;
```

---

## WARNING: Optimizing for App Opens Instead of Community Outcomes

**The Problem:**

Tracking only `app_foreground` or `daily_active_users` misses the point for a church app. A member who opens the app every day but never RSVPs, never submits a prayer, and never joins a family is not engaged — they're just bouncing.

**Why This Breaks:**
1. DAU is a vanity metric that leadership will recognize as hollow
2. It doesn't map to the church's actual goals (community connection, event attendance, prayer support)
3. You'll optimize for notifications that drive opens but not actions

**The Fix:**

Measure **depth of engagement** — the number of meaningful actions per active user per week:

```sql
SELECT
  u.id,
  COUNT(DISTINCT r.id)   AS rsvps_this_month,
  COUNT(DISTINCT pr.id)  AS prayers_this_month,
  COUNT(DISTINCT sr.id)  AS form_signups_this_month
FROM auth.users u
LEFT JOIN event_rsvps r   ON r.user_id = u.id   AND r.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN prayer_requests pr ON pr.created_by = u.id AND pr.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN signup_responses sr ON sr.person_id IN (
  SELECT id FROM persons WHERE user_id = u.id
) AND sr.submitted_at > NOW() - INTERVAL '30 days'
GROUP BY u.id
HAVING COUNT(DISTINCT r.id) + COUNT(DISTINCT pr.id) + COUNT(DISTINCT sr.id) > 0;
```

Report this as "engaged members this month" — it's meaningful to leadership and reflects real community activity.

---

## Monthly Report Template

Use this structure for a monthly engagement report to church leadership:

```
EBC Connect — [Month] Engagement Summary

ADOPTION
- Total activated members: [N]
- New members this month: [N]
- Pending approval (>24h): [N] — ACTION NEEDED

ENGAGEMENT
- Event RSVPs: [N] across [N] events
- Prayer requests submitted: [N]
- Announcements sent: [N] (avg [N] reads each)
- Form signups completed: [N]

COMMUNITY
- Active families: [N]
- Avg family size: [N]
- Push notifications delivered: [N]

TOP ACTION THIS MONTH
- [Highest RSVP event name]: [N] attendees going
```

Automate this with a Supabase Edge Function or generate on demand from the admin panel.
