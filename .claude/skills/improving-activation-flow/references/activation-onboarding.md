# Activation & Onboarding Reference

## Contents
- Entry Redirect Flow
- Visitor Profile Screen
- Role Lifecycle
- Activation State Derivation
- Anti-Patterns
- Checklist: Adding a New Activation Step

## Entry Redirect Flow

`app/index.tsx` is the single routing decision point after auth loads. It checks two
conditions sequentially:

```typescript
// app/index.tsx:25-39
useEffect(() => {
  if (!authLoading && !userLoading && !isNavigatingRef.current) {
    isNavigatingRef.current = true;
    if (user) {
      if ((profile?.role === 'pending' || profile?.role === 'visitor')
          && (!person || !person.first_name || !person.last_name)) {
        router.replace('/visitor-profile');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }
}, [user, profile, person, authLoading, userLoading]);
```

The `isNavigatingRef` prevents double-navigation. A 15-second safety timeout shows a
fallback "Go to Login" button if contexts never resolve.

## Visitor Profile Screen

`app/visitor-profile.tsx` is the first activation gate. It collects name, email, phone,
DOB, and an optional avatar.

**Required fields:** `first_name`, `last_name`, `email`
**Optional fields:** `phone`, `date_of_birth`, `photo_url`

```typescript
// app/visitor-profile.tsx:110-166
const handleSaveProfile = async () => {
  if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
    Alert.alert('Error', 'Please enter your first and last name');
    return;
  }
  // Upserts person record, then:
  Alert.alert('Success', 'Your profile has been saved! You can now create or join a family.', [
    { text: 'Continue', onPress: () => router.replace('/(tabs)/family') },
  ]);
};
```

The skip path (`handleSkip`) warns the user and routes to the family tab regardless.

**Guard clause** at line 206: if the user's role is no longer `pending`/`visitor`, they
get redirected away from this screen automatically.

## Role Lifecycle

Roles progress through Supabase `profiles.role`:

```
signup → 'pending' → (admin approves) → 'member' → (promoted) → 'leader' | 'admin'
                   → (admin rejects) → account stays pending
```

- `pending`: Default after signup. Limited access, sees yellow banners.
- `visitor`: Functionally same as pending. Used for walk-in visitors.
- `member`: Full access. Can RSVP, pray, view directory.
- `leader`/`admin`: Can create events, announcements, manage tags, approve users.

Admin approval happens in `app/(tabs)/admin.tsx` via the Approvals tab.

## Activation State Derivation

The app currently lacks a unified `isActivated` check. Derive it from existing contexts:

```typescript
// GOOD — derive activation state from existing contexts
function useActivationState() {
  const { profile, person, family } = useUser();
  const { myRole } = useMe();

  return {
    hasProfile: !!(person?.first_name && person?.last_name),
    isApproved: myRole !== 'pending' && myRole !== 'visitor',
    hasFamily: !!family,
    hasPhoto: !!person?.photo_url,
    // Activation = profile + approved + family
    isActivated: !!(
      person?.first_name && person?.last_name
      && myRole !== 'pending' && myRole !== 'visitor'
      && family
    ),
  };
}
```

### WARNING: Scattered Activation Checks

**The Problem:**

```typescript
// BAD — duplicated role checks across screens
if (profile?.role === 'pending' || profile?.role === 'visitor') { /* ... */ }
// Appears in: index.tsx, dashboard.tsx, visitor-profile.tsx, admin.tsx
```

**Why This Breaks:**
1. Adding a new role (e.g., `'probationary'`) requires updating every file
2. No single source of truth for "is this user onboarded?"
3. Dashboard, index, and visitor-profile can disagree on activation state

**The Fix:**

```typescript
// GOOD — centralize in hooks/me-context.tsx
const isOnboarded = myRole !== 'pending' && myRole !== 'visitor';
const needsProfileCompletion = !person?.first_name || !person?.last_name;
```

## Anti-Patterns

### WARNING: No Post-Approval Welcome

After admin approves a user, the user's role changes silently. There is no celebration
screen, no "Welcome to the community!" moment. The next time the user opens the app,
they simply see the dashboard without the pending banner.

**The Fix:** Check for role transition in `useUser()` and trigger a welcome toast:

```typescript
// In dashboard.tsx or a dedicated hook
const prevRole = useRef(profile?.role);
useEffect(() => {
  if (prevRole.current === 'pending' && profile?.role === 'member') {
    showSuccess('Welcome to Edna Baptist Church! You are now a member.');
  }
  prevRole.current = profile?.role;
}, [profile?.role]);
```

### WARNING: Silent Push Registration

`hooks/notification-context.tsx:76` registers push endpoints without user awareness.
Users never see an opt-in prompt explaining why notifications matter.

## Checklist: Adding a New Activation Step

Copy this checklist and track progress:
- [ ] Step 1: Define the milestone in `useActivationState()` (or `hooks/me-context.tsx`)
- [ ] Step 2: Add a conditional CTA to `app/(tabs)/dashboard.tsx`
- [ ] Step 3: Create or update the target screen for the step
- [ ] Step 4: Update `app/index.tsx` redirect logic if the step is blocking
- [ ] Step 5: Add the milestone to the activation funnel events (see **instrumenting-product-metrics** skill)
- [ ] Step 6: Test with a fresh `pending` account through full activation
