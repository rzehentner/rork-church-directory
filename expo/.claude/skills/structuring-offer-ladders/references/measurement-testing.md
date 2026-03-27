# Measurement & Testing Reference

## Contents
- WARNING: No Analytics SDK
- Tier Progression Metrics
- Key Events to Track
- Funnel Definition
- Testing Role-Gated Features
- Validation Workflow

## WARNING: No Analytics SDK

**Detected:** Zero analytics libraries in `package.json`. No Segment, Mixpanel, PostHog, Amplitude, or Firebase Analytics.

**Impact:** Cannot measure tier progression, feature adoption by role, activation rates, or drop-off points. All 159 `console.log`/`console.error` calls produce no actionable data.

### Recommended Solution

```bash
bun add posthog-react-native
# or
bun add @segment/analytics-react-native
```

### Why This Matters

Without analytics, you cannot answer:
- What percentage of pending users complete their profile?
- How many days between signup and admin approval?
- Which features do members use most?
- Where do users drop off in the onboarding funnel?

See the **instrumenting-product-metrics** skill for full implementation guidance.

## Tier Progression Metrics

### Metrics That Matter Per Tier

| Tier Transition | Metric | Measures |
|----------------|--------|----------|
| Signup → Profile Complete | Profile completion rate | Onboarding friction |
| Profile Complete → Family Join | Family join rate | Community connection |
| Signup → Admin Approval | Approval wait time (hours) | Admin responsiveness |
| Member → Active Member | 7-day retention | Value delivery |
| Member → Leader | Promotion rate | Community growth |

### DO: Track State Transitions, Not Just Page Views

```tsx
// GOOD — track meaningful progression events
analytics.capture('tier_progression', {
  from_role: 'pending',
  to_role: 'member',
  days_since_signup: daysSinceSignup,
  profile_complete: true,
  has_family: true,
});
```

### DON'T: Track Only Screen Views

```tsx
// BAD — tells you nothing about progression
analytics.capture('screen_view', { screen: 'dashboard' });
// Who cares? Did the pending user complete their profile or not?
```

## Key Events to Track

### Activation Events

```tsx
// These events define the activation funnel
const ACTIVATION_EVENTS = [
  'account_created',        // login.tsx — signUp success
  'profile_completed',      // visitor-profile.tsx — save success
  'family_joined',          // family.tsx — create/join success
  'account_approved',       // admin.tsx — approval action
  'first_rsvp',             // event-detail.tsx — first RSVP
  'first_prayer_submitted', // create-prayer.tsx — first prayer
] as const;
```

### Engagement Events by Tier

```tsx
// Member-level engagement
const MEMBER_EVENTS = [
  'event_rsvp',
  'prayer_submitted',
  'prayer_prayed',        // "I prayed" action
  'announcement_read',
  'form_submitted',
  'family_member_added',
] as const;

// Leader-level engagement
const LEADER_EVENTS = [
  'event_created',
  'announcement_created',
  'prayer_managed',       // status change, bulk actions
  'bulletin_generated',
] as const;
```

## Funnel Definition

### Primary Activation Funnel

```
Step 1: Sign Up
  ↓ (target: 100% → Step 2)
Step 2: Profile Completion
  ↓ (target: 80%+ → Step 3)
Step 3: Family Join
  ↓ (target: 60%+ → Step 4)
Step 4: Admin Approval
  ↓ (target: 95%+ — admin action)
Step 5: First Engagement Action (RSVP, prayer, or form)
  ↓ (target: 50%+ within 7 days)
Step 6: Weekly Active (returns 2+ times per week)
```

### DO: Measure Each Step Independently

```tsx
// GOOD — track completion of each funnel step
const handleProfileSave = async () => {
  await saveProfile(formData);
  // Track step completion with context
  analytics.capture('profile_completed', {
    has_photo: !!photoUri,
    fields_filled: filledFieldCount,
    time_since_signup: timeSinceSignup,
  });
};
```

### DON'T: Only Measure the End State

```tsx
// BAD — only tracking "user is active", no visibility into where they dropped off
if (user.lastActive > sevenDaysAgo) {
  analytics.capture('active_user');
}
```

## Testing Role-Gated Features

### Manual Testing Matrix

| Feature | Pending | Visitor | Member | Leader | Admin |
|---------|---------|---------|--------|--------|-------|
| Dashboard | Limited | Full | Full | Full | Full + Admin card |
| Events | View | View | View + RSVP | View + Edit + Create | All |
| Prayers | View | View | View + Create | View + Bulk Manage | All |
| Announcements | View | View | View | View + Create | All |
| Admin Panel | Blocked | Blocked | Blocked | Full | Full |
| Directory Admin | Blocked | Blocked | Blocked | Blocked | Full |

### Validation Workflow

1. Create test accounts for each role in Supabase
2. Sign in as each role
3. Verify feature access matches the matrix above
4. Check that server-side RLS enforces the same gates
5. If any mismatch, fix and repeat from step 3

## Testing Checklist

Copy this checklist when modifying tier logic:

- [ ] Test as `pending` user — verify limited access
- [ ] Test as `member` user — verify full community access
- [ ] Test as `leader` user — verify create/edit permissions
- [ ] Test as `admin` user — verify admin panel and directory admin
- [ ] Verify Supabase RLS matches client-side gates
- [ ] Check that `roles_allowed` content filtering works server-side
- [ ] Test on web AND native (Platform.OS differences)
