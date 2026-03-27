# Conversion Optimization Reference

## Contents
- Tier Progression Funnel
- Pending-to-Member Conversion
- Feature Discovery Optimization
- WARNING: Inconsistent Role Check Pattern
- Progressive Disclosure Patterns
- Conversion Checklist

## Tier Progression Funnel

EBC Connect's conversion funnel is community adoption, not purchase:

```
Sign Up (login.tsx)
  → Profile Completion (visitor-profile.tsx)
    → Family Join (family.tsx / join-family.tsx)
      → Admin Approval (admin.tsx pending approvals)
        → Full Member Access (dashboard.tsx)
```

Each step is a conversion event. Drop-off at any stage means a disengaged user.

### Current Funnel Implementation

```tsx
// app/index.tsx — the routing gate that drives the funnel
if (!user) {
  router.replace('/(auth)/login');
} else if (
  (profile?.role === 'pending' || profile?.role === 'visitor') &&
  (!person || !person.first_name || !person.last_name)
) {
  router.replace('/visitor-profile');
} else {
  router.replace('/(tabs)/dashboard');
}
```

### DO: Gate by Progression State, Not Just Role

```tsx
// GOOD — checks actual completion state
const needsProfile = isPending && (!person?.first_name);
const needsFamily = !family && !isPending;

{needsProfile && <CompleteProfileCard />}
{needsFamily && <JoinFamilyCard />}
```

### DON'T: Skip Intermediate Steps

```tsx
// BAD — sends pending user straight to dashboard without profile
if (user) {
  router.replace('/(tabs)/dashboard'); // Skips profile completion
}
```

**Why this breaks:** Users land on a dashboard with no personalization, no family connection, and no engagement hooks. They see a generic experience and churn.

## Pending-to-Member Conversion

The highest-leverage conversion point. A pending user who completes their profile and joins a family is far more likely to stay engaged after admin approval.

### Current Pending User Experience

```tsx
// app/(tabs)/dashboard.tsx — pending banner
{isPending && (
  <View style={styles.pendingBanner}>
    <Clock size={16} color={Colors.status.warning} />
    <Text>Your account is pending approval from church leadership</Text>
  </View>
)}
```

### DO: Show Value While Pending

```tsx
// GOOD — let pending users browse content (current behavior)
// Events, prayers, announcements are visible to pending users
// This builds investment before approval
```

### DON'T: Block All Content for Pending Users

```tsx
// BAD — empty state for pending users
if (isPending) {
  return <Text>Please wait for approval</Text>;
}
// This gives zero reason to return to the app
```

**Why this breaks:** Admin approval can take hours or days. If pending users see nothing, they delete the app before getting approved.

## WARNING: Inconsistent Role Check Pattern

**The Problem:**

```tsx
// BAD — duplicated across 8+ screens with subtle variations
// dashboard.tsx
const isAdmin = myRole === 'admin' || myRole === 'leader';

// directory.tsx — different! Only checks admin, not leader
const isAdmin = profile?.role === 'admin';

// _layout.tsx — yet another source
const isAdmin = !isLoading && (profile?.role === 'admin' || profile?.role === 'leader');
```

**Why This Breaks:**
1. `directory.tsx` gates admin features to `admin` only, excluding `leader` — likely a bug
2. Each screen independently re-derives role state, risking inconsistency
3. Adding a new role (e.g., `moderator`) requires updating every screen

**The Fix:**

```tsx
// GOOD — use useMe() everywhere, single source of truth
const { isAdmin, isAdminOrLeader, myRole } = useMe();
```

## Progressive Disclosure Patterns

### Dashboard Quick Actions Grid

The dashboard reveals features progressively based on role and state:

```tsx
// app/(tabs)/dashboard.tsx — quick actions with counts
const quickActions = [
  { id: 'events', label: 'Events', count: upcomingEventsCount },
  { id: 'announcements', label: 'Announcements', count: announcementsCount },
  { id: 'prayers', label: 'Prayers', count: activePrayersCount },
  { id: 'forms', label: 'Sign Ups', count: openFormsCount },
  { id: 'family', label: 'My Family', count: familyMembersCount },
  { id: 'directory', label: 'Directory', count: totalMembersCount },
];

// Admin-only card added conditionally
if (isAdmin) {
  quickActions.push({
    id: 'admin', label: 'Admin', route: '/(tabs)/admin',
    icon: Shield, color: Colors.status.error,
  });
}
```

### DO: Use Count Badges as Value Signals

```tsx
// GOOD — counts show there's content worth exploring
<View style={styles.countBadge}>
  <Text style={styles.countText}>{count}</Text>
</View>
```

### DON'T: Show Empty Grids with No Engagement Hook

```tsx
// BAD — no counts, no activity signals
<TouchableOpacity>
  <Text>Events</Text> {/* Why would I tap this? */}
</TouchableOpacity>
```

## Conversion Checklist

Copy this checklist when adding a new tier or gated feature:

- [ ] Define which roles can access the feature
- [ ] Use `useMe()` for role checks (not inline `profile?.role` checks)
- [ ] Add server-side enforcement via Supabase RLS or RPC `has_role()`
- [ ] Add client-side gate (redirect or "Unauthorized" wall)
- [ ] Show value preview to lower tiers (don't just hide the feature)
- [ ] Add progression CTA for users who can't access yet
- [ ] Verify the gate works on web, iOS, and Android
