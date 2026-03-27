# Engagement & Adoption Reference

## Contents
- Dashboard as Engagement Hub
- Quick Actions Grid
- Personalized Content ("For You")
- Progressive Feature Discovery
- Notification-Driven Re-engagement
- Anti-Patterns

## Dashboard as Engagement Hub

The dashboard (`app/(tabs)/dashboard.tsx`) is the primary engagement surface. It adapts content based on user state, time of day, and tag-based personalization.

```typescript
// Time-based greeting
<Text style={styles.greeting}>
  {new Date().getHours() < 12 ? 'Good morning'
    : new Date().getHours() < 18 ? 'Good afternoon'
    : 'Good evening'}
</Text>

// Name with pending indicator
<Text style={styles.userName}>
  {person?.first_name || 'Welcome'}
  {isPending && <Text style={styles.pendingTag}> · Pending</Text>}
</Text>
```

**Content hierarchy:** Pending banner → Profile CTA → Quick actions → For You → Upcoming events → Announcements → Family join CTA → Birthdays.

## Quick Actions Grid

Six quick-action cards (seven for admins) provide feature discovery through usage. Each card shows a count badge to pull users into underexplored areas.

```typescript
// app/(tabs)/dashboard.tsx
<QuickAction id="events" label="Events" icon={<Calendar />}
  route="/(tabs)/events" count={stats.upcomingEventsCount} />
<QuickAction id="prayers" label="Prayers" icon={<Heart />}
  count={stats.activePrayersCount} />
<QuickAction id="forms" label="Sign Ups" icon={<ClipboardList />}
  count={stats.openFormsCount} />
<QuickAction id="family" label="My Family" icon={<Home />}
  count={stats.familyMembersCount} />
<QuickAction id="directory" label="Directory" icon={<Users />}
  count={stats.totalDirectoryMembers} />
{isAdmin && <QuickAction id="admin" label="Admin" icon={<Shield />} />}
```

**Pattern:** Count badges serve double duty — they show activity ("3 open forms") and nudge exploration ("0 family members" prompts family setup).

## Personalized Content ("For You")

Tag-based personalization surfaces relevant announcements and events. Users are assigned tags (e.g., "Youth", "Worship Team") that filter content.

```typescript
// Dashboard fetches tagged announcements
const { data: taggedAnnouncements } = await supabase
  .from('announcements_for_me')
  .select('*')
  .not('matching_tags', 'is', null);

// Display with tag pills
{taggedAnnouncements.map(announcement => (
  <View>
    <Text>{announcement.title}</Text>
    {announcement.matching_tags.map(tag =>
      <TagPill tag={tag} size="small" />
    )}
  </View>
))}
```

**Adoption lever:** When users see content tagged for their groups, they learn the value of tag-based features. Admins should tag content aggressively in the first weeks after launch.

## Progressive Feature Discovery

Features are surfaced progressively based on user state rather than all at once:

| User State | Visible Features |
|------------|-----------------|
| Pending, no profile | Profile completion CTA only |
| Pending, has profile | Dashboard + limited tabs |
| Member, no family | All features + family join CTA |
| Member, has family | Full access, birthday section |
| Admin/Leader | Admin quick action + admin tab |

```typescript
// Tab layout — 4 visible tabs, others via quick actions
<Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
<Tabs.Screen name="activity" options={{ title: 'Activity' }} />
<Tabs.Screen name="directory" options={{ title: 'Directory' }} />
<Tabs.Screen name="settings" options={{ title: 'Settings' }} />

// Hidden tabs — accessible from dashboard quick actions
<Tabs.Screen name="events" options={{ href: null }} />
<Tabs.Screen name="prayers" options={{ href: null }} />
<Tabs.Screen name="family" options={{ href: null }} />
```

This keeps the tab bar clean (4 tabs) while making all features discoverable through the dashboard hub.

## Notification-Driven Re-engagement

Push notifications bring users back. The notification system uses React Query polling (30s) with optimistic updates. See the **tanstack-query** skill for caching patterns.

```typescript
// hooks/notification-context.tsx — polling for new notifications
const { data: notifications = [] } = useQuery({
  queryKey: ['notifications', user?.id],
  queryFn: fetchUserNotifications,
  enabled: !!user,
  refetchInterval: 30000,
  retry: 1,
});

// Badge count drives urgency
const unreadCount = useMemo(
  () => notifications.filter(n => !n.read_at).length,
  [notifications]
);
```

**Notification preferences** are stored locally in AsyncStorage with per-category granularity (announcements, events, general) and tag-level filtering.

## Anti-Patterns

### WARNING: Showing All Features Immediately

**The Problem:**

```typescript
// BAD — 10 tabs visible from day one
<Tabs.Screen name="events" />
<Tabs.Screen name="prayers" />
<Tabs.Screen name="announcements" />
<Tabs.Screen name="directory" />
<Tabs.Screen name="family" />
<Tabs.Screen name="forms" />
<Tabs.Screen name="settings" />
<Tabs.Screen name="admin" />
```

**Why This Breaks:**
1. New users feel overwhelmed — "where do I start?"
2. Tab bar becomes cramped, especially on small phones
3. Features compete for attention instead of being discovered naturally

**The Fix:**

EBC Connect uses 4 visible tabs + dashboard quick actions. Features are discovered through the hub pattern, not tab overload.

### WARNING: Empty Dashboard for New Users

**The Problem:**

```typescript
// BAD — dashboard shows nothing when user has no activity
{events.length === 0 && announcements.length === 0 && (
  <Text>Nothing to show</Text>
)}
```

**Why This Breaks:**
1. New users see a dead screen and assume the app is broken
2. No guidance on what to do next
3. Missed opportunity to drive first actions

**The Fix:**

Always show actionable CTAs. The dashboard shows profile completion, family join, and quick actions even when content sections are empty. The greeting and quick-action grid ensure the dashboard is never blank.

### WARNING: Notification Spam on First Day

**The Problem:**

Sending push notifications for every piece of content immediately after signup.

**Why This Breaks:**
1. Users disable notifications entirely
2. Church community content backlog floods new users
3. Valuable notifications get lost in noise

**The Fix:**

Notification preferences default to all-on but new users should only receive notifications for content created *after* their signup. Filter by `created_at > profile.created_at` in notification queries.
