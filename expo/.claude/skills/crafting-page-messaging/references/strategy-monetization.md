# Strategy & Monetization Reference

## Contents
- Monetization Model
- Role-Based Value Tiers
- Feature Gating Copy Patterns
- WARNING: No Upgrade Path Messaging
- Value Proposition by Screen
- Positioning Consistency
- Strategy Checklist

## Monetization Model

EBC Connect is a **free community app** — there is no paid tier, subscription, or in-app purchase. Monetization is indirect: the app serves Edna Baptist Church's mission of community engagement, which supports church attendance and participation.

This means copy optimization targets **engagement and retention**, not revenue conversion. The "conversion" is: `visitor → pending → approved member → active participant`.

## Role-Based Value Tiers

The app uses roles as implicit value tiers. Each role unlocks features, and the copy should communicate what's accessible at each level:

```
visitor (unauthenticated)
  └─ Can: View login screen
  └─ Copy: "Create Account" / "Sign In"
  └─ Next step messaging: N/A (must authenticate)

pending (authenticated, awaiting approval)
  └─ Can: View dashboard (limited), complete profile, join family
  └─ Copy: "Your account is pending approval from church leadership"
  └─ Next step messaging: "Complete Your Profile", "Join Your Family"

member (approved)
  └─ Can: All features — RSVP, prayers, directory, announcements, forms
  └─ Copy: No status badge, full dashboard
  └─ Next step messaging: Feature-specific CTAs

leader / admin
  └─ Can: Everything + create events/announcements, manage users, tags
  └─ Copy: "Admin Panel — Manage users, settings, and content"
  └─ Next step messaging: Admin-specific tools
```

## Feature Gating Copy Patterns

When a feature is restricted by role, the gate copy must explain the **benefit of access**, not just the restriction:

```typescript
// DO — frame the gate as a path forward
// app/(tabs)/prayers.tsx
<Text>Become a member to participate in the prayer list</Text>

// DON'T — frame as a wall
<Text>Prayer requests are restricted to members only</Text>
<Text>Access denied</Text>
<Text>Insufficient permissions</Text>
```

```typescript
// DO — conditional admin CTA with value context
// app/(tabs)/settings.tsx
{(isAdmin || isLeader) && (
  <TouchableOpacity onPress={() => router.push('/(tabs)/admin')}>
    <Text style={styles.menuLabel}>Admin Panel</Text>
    <Text style={styles.menuSubLabel}>Manage users, settings, and content</Text>
  </TouchableOpacity>
)}

// DON'T — show disabled admin option to non-admins
// This creates frustration and "I'm missing out" feelings
```

**Rule:** Hidden is better than disabled for role-gated features. If the user can't use it, don't show it.

### WARNING: No Upgrade Path Messaging

**Detected:** The pending→member transition is entirely passive. The user submits their profile and waits. There is no messaging about what happens next, how long approval takes, or what they'll unlock.

**Impact:** Pending users may abandon the app during the wait. They don't know what they're waiting for or why it's worth waiting.

**Recommended copy additions to `app/(tabs)/dashboard.tsx`:**

```typescript
// Enhanced pending banner with context
<View style={styles.pendingBanner}>
  <AlertTriangle size={16} color="#D97706" />
  <View>
    <Text style={styles.pendingTitle}>
      Your account is pending approval from church leadership
    </Text>
    <Text style={styles.pendingSubtext}>
      Once approved, you'll be able to RSVP to events, share prayer requests,
      and connect with the full church directory.
    </Text>
  </View>
</View>
```

This tells the user **what they'll gain**, not just that they're waiting.

## Value Proposition by Screen

Each screen should reinforce why the app matters. Map the value proposition to the screen's purpose:

| Screen | Current Copy | Value Angle |
|--------|-------------|-------------|
| Login | "Sign In" / "Create Account" | Access to community |
| Dashboard | "Good morning, [Name]" | Personal welcome |
| Events | Event titles and dates | Never miss what matters |
| Prayers | "No active prayers" + "Tap New" | Community support |
| Announcements | "For You" section header | Personalized relevance |
| Directory | Member list | Know your church family |
| Family | "Join Your Family" | Belonging |
| Settings | "Receive updates about church events" | Stay informed |

**Consistency rule:** Every screen's primary heading should answer "Why am I here?" within the first 3 seconds.

## Positioning Consistency

All copy must align with the app's core positioning: **EBC Connect is how your church family stays connected.**

```typescript
// CONSISTENT — uses "church family" and "connect"
"Help your church family get to know you"           // visitor-profile.tsx
"Connect with your family in the church community"  // dashboard.tsx
"Loading your church family..."                     // index.tsx
"Add a photo so your church family can recognize you" // visitor-profile.tsx

// INCONSISTENT — avoid these framings
"Manage your profile"          // too transactional
"View upcoming events"         // too feature-focused
"Access the church database"   // too technical
```

See the **clarifying-market-fit** skill for the full positioning framework and ICP definition.

## Strategy Checklist

Copy this checklist when evaluating messaging strategy:

- [ ] No "access denied" or "permission" language in user-facing copy
- [ ] Pending users see what they'll unlock after approval
- [ ] Role-gated features are hidden, not shown as disabled
- [ ] Every screen's primary copy answers "Why am I here?"
- [ ] "Church family" or "community" appears in at least one string per onboarding screen
- [ ] No monetization language (the app is free — no "upgrade", "premium", "plan")
- [ ] Feature gating copy frames the gate as a benefit path, not a restriction

See the **structuring-offer-ladders** skill for role-tier design.
See the **improving-activation-flow** skill for pending→member journey optimization.
