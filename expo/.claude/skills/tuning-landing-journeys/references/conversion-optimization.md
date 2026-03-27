# Conversion Optimization Reference

## Contents
- The Three Conversion Gates
- Gate 1: Login / Sign-up
- Gate 2: Visitor Profile Completion
- Gate 3: Pending-Approval Dead End
- Dashboard Hierarchy and First-Click
- Anti-Patterns
- Audit Checklist

---

## The Three Conversion Gates

EBC Connect has a linear activation funnel with three hard gates:

```
Unauthenticated
  → [Gate 1: Login] → Account created
  → [Gate 2: visitor-profile] → Profile saved (or skipped)
  → [Gate 3: Pending approval] → Admin approves
  → Dashboard (activated member)
```

**Gate 1 — Login** (`app/(auth)/login.tsx`): Conversion = completed sign-up.
**Gate 2 — Visitor Profile** (`app/visitor-profile.tsx`): Conversion = profile saved, not skipped.
**Gate 3 — Pending Approval** (`app/index.tsx` redirect): No UI action, but the silent wait kills retention.

---

## Gate 1: Login / Sign-up

The login screen handles both sign-in and sign-up via a toggle. New visitor entry point is the sign-up form.

```tsx
// app/(auth)/login.tsx — mode toggle
const [isSignUp, setIsSignUp] = useState(false)

// Rendered CTA label
<Text>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
```

**Friction points:**
- Toggle between sign-in and sign-up is text-only — low affordance for first-time visitors
- No social proof or "X members already connected" near the sign-up CTA
- Error messages surface raw Supabase strings (see [content-copy](content-copy.md))

**Fix — clarify the new-user path:**

```tsx
// GOOD — separate visual treatment for new vs returning user
{isSignUp ? (
  <Text style={styles.formTitle}>Create your account</Text>
) : (
  <Text style={styles.formTitle}>Welcome back</Text>
)}
```

---

## Gate 2: Visitor Profile Completion

The skip button is the largest conversion leak in the funnel.

```tsx
// app/visitor-profile.tsx — CURRENT (neutral, no cost to skipping)
<TouchableOpacity onPress={handleSkip}>
  <Text style={styles.skipText}>Skip for now</Text>
</TouchableOpacity>
```

**Fix 1 — Progress framing makes skipping feel costly:**

```tsx
// GOOD — show completion percentage above the skip CTA
<View style={styles.progressRow}>
  <View style={[styles.progressBar, { width: `${completionPercent}%` }]} />
  <Text style={styles.progressLabel}>{completionPercent}% complete</Text>
</View>
<TouchableOpacity onPress={handleSkip}>
  <Text style={styles.skipText}>Finish later</Text>
</TouchableOpacity>
```

**Fix 2 — Reframe the heading from task to benefit:**

```tsx
// BAD — administrative framing
<Text style={styles.title}>Complete Your Profile</Text>

// GOOD — social benefit framing
<Text style={styles.title}>Let your church family get to know you</Text>
```

---

## Gate 3: Pending-Approval Dead End

### WARNING: Silent Pending State

**The Problem:**

```tsx
// app/index.tsx — CURRENT: pending users with a completed profile land in the dashboard
// but the dashboard shows nothing until admin approves — no explanation, no timeline
if (profile?.status === 'pending') {
  // Falls through to dashboard redirect with no holding screen
}
```

**Why This Breaks:**
1. Users don't know their status or what action is pending
2. No expectation for approval timeline — could be minutes or weeks
3. No re-engagement hook — users simply uninstall

**The Fix:**

```tsx
// app/index.tsx — route pending-but-complete profiles to a holding screen
if (profile?.status === 'pending' && !profile.first_name) {
  return router.replace('/visitor-profile')
}
if (profile?.status === 'pending') {
  return router.replace('/pending-approval') // dedicated holding screen
}
```

```tsx
// app/pending-approval.tsx — new screen
export default function PendingApprovalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're almost in!</Text>
      <Text style={styles.body}>
        A church admin will review and approve your account.
        You'll receive a notification when you're approved.
      </Text>
    </View>
  )
}
```

---

## Dashboard Hierarchy and First-Click

The quick-action grid in `app/(tabs)/dashboard.tsx` defines which features get discovered. Items render in array order — top-left gets the most clicks.

**Rule:** Put the feature your members use most in position 1. For a church app, Events and Prayers typically win. Verify with analytics before reordering.

**Role-aware empty states drive conversion:**

```tsx
// app/(tabs)/dashboard.tsx — GOOD pattern
{events.length === 0 && isAdmin ? (
  <TouchableOpacity onPress={() => router.push('/create-event')}>
    <Text style={styles.emptyAction}>Post the first event →</Text>
  </TouchableOpacity>
) : (
  <Text style={styles.emptyBody}>Events will appear here when posted.</Text>
)}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| "Skip for now" CTA | Encourages incompletion, no cost | "Finish later" + progress indicator |
| Generic login tagline | Doesn't answer "Is this for me?" | Benefit-specific copy tied to ICP |
| Silent pending state | Users abandon with no expectation | Dedicated holding screen with timeline |
| Equal quick-action grid | No hierarchy, random first-click | Sort by engagement data |
| Raw Supabase errors to users | Confusing, breaks trust | Map to friendly messages |

---

## Audit Checklist

Copy this checklist when auditing a conversion gate:

- [ ] Identify the conversion action (what does success look like?)
- [ ] Find the primary CTA — is it visually dominant?
- [ ] Check for escape hatches (skip, back, dismiss) and their copy
- [ ] Review the post-conversion state — what does the user see immediately after?
- [ ] Verify expectation-setting copy exists for any async wait
- [ ] Check empty states — do they drive action or just inform?
- [ ] Confirm error messages are user-friendly, not raw API strings
- [ ] Test on both iOS and Android for visual hierarchy differences
