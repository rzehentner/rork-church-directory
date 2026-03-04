# Engagement & Adoption Reference

## Contents
- Engagement Surfaces in EBC Connect
- Hub Discovery Pattern
- Tag-Based Personalization
- Engagement Signal Tables
- Toast Feedback Loop
- WARNING: No Engagement Analytics
- Feature Adoption Measurement

## Engagement Surfaces in EBC Connect

The dashboard is the engagement hub. Every visit surfaces personalized content and contextual CTAs.

| Surface | Location | Signal | Measures |
|---------|----------|--------|----------|
| Quick Access grid | Dashboard | Tap count badges | Feature awareness |
| "For You" announcements | Dashboard | Tag-matched content | Content relevance |
| "Events For You" | Dashboard | Tag-matched events | Event discovery |
| Birthday celebrations | Dashboard | Current-month birthdays | Community connection |
| Notification badge | Dashboard + Settings header | Unread count | Re-engagement pull |
| RSVP action | Event detail | `event_attendees.responded_at` | Event commitment |
| Prayer action | Prayers tab | `prayer_prayed.prayed_at` | Community support |
| Form submission | Signup form | `signup_responses.created_at` | Event participation |

## Hub Discovery Pattern

The Quick Access grid on the dashboard is the primary feature discovery surface. Each card shows a feature name, icon, and count badge.

```tsx
// app/(tabs)/dashboard.tsx — Quick Access card pattern
<TouchableOpacity
  style={styles.quickActionCard}
  onPress={() => router.push('/(tabs)/events')}
>
  <View style={[styles.quickActionIcon, { backgroundColor: Colors.status.info + '20' }]}>
    <Calendar size={24} color={Colors.status.info} />
  </View>
  <Text style={styles.quickActionLabel}>Events</Text>
  {eventCount > 0 && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{eventCount}</Text>
    </View>
  )}
</TouchableOpacity>
```

```tsx
// DO — Show count badges to indicate activity
// A "3" badge on Events tells users there's something to see

// DON'T — Show zero badges
// "0 Events" signals emptiness and discourages exploration
// Only show badges when count > 0
```

**Why count badges matter:** They create a "pull" signal. Users return to the dashboard and see updated counts, which drives re-engagement without push notifications.

## Tag-Based Personalization

The "For You" sections filter content by the user's assigned tags. This is the app's primary personalization mechanism.

```tsx
// app/(tabs)/dashboard.tsx lines ~169-206 — tag filtering logic
const myAnnouncements = useMemo(() => {
  if (!announcements || !person?.tags) return [];
  const myTagIds = new Set(person.tags.map((t: any) => t.id));
  return announcements.filter((a: any) =>
    a.audience_tags?.some((tag: any) => myTagIds.has(tag.id))
  );
}, [announcements, person?.tags]);
```

```tsx
// DO — Show which tags matched so users understand WHY content appears
// Dashboard renders TagPill components under each "For You" item

// DON'T — Show personalized content without explaining the match
// Users who don't understand "For You" won't self-assign more tags
```

**Adoption gap:** There is currently no nudge to self-assign tags. Users who skip tag selection see empty "For You" sections with no guidance on how to populate them. Add a CTA:

```tsx
{myAnnouncements.length === 0 && person?.tags?.length === 0 && (
  <View style={styles.tagNudge}>
    <Tags size={20} color={Colors.gold} />
    <Text style={styles.tagNudgeText}>
      Add your interests to see personalized content
    </Text>
    <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
      <Text style={styles.tagNudgeLink}>Set up tags</Text>
    </TouchableOpacity>
  </View>
)}
```

## Engagement Signal Tables

These Supabase tables capture adoption signals today:

```sql
-- event_attendees: RSVP engagement
-- Columns: person_id, event_id, status (going/maybe/declined), responded_at
-- Metric: RSVP rate = COUNT(DISTINCT person_id) / total_members

-- prayer_prayed: Prayer engagement
-- Columns: user_id, prayer_id, prayed_at, prayed_on
-- Metric: Prayer activity = COUNT per user per week

-- announcement_reads: Content consumption
-- Columns: announcement_id, person_id, read_at
-- Metric: Read rate = reads / total_audience

-- signup_responses: Form participation
-- Columns: person_id, form_id, status (confirmed/waitlisted/cancelled)
-- Metric: Signup conversion = confirmed / views

-- notification_endpoints: Push registration
-- Columns: user_id, token, platform, is_active, last_seen
-- Metric: Push opt-in rate = active_endpoints / total_users
```

## Toast Feedback Loop

Toast notifications close the feedback loop on engagement actions. Every action should produce immediate feedback.

```tsx
// hooks/toast-context.tsx — toast API
const { showSuccess, showError, showWarning, showInfo } = useToast();

// After RSVP
showSuccess('You\'re going! See you there.');

// After prayer
showSuccess('Thank you for praying.');

// After form submit
showSuccess('Signup confirmed!');

// After error
showError('Could not submit. Please try again.'); // 6s duration vs 4s default
```

```tsx
// DO — Use action buttons in toasts for follow-up engagement
showSuccess('Event RSVP confirmed!', {
  actionText: 'Add to Calendar',
  onAction: () => addToDeviceCalendar(event),
});

// DON'T — Use toasts for critical information the user must see
// Toasts auto-dismiss after 4-6 seconds. Use Alert.alert for critical messages.
```

## WARNING: No Engagement Analytics

**Detected:** No analytics SDK (Mixpanel, PostHog, Amplitude, Segment) in `package.json`.

**Impact:**
- Cannot measure which features are adopted vs ignored
- Cannot build engagement funnels (view -> interact -> convert)
- Cannot compare cohorts (new users vs established members)
- Cannot run retention analysis

**Recommended approach:** Before adding an external SDK, leverage existing Supabase tables:

```sql
-- Weekly active users by feature (no new tables needed)
SELECT
  'events' AS feature, COUNT(DISTINCT person_id) AS wau
FROM event_attendees WHERE responded_at > now() - interval '7 days'
UNION ALL
SELECT
  'prayers', COUNT(DISTINCT user_id)
FROM prayer_prayed WHERE prayed_at > now() - interval '7 days'
UNION ALL
SELECT
  'announcements', COUNT(DISTINCT person_id)
FROM announcement_reads WHERE read_at > now() - interval '7 days'
UNION ALL
SELECT
  'signups', COUNT(DISTINCT person_id)
FROM signup_responses WHERE created_at > now() - interval '7 days';
```

See the **instrumenting-product-metrics** skill for building a proper tracking layer.

## Feature Adoption Measurement

Without dedicated analytics, measure adoption through Supabase queries:

```sql
-- Feature adoption rate: % of members who used each feature at least once
WITH member_count AS (
  SELECT COUNT(*) AS total FROM profiles WHERE role IN ('member', 'admin', 'leader')
)
SELECT
  'RSVP' AS feature,
  ROUND(100.0 * COUNT(DISTINCT ea.person_id) / mc.total, 1) AS adoption_pct
FROM event_attendees ea, member_count mc
UNION ALL
SELECT 'Prayer', ROUND(100.0 * COUNT(DISTINCT pp.user_id) / mc.total, 1)
FROM prayer_prayed pp, member_count mc
UNION ALL
SELECT 'Announcement Read', ROUND(100.0 * COUNT(DISTINCT ar.person_id) / mc.total, 1)
FROM announcement_reads ar, member_count mc;
```

### Adoption Flow Validation

1. Navigate the feature as a new member account
2. Verify empty states show actionable guidance
3. Complete the core action (RSVP, pray, submit form)
4. Confirm toast feedback appears
5. Check Supabase table for the engagement record
6. If record is missing, check RPC function and error handling
7. Repeat until all core features produce engagement signals
