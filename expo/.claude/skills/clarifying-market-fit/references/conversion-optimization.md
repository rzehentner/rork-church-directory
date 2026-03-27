# Conversion Optimization Reference

## Contents
- Conversion Funnel Map
- Login Screen: The Missing Value Prop
- Visitor Profile: The First Activation Gate
- Dashboard Activation Prompts
- Family Join Friction
- Conversion Copy Checklist

## Conversion Funnel Map

EBC Connect has a linear funnel gated by human approval:

```
Login → [Sign Up] → visitor-profile → [Admin Approval] → Dashboard → Family Join → Engaged Member
```

Key files in the funnel:
- `app/index.tsx` — routing decision
- `app/(auth)/login.tsx` — sign-in/sign-up
- `app/visitor-profile.tsx` — profile completion
- `app/(tabs)/dashboard.tsx` — activation prompts
- `app/(tabs)/family.tsx` — family creation/joining

## Login Screen: The Missing Value Prop

### WARNING: Zero Value Proposition on Sign-Up

**The Problem:**

```tsx
// app/(auth)/login.tsx — the entire "marketing" surface
<Image source={require('@/assets/images/ebc-logo-stacked-white.png')} />
// Then immediately: email field, password field, "Sign In" button
// No tagline, no feature list, no reason to create an account
```

**Why This Breaks:**
1. First-time visitors from a bulletin or announcement have no context
2. The "Create Account" button offers no preview of what they gain
3. New attendees cannot distinguish this from any other login form

**The Fix:**

```tsx
// Add a tagline + subtitle below the logo
<Image source={require('@/assets/images/ebc-logo-stacked-white.png')} />
<Text style={styles.tagline}>Connecting our church family</Text>
<Text style={styles.subtitle}>
  Events, prayers, and announcements for Edna Baptist Church
</Text>
```

## Visitor Profile: The First Activation Gate

`app/visitor-profile.tsx` is the strongest conversion surface. Current copy works well:

```tsx
// GOOD — warm, community-framed header
<Text>Complete Your Profile</Text>
<Text>Help your church family get to know you better</Text>

// GOOD — sets expectations during pending state
<Text>Your account is pending approval. You can complete your profile
and join a family while waiting for approval.</Text>

// GOOD — success message surfaces the next step
Alert.alert('Success', 'Your profile has been saved! You can now create or join a family.')
```

### DO: Route to a Productive Next Step

```tsx
// Both "Save" and "Skip" route to /(tabs)/family — correct pattern
// This ensures every path leads to the next activation milestone
router.replace('/(tabs)/family');
```

### DON'T: Dead-End After Profile Save

```tsx
// BAD — routing to dashboard after profile save loses momentum
router.replace('/(tabs)/dashboard');
// User lands on dashboard with no clear next action
```

## Dashboard Activation Prompts

`app/(tabs)/dashboard.tsx` has three conditional prompts:

```tsx
// 1. Pending banner — always visible for pending users
{isPending && (
  <Text>Your account is pending approval from church leadership</Text>
)}

// 2. Profile completion card — visible when name is missing
{isPending && !hasCompleteName && (
  <TouchableOpacity onPress={() => router.push('/visitor-profile')}>
    <Text>Complete Your Profile</Text>
    <Text>Help your church family get to know you</Text>
  </TouchableOpacity>
)}

// 3. Family join card — visible when no family AND not pending
{!family && !isPending && (
  <TouchableOpacity onPress={() => router.push('/(tabs)/family')}>
    <Text>Join Your Family</Text>
    <Text>Connect with your family in the church community</Text>
  </TouchableOpacity>
)}
```

### WARNING: Pending Users See No Family Prompt

**The Problem:** The family join card checks `!isPending`, so pending users who completed their profile see the pending banner but no family prompt.

**Why This Breaks:** `visitor-profile.tsx` success message says "You can now create or join a family" — but the dashboard provides no path for pending users to do so.

**The Fix:**

```tsx
// Show family prompt for pending users too — they CAN join families
{!family && (
  <TouchableOpacity onPress={() => router.push('/(tabs)/family')}>
    <Text>Join Your Family</Text>
    <Text>Connect with your family in the church community</Text>
  </TouchableOpacity>
)}
```

## Family Join Friction

### WARNING: Token Join Flow Has No UI

**The Problem:**

```tsx
// hooks/user-context.tsx has joinFamily(token) calling join_family_with_token RPC
// But app/join-family.tsx shows this when trying to join as a new member:
Alert.alert('Join Token Required',
  'To join this family as a new member, you need a join token from a family member.');
// Then navigates back — no input field for the token
```

**Why This Breaks:** Users who receive a token from a family member have nowhere to enter it. The RPC exists, the context method exists, but the screen provides no text input.

**The Fix:** Add a token input field to `app/join-family.tsx` so users can paste the token they received.

## Conversion Copy Checklist

Copy this checklist when optimizing a conversion surface:

- [ ] Does the screen explain what the user gains by completing this step?
- [ ] Is there a clear next step after completion (no dead-ends)?
- [ ] Does pending-state copy communicate what happens next and how long?
- [ ] Are CTAs warm and action-oriented ("Join Your Family" not "Submit")?
- [ ] Does the empty state guide the user toward activation?
- [ ] Is error copy helpful, not just informative?
