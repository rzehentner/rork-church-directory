# Activation & Onboarding Reference

## Contents
- Entry Gate Pattern
- Visitor Profile Onboarding
- Role-Based Progressive Access
- Family Creation as Activation
- Anti-Patterns

## Entry Gate Pattern

Every session flows through `app/index.tsx`, which acts as a routing gate with a 15-second timeout fallback:

```typescript
// app/index.tsx — three-way routing decision
if (!user) {
  router.replace('/(auth)/login');
} else if (
  (profile?.role === 'pending' || profile?.role === 'visitor') &&
  (!profile?.first_name || !profile?.last_name)
) {
  router.replace('/visitor-profile');
} else {
  router.replace('/(tabs)/dashboard');
}
```

**Why this matters:** The gate ensures incomplete profiles never reach the dashboard. But the 15-second timeout (`setTimeout` fallback) is a friction point — users on slow connections see "Taking longer than expected" before they can retry or go to login.

### WARNING: Missing Splash-to-Content Transition

**The Problem:** The entry gate shows a static logo and "Loading your church family..." text with no progress indication beyond a spinner.

**Why This Breaks:**
1. Users on cellular connections may wait 5-10s with no feedback
2. No differentiation between "loading auth" vs "loading profile" vs "loading family"
3. The 15-second fallback is too long — users abandon before it triggers

**The Fix:** Add staged loading messages or a progress indicator:

```typescript
// GOOD — staged feedback tells user what's happening
const loadingMessage = authLoading
  ? 'Checking your account...'
  : userLoading
  ? 'Loading your profile...'
  : 'Almost ready...';
```

## Visitor Profile Onboarding

`app/visitor-profile.tsx` is the first screen new users see after signup. It collects name, email, birthday, and avatar:

```typescript
// visitor-profile.tsx — completion gate
// User cannot proceed without first + last name
if (!firstName.trim() || !lastName.trim()) {
  Alert.alert('Error', 'Please enter your first and last name');
  return;
}
// After save, routes to family screen
router.replace('/(tabs)/family');
```

**Friction points in this flow:**
- Skip option exists but shows a confirmation alert — users who skip miss family features
- No progress indicator (e.g., "Step 1 of 2")
- Birthday picker uses a date picker state machine duplicated across files
- Avatar upload failure shows a generic error with no retry affordance

### DO: Guide Users Through Required Steps

```typescript
// GOOD — clear what's required vs optional
<Text style={styles.label}>First Name *</Text>
<Text style={styles.label}>Last Name *</Text>
<Text style={styles.label}>Birthday (optional)</Text>
```

### DON'T: Let Users Skip Critical Steps Without Consequence

```typescript
// BAD — skip bypasses profile entirely, family features break
const handleSkip = () => {
  Alert.alert('Skip Profile Setup', '...', [
    { text: 'Skip', onPress: () => router.replace('/(tabs)/family') }
  ]);
};
// User arrives at family screen with no name, sees confusing empty state
```

## Role-Based Progressive Access

The app uses five roles that gate feature access: `admin`, `leader`, `member`, `pending`, `visitor`. See the **supabase** skill for role enum details.

```typescript
// hooks/me-context.tsx — derived role checks
const isAdmin = myRole === 'admin';
const isLeader = myRole === 'leader';
const isAdminOrLeader = isAdmin || isLeader;
```

**Activation milestones by role:**

| Role | Can Access | Activation Blocker |
|------|-----------|-------------------|
| `visitor` | Dashboard, settings | Must complete profile |
| `pending` | Dashboard, directory (read) | Awaiting admin approval |
| `member` | All features except admin | None — fully activated |
| `leader` | Member + create events/announcements | Requires admin promotion |
| `admin` | All features + admin panel | Requires manual DB/admin assignment |

### WARNING: Pending Users See No Progress

**The Problem:** After signing up, pending users see a static "Pending Approval" banner in settings with no way to check status or nudge admins.

**Why This Breaks:**
1. Users don't know if their request was received
2. No estimated wait time or admin contact info
3. Dashboard shows features they can't use, creating confusion

**The Fix:** Add a pending status card to dashboard with context:

```typescript
// GOOD — pending users get clear guidance on dashboard
{isPending && (
  <View style={styles.pendingCard}>
    <Clock size={24} color={Colors.status.warning} />
    <Text>Your account is pending approval</Text>
    <Text style={styles.subtitle}>
      A church leader will review your account shortly.
    </Text>
  </View>
)}
```

## Family Creation as Activation

Family membership is the key activation event — it unlocks tag-targeted events, announcements, and directory features. The flow is:

```
visitor-profile → /(tabs)/family → Create or Join
  ├─ Create: Enter family name → RPC creates family + adds user
  └─ Join: Browse directory → find family → RPC adds user to family
```

```typescript
// app/(tabs)/family.tsx — no-family prompt
{!family && (
  <View style={styles.noFamilyCard}>
    <Text>Join or Create a Family</Text>
    <Text>Connect with your church family to see targeted events</Text>
    <Button title="Get Started" onPress={() => setShowCreateModal(true)} />
  </View>
)}
```

**Friction:** The join-family flow (`app/join-family.tsx`) loads the entire directory without pagination. Large churches will see slow load times and no search-first UX.

## Onboarding Audit Checklist

Copy this checklist and track progress:
- [ ] Entry gate routes correctly for all 5 roles
- [ ] Visitor profile has clear required/optional field labels
- [ ] Pending users see status and next steps on dashboard
- [ ] Family creation/join flow has loading states
- [ ] Skip option warns about consequences
- [ ] Biometric prompt appears only after successful first login
- [ ] Magic link success message is clear ("Check your email")
- [ ] Password reset flow returns user to login after completion
