# Activation & Onboarding Metrics

## Contents
- Activation Definition
- Onboarding Funnel Events
- Instrumentation Points
- Anti-Patterns
- Checklist

## Activation Definition

A user is **activated** when they complete three milestones:

| Step | Event | Source | Tracked Today? |
|------|-------|--------|----------------|
| 1. Profile | `profile_completed` | `app/visitor-profile.tsx` | No |
| 2. Family | `family_created` or `family_joined` | `hooks/user-context.tsx` | No |
| 3. First action | `event_rsvp`, `prayer_prayed`, or `signup_submitted` | Various | No |

**Target:** 60% of new signups reach activated within 7 days.

## Onboarding Funnel Events

### Step 1: Account Creation

Track in `hooks/auth-context.tsx` inside the `signUp` function:

```typescript
// In auth-context.tsx, after successful signUp
const { data, error } = await supabase.auth.signUp({ email, password });
if (!error && data.user) {
  posthog.capture('sign_up', { method: 'email' });
  posthog.identify(data.user.id, { email });
}
```

### Step 2: Admin Approval

The approval bottleneck in `app/(tabs)/admin.tsx` is invisible without tracking. Track the admin's approval action AND the resulting state change:

```typescript
// In admin.tsx approveMutation onSuccess
posthog.capture('user_approved', {
  approved_user_id: userId,
  assigned_role: role,
  time_since_signup_hours: calculateHoursSinceSignup(userId),
});
```

### Step 3: Profile Completion

`app/visitor-profile.tsx` is the first screen pending users see. Track completion vs. skip:

```typescript
// After successful person upsert
posthog.capture('profile_completed', {
  has_phone: !!phone,
  has_dob: !!dateOfBirth,
  has_photo: !!avatarUrl,
});

// On "Skip for now" press
posthog.capture('profile_skipped');
```

### Step 4: Family Connection

Two paths exist in `hooks/user-context.tsx`:

```typescript
// In createFamily callback
posthog.capture('family_created', { family_name: result.name });

// In joinFamily callback
posthog.capture('family_joined', { method: 'token' });
```

And in `app/join-family.tsx` for the replace-person flow:

```typescript
posthog.capture('family_joined', { method: 'replace_person' });
```

## WARNING: Approval Bottleneck Is Unmeasured

**The Problem:** New users sign up but sit in `pending` state until an admin manually approves them in `app/(tabs)/admin.tsx`. There is zero visibility into how long this takes or how many users churn before approval.

**Why This Breaks:**
1. Users who wait 24+ hours for approval rarely return
2. No alert notifies admins of pending signups — they must manually check
3. Approval time directly correlates with activation rate

**The Fix:** Track `time_to_approval` as a metric. Alert admins via push notification when new signups are pending (see the **improving-activation-flow** skill).

## WARNING: Silent Profile Skip

**The Problem:** `app/visitor-profile.tsx` allows "Skip for now" which sends users to the family tab with an incomplete profile. No tracking means you cannot measure how many skip vs. complete.

**Why This Breaks:**
1. Skipped profiles appear as blank entries in the directory
2. No follow-up nudge is triggered to re-engage skippers
3. Without the event, you cannot build a re-engagement campaign

**The Fix:** Track `profile_skipped` and trigger a delayed in-app nudge 24 hours later. See the **designing-inapp-guidance** skill.

## DO/DON'T

```typescript
// DON'T — Track only success, ignore drop-offs
if (success) posthog.capture('profile_completed');

// DO — Track both outcomes to measure conversion
if (success) {
  posthog.capture('profile_completed', { has_phone, has_dob, has_photo });
} else {
  posthog.capture('profile_error', { error: error.message });
}
```

```typescript
// DON'T — Identify users after every event
posthog.identify(userId);
posthog.capture('sign_in');

// DO — Identify once on auth state change, capture freely after
// In auth-context.tsx onAuthStateChange:
if (session) posthog.identify(session.user.id, { email: session.user.email });
// Elsewhere:
posthog.capture('sign_in', { method: 'biometric' });
```

## Onboarding Instrumentation Checklist

Copy this checklist and track progress:
- [ ] Add `sign_up` event in `hooks/auth-context.tsx` `signUp()`
- [ ] Add `posthog.identify()` in `onAuthStateChange` when session is set
- [ ] Add `profile_completed` and `profile_skipped` in `app/visitor-profile.tsx`
- [ ] Add `family_created` in `hooks/user-context.tsx` `createFamily()`
- [ ] Add `family_joined` in `hooks/user-context.tsx` `joinFamily()` and `app/join-family.tsx`
- [ ] Add `user_approved` in `app/(tabs)/admin.tsx` `approveMutation.onSuccess`
- [ ] Verify funnel in analytics dashboard: sign_up → profile_completed → family_joined → first engagement
- [ ] Set up alert for approval queue > 24 hours

## User Properties to Set on Identify

Attach these as person properties via `posthog.identify()` or `posthog.people.set()`:

```typescript
posthog.identify(userId, {
  email: profile.email,
  role: profile.role,           // pending | visitor | member | leader | admin
  has_family: !!person?.family_id,
  is_profile_complete: !!(person?.first_name && person?.last_name),
  sign_up_date: profile.created_at,
});
```

Update these properties when they change (role upgrade, family join, etc.) so cohort filters stay accurate.

## Related Skills

- See the **improving-activation-flow** skill for designing the onboarding UX
- See the **designing-onboarding-paths** skill for first-run flow patterns
- See the **mapping-user-journeys** skill for end-to-end journey tracking
