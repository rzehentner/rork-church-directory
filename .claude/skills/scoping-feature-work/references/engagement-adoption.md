# Engagement & Adoption Scoping

## Contents
- Feature Adoption Layers
- Scoping Engagement Features
- MVP Patterns for Engagement
- Acceptance Criteria for Adoption
- Anti-Patterns

## Feature Adoption Layers

In EBC Connect, engagement features exist at three levels:

| Level | Surface | Example |
|-------|---------|---------|
| Discovery | Dashboard quick actions, tab bar | User learns the feature exists |
| First use | Empty states, create forms | User tries the feature once |
| Habit | Notifications, badges, pull-to-refresh | User returns repeatedly |

The dashboard quick action grid is the primary discovery surface:

```typescript
// app/(tabs)/dashboard.tsx - Quick Access Grid
const quickActions = [
  { id: 'events', label: 'Events', icon: <CalendarDays />, route: '/(tabs)/events' },
  { id: 'announcements', label: 'Announcements', icon: <Bell />, route: '/(tabs)/announcements' },
  { id: 'prayers', label: 'Prayers', icon: <Heart />, route: '/(tabs)/prayers' },
  { id: 'signups', label: 'Sign Ups', icon: <ClipboardList />, route: '/(tabs)/forms' },
  { id: 'family', label: 'My Family', icon: <Users />, route: '/(tabs)/family' },
  { id: 'directory', label: 'Directory', icon: <BookOpen />, route: '/(tabs)/directory' },
];
// Admin-only action added conditionally
```

## Scoping Engagement Features

### DO: Scope by Engagement Loop

Every engagement feature should map to a loop: **Trigger → Action → Reward → Investment**

```markdown
Feature: Prayer Request Engagement
├── Trigger: Push notification "New prayer request from [name]"
├── Action: User taps notification → prayers.tsx
├── Reward: "Prayed" count increments, user sees community participation
└── Investment: User submits their own prayer request
```

Scope each part of the loop as a slice:

```markdown
- Slice 1 (MVP): Prayer list with "Pray" button + count display
- Slice 2: Push notification on new prayer requests
- Slice 3: "Prayed today" tracking with daily reset
- Slice 4: Prayer streak or community prayer count
```

### DON'T: Scope Engagement Features Without a Trigger

```markdown
# BAD - No trigger mechanism, feature will be forgotten
Feature: "Add community prayer wall"
- Show all prayers in a scrollable wall
- Pretty UI with cards and animations
```

**Why this breaks:** Without a notification, email, or badge to pull users back, the feature relies on users remembering to check it. Adoption will be low.

## MVP Patterns for Engagement

### Pattern: Badge-Driven Discovery

The notification badge pattern already exists:

```typescript
// hooks/notification-context.tsx
const { unreadCount } = useNotification();

// app/(tabs)/_layout.tsx - Badge on tab
<Tabs.Screen
  name="dashboard"
  options={{
    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
  }}
/>
```

**MVP acceptance criteria for a new badge:**

```markdown
- [ ] Unread count computed in relevant context (not in screen component)
- [ ] Badge appears on tab bar icon when count > 0
- [ ] Badge clears when user views the content
- [ ] Count persists across app restarts (via Supabase, not local state)
```

### Pattern: Pull-to-Refresh Engagement

Most list screens support pull-to-refresh:

```typescript
// Standard pattern from events.tsx
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor={Colors.navy}
    />
  }
>
```

**Scope pull-to-refresh as a mandatory criterion for all list screens:**

```markdown
- [ ] Pull-to-refresh triggers data refetch
- [ ] Loading indicator uses brand color (Colors.navy)
- [ ] Stale data replaced on successful refresh
- [ ] Error toast shown on refresh failure
```

### Pattern: Real-Time Updates

Prayers use Supabase real-time subscriptions:

```typescript
// services/prayer.ts pattern
const channel = supabase
  .channel('prayer-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_requests' },
    () => { refetch(); }
  )
  .subscribe();
```

**Scope real-time as a separate slice** — it adds complexity:

```markdown
- Slice N: Real-time updates for [feature]
  - [ ] Subscribe to Supabase channel on screen mount
  - [ ] Unsubscribe on unmount (prevent memory leaks)
  - [ ] Refetch data on change event
  - [ ] No flicker or scroll position reset during refetch
```

## Acceptance Criteria for Adoption

### Feature Discovery Criteria

```markdown
- [ ] Feature accessible from dashboard quick action grid
- [ ] Feature accessible from tab bar (visible or hidden tab)
- [ ] Empty state explains feature purpose and provides CTA
- [ ] Feature name and icon consistent across all entry points
```

### First Use Criteria

```markdown
- [ ] Create form pre-fills sensible defaults where possible
- [ ] Validation errors are inline (not just toast)
- [ ] Success confirmation via toast with action text
- [ ] User returned to list view after successful creation
```

### Retention Criteria

```markdown
- [ ] Push notification sent for relevant updates (native only)
- [ ] Unread/new badge visible on entry point
- [ ] Pull-to-refresh supported on list screens
- [ ] Content sorted newest-first by default
```

## Anti-Patterns

### WARNING: Scoping Engagement Without Existing Content

**The Problem:** Building engagement features (notifications, badges, streaks) for a feature that has no content yet.

**Why This Breaks:** In a church app, if no one has created events or prayer requests, engagement features notify users about nothing. This is worse than no feature at all — it trains users to ignore notifications.

**The Fix:** Always scope content creation before engagement:

```markdown
# Correct ordering
1. Slice 1: Admin/leader can create events
2. Slice 2: Members can view and RSVP to events
3. Slice 3: Push notification on new event (only after content exists)
```

### WARNING: Scoping Bulk Operations in MVP

**The Problem:** Including bulk select, bulk delete, or bulk status change in the first slice.

```typescript
// This is Slice 3-4 complexity, NOT MVP
// From prayers.tsx - bulk operations
const [isSelectionMode, setIsSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**Why This Breaks:** Bulk operations require selection state, confirmation dialogs, error handling for partial failures, and undo capability. This triples the scope.

**The Fix:** Ship single-item operations first:

```markdown
- Slice 1 (MVP): View list, create item, delete single item
- Slice 2: Edit item, status changes on single item
- Slice 3: Bulk selection + bulk operations (leader/admin only)
```

See the **tanstack-query** skill for mutation and cache invalidation patterns.
See the **instrumenting-product-metrics** skill for tracking adoption metrics.
