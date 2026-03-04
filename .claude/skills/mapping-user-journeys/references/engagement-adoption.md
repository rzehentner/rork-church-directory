# Engagement & Adoption Reference

## Contents
- Feature Discovery via Dashboard
- Tab Navigation and Hidden Features
- RSVP and Prayer Engagement Loops
- Pull-to-Refresh and Refetch Patterns
- Anti-Patterns

## Feature Discovery via Dashboard

The dashboard (`app/(tabs)/dashboard.tsx`) is the primary feature discovery surface. It uses a 2-column quick action grid, featured content sections, and stat badges:

```typescript
// app/(tabs)/dashboard.tsx — quick actions are the main discovery mechanism
// Each action card has icon + title + route, rendered as TouchableOpacity
<TouchableOpacity
  style={styles.quickActionCard}
  onPress={() => router.push(action.route as any)}
>
  <action.icon size={22} color={Colors.navy} />
  <Text style={styles.quickActionTitle}>{action.title}</Text>
</TouchableOpacity>
```

**Adoption concern:** All 6+ quick actions are shown equally. No prioritization based on user role, usage history, or incomplete actions. A new member sees the same grid as a leader.

### DO: Surface Contextual Actions

```typescript
// GOOD — show family prompt only when user has no family
{!family && (
  <View style={styles.joinFamilyCard}>
    <Users size={24} color={Colors.navy} />
    <Text>Join a Family</Text>
    <Text style={styles.subtitle}>
      See events and announcements for your group
    </Text>
  </View>
)}
```

### DON'T: Show All Features Equally

```typescript
// BAD — new users see 6 identical cards with no guidance on where to start
// No badge for "new", no ordering by relevance, no completion indicators
quickActions.map(action => <QuickActionCard key={action.title} {...action} />)
```

## Tab Navigation and Hidden Features

Only 4 tabs are visible in the bottom bar: Dashboard, Activity, Directory, Settings. Six additional screens are accessible only via `router.push()` from dashboard or other screens:

```typescript
// app/(tabs)/_layout.tsx — hidden tabs
<Tabs.Screen name="events" options={{ href: null }} />
<Tabs.Screen name="prayers" options={{ href: null }} />
<Tabs.Screen name="announcements" options={{ href: null }} />
<Tabs.Screen name="forms" options={{ href: null }} />
<Tabs.Screen name="family" options={{ href: null }} />
<Tabs.Screen name="admin" options={{ href: null }} />
```

**Adoption risk:** Users who don't explore dashboard quick actions will never discover events, prayers, forms, or family management. The Activity tab aggregates some content but doesn't link to creation flows.

## RSVP and Prayer Engagement Loops

These are the two primary re-engagement loops in the app:

### Event RSVP Loop

```typescript
// app/event-detail.tsx — RSVP creates a commitment loop
// User sees event → RSVPs → gets reminder → attends → sees next event
const handleRSVP = async (status: 'going' | 'maybe' | 'not_going') => {
  await rsvpEvent(event.id, user.id, status);
  // Optimistic update: immediately reflect new status
  setMyRsvpStatus(status);
};
```

**Engagement strength:** RSVPs trigger push notification reminders (if enabled). This creates a return visit loop.

**Friction:** No "Add to Calendar" prompt after RSVP. The calendar integration exists (`utils/calendar.ts`) but isn't surfaced at the moment of highest intent.

### Prayer Engagement Loop

```typescript
// app/(tabs)/prayers.tsx — "I Prayed" button creates social proof
// Tapping increments prayer count and shows visual feedback
const handlePray = async (prayerId: string) => {
  await markPrayed(prayerId, user.id);
  // Haptic feedback on native
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
```

**Engagement strength:** Prayer counts create social proof. Haptic feedback rewards the action. Anonymous posting lowers the barrier to participation.

**Friction:** No "prayed today" streak or recap. Users who pray once have no reason to return to the prayer screen specifically.

## Pull-to-Refresh and Refetch Patterns

Engagement depends on fresh content. The app uses two refetch strategies:

```typescript
// Pattern 1: FlatList pull-to-refresh (user-initiated)
<FlatList
  refreshControl={
    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
  }
/>

// Pattern 2: Auto-refetch on focus (automatic)
// app/(tabs)/events.tsx — refetch every 60s when tab is focused
useFocusEffect(
  useCallback(() => {
    const interval = setInterval(() => { loadEvents(); }, 60000);
    return () => clearInterval(interval);
  }, [])
);
```

### WARNING: Inconsistent Refetch Strategies

**The Problem:** Some screens use React Query (`useQuery` with `refetchInterval`), others use `useFocusEffect` with manual `setInterval`, and some have no auto-refresh at all.

**Why This Breaks:**
1. Users see stale data on some screens but fresh data on others
2. Manual intervals don't deduplicate requests or respect network state
3. No background refetch when app returns from background

**The Fix:** Standardize on React Query for all list fetches. See the **tanstack-query** skill.

```typescript
// GOOD — consistent refetch via React Query
const { data: events, isLoading } = useQuery({
  queryKey: ['events', dateRange],
  queryFn: () => listEventsForDateRange(start, end),
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
});
```

## Adoption Audit Checklist

Copy this checklist and track progress:
- [ ] Dashboard quick actions prioritize incomplete user actions
- [ ] Hidden tab features are discoverable from dashboard
- [ ] RSVP flow surfaces calendar add after commitment
- [ ] Prayer "I Prayed" has clear visual feedback
- [ ] All list screens have pull-to-refresh
- [ ] Refetch strategy is consistent (React Query preferred)
- [ ] Empty states include a CTA to create content
- [ ] Notification bell badge updates in real-time (30s interval)
