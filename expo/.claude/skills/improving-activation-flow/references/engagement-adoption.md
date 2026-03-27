# Engagement & Adoption Reference

## Contents
- Dashboard as Engagement Hub
- Feature Discovery Surfaces
- Personalized Content (Tags)
- Notification-Driven Re-engagement
- Anti-Patterns
- Adoption Checklist

## Dashboard as Engagement Hub

`app/(tabs)/dashboard.tsx` is the primary engagement surface. It combines:

1. **Quick Action Grid** (line 312-319): Six feature cards with live counts
2. **Tagged Content** (lines 450-527): Personalized announcements/events based on user tags
3. **Upcoming Events** (lines 529-563): Next 3 events with date/location
4. **Birthdays** (lines 403-422): Current month's birthdays
5. **Join Family CTA** (lines 593-606): Shown only if user has no family

```typescript
// Quick action cards with live counts drive feature discovery
const quickActions: QuickAction[] = [
  { id: 'events', label: 'Events', count: stats.upcomingEventsCount, /* ... */ },
  { id: 'announcements', label: 'Announcements', count: stats.unreadAnnouncementsCount, /* ... */ },
  { id: 'prayers', label: 'Prayers', count: stats.activePrayersCount, /* ... */ },
  { id: 'forms', label: 'Sign Ups', count: stats.openFormsCount, /* ... */ },
  { id: 'family', label: 'My Family', count: stats.familyMembersCount, /* ... */ },
  { id: 'directory', label: 'Directory', count: stats.totalDirectoryMembers, /* ... */ },
];
```

Counts of zero still render (no count badge shown), but the card remains visible. This
is intentional: users learn features exist even when empty.

## Feature Discovery Surfaces

| Feature | Discovery Method | Location |
|---------|-----------------|----------|
| Events | Quick action card + upcoming list | Dashboard |
| Announcements | Quick action + "For You" section | Dashboard |
| Prayers | Quick action card | Dashboard |
| Family | Join family CTA + quick action | Dashboard |
| Notifications | Bell icon with badge count | Dashboard header |
| Directory | Quick action card | Dashboard |
| Admin | Conditional quick action (admin/leader only) | Dashboard |
| Biometric | Opt-in after password login | Login screen |

### WARNING: No Progressive Disclosure

All features are exposed simultaneously on the dashboard. A new user who just completed
profile setup sees the same dashboard as a 2-year member. This creates cognitive
overload for new users.

**The Fix:** Conditionally show quick actions based on activation state:

```typescript
// GOOD — progressive disclosure based on activation stage
const quickActions = useMemo(() => {
  const base = [
    { id: 'events', label: 'Events', /* ... */ },
    { id: 'announcements', label: 'Announcements', /* ... */ },
  ];
  if (isApproved) {
    base.push({ id: 'prayers', label: 'Prayers', /* ... */ });
    base.push({ id: 'directory', label: 'Directory', /* ... */ });
  }
  if (hasFamily) {
    base.push({ id: 'family', label: 'My Family', /* ... */ });
  }
  return base;
}, [isApproved, hasFamily]);
```

## Personalized Content (Tags)

The dashboard fetches tag-matched content using a per-event loop pattern:

```typescript
// app/(tabs)/dashboard.tsx:133-167 — tagged events
const personWithTags = await getPersonWithTags(myPersonId);
const userTagNames = userTags.map(tag => tag.name);
// Loops through events, fetching tags for each one (N+1 query)
for (const event of allEvents) {
  const tags = await getEventTags(event.id);
  const matchingTags = tags.filter(tag => userTagNames.includes(tag.name));
  if (matchingTags.length > 0) matchingEvents.push(/* ... */);
}
```

### WARNING: N+1 Query in Tag Matching

The dashboard fires one `getEventTags()` call per event, creating an N+1 pattern.
For 10 events, that's 11 queries (1 for events + 10 for tags).

**The Fix:** Use a Supabase view (`events_for_me`) or batch the tag query:

```typescript
// GOOD — single query via database view
const { data } = await supabase
  .from('events_for_me')
  .select('*')
  .gte('start_at', new Date().toISOString())
  .limit(3);
```

## Notification-Driven Re-engagement

`hooks/notification-context.tsx` polls every 30 seconds and shows unread counts:

```typescript
const { data: notifications = [] } = useQuery({
  queryKey: ['notifications', user?.id],
  queryFn: fetchUserNotifications,
  enabled: !!user,
  refetchInterval: 30000,
});
const unreadCount = useMemo(() => notifications.filter(n => !n.read_at).length, [notifications]);
```

The dashboard renders a badge on the bell icon when `unreadCount > 0`.
See the **tanstack-query** skill for query configuration patterns.

## Anti-Patterns

### WARNING: No Feature Usage Tracking

There is no way to know which features users actually engage with after activation.
The `console.log` statements are the only instrumentation. Without tracking, you cannot
measure adoption rates for events vs. prayers vs. directory.

See the **instrumenting-product-metrics** skill for adding structured tracking.

### WARNING: Pull-to-Refresh Is the Only Data Update Path

Dashboard data loads on mount and via pull-to-refresh. There is no real-time subscription
or background polling (unlike notifications). Stale counts can mislead users.

## Adoption Checklist

Copy this checklist when adding a new feature to the engagement surface:

- [ ] Step 1: Add quick action card to `app/(tabs)/dashboard.tsx` quickActions array
- [ ] Step 2: Add count query to `loadDashboardData()` if the feature has a count
- [ ] Step 3: Add tag matching in `loadTaggedEvents/Announcements` if tag-aware
- [ ] Step 4: Add empty state to the feature screen (see **designing-inapp-guidance** skill)
- [ ] Step 5: Add notification triggers for the feature in Supabase
- [ ] Step 6: Add the feature to the tab layout if it needs direct access
