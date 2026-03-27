# Activation & Onboarding Prioritization

## Contents
- Current Activation Flow
- Activation Gaps to Prioritize
- Scoring Activation Initiatives
- Anti-Patterns
- Checklist

## Current Activation Flow

EBC Connect has a multi-step activation funnel with significant drop-off risk:

```
Sign Up → Pending Approval → Profile Completion → Feature Discovery
```

### Step 1: Registration (auth-context.tsx)

```typescript
// The signUp flow creates a profile but lands in "pending" state
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  // User now exists but has role: 'pending'
  // They are redirected to dashboard where they see a warning banner
};
```

### Step 2: Pending State (dashboard.tsx)

The pending user sees a degraded dashboard with a warning banner and profile completion CTA:

```tsx
// Pending users see this suffix on their name
<Text>{displayName}{myRole === 'pending' ? ' · Pending' : ''}</Text>

// Warning banner shown at top
{myRole === 'pending' && (
  <View style={styles.pendingBanner}>
    <Text>Your account is pending approval</Text>
  </View>
)}

// Profile completion card when name is missing
{myRole === 'pending' && (!person?.first_name || !person?.last_name) && (
  <TouchableOpacity onPress={() => router.push('/visitor-profile')}>
    <Text>Complete Your Profile</Text>
  </TouchableOpacity>
)}
```

### Step 3: Role-Gated Walls

Multiple screens block pending users entirely:

```tsx
// prayers.tsx — full-screen gate
if (myRole === 'pending') {
  return (
    <View style={styles.emptyContainer}>
      <Text>Become a member to participate in the prayer list</Text>
    </View>
  );
}

// directory.tsx — full-screen gate with icon
if (profile?.role === 'pending') {
  return (
    <View style={styles.pendingContainer}>
      <AlertCircle size={64} color="#F59E0B" />
      <Text>Approval Required</Text>
      <Text>You need to be approved to view the church directory</Text>
    </View>
  );
}
```

## Activation Gaps to Prioritize

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| No progress indicator for pending users | Every new user — no visibility into approval status | Low — UI-only change | **P0** |
| No admin notification when users register | Admins don't know to approve; users wait indefinitely | Medium — needs push notification trigger | **P0** |
| No guided profile completion steps | Users don't know what to do after signing up | Low — checklist component on dashboard | **P1** |
| Tag assignment happens only via admin | "For You" personalization is empty until admin acts | Medium — self-assignable tag picker on profile | **P1** |
| No welcome content for new members | Approval leads to the same dashboard, no celebration | Low — one-time modal or card | **P2** |

## Scoring Activation Initiatives

### DO: Prioritize pre-existing data model support

```typescript
// Tags already support self-assignment — the field exists:
interface Tag {
  self_assignable: boolean;  // ← already in schema
  assign_min_role: 'member' | 'leader' | 'admin';
}
// Building a tag picker for users is LOW effort because the
// permission model is already enforced server-side.
```

### DON'T: Build activation features that require new Supabase tables

```typescript
// BAD — proposing an onboarding checklist stored in the database
// This requires: new table, new RPC, migration, backend work
// INSTEAD: Use client-side AsyncStorage for onboarding state
import { loadData, saveData } from '@/lib/storage';

const ONBOARDING_KEY = 'onboarding_progress';
// Track which steps the user has completed locally
```

### WARNING: Silent Empty Personalization

**The Problem:** The "For You" sections on the dashboard render nothing when a user has no tags assigned. There is no fallback, no explanation, and no CTA to fix it.

**Why This Breaks:** New members see a dashboard that looks incomplete. They don't understand that personalization requires tags. Admins don't know they need to tag people.

**The Fix:** Add a CTA card when "For You" sections are empty:

```tsx
// In dashboard.tsx, where "For You" sections render:
{forYouAnnouncements.length === 0 && (
  <View style={styles.card}>
    <Text>Personalize your feed</Text>
    <Text>Ask a church leader to add you to groups, or pick your interests.</Text>
  </View>
)}
```

## Anti-Patterns

### WARNING: Blocking Pending Users Without Guidance

**The Problem:** Screens like prayers and directory show a dead-end message with no next action.

**Why This Breaks:** Users cannot do anything to unblock themselves. They don't know how long approval takes or who to contact. This drives abandonment.

**The Fix:** Include contact information or estimated wait time:

```tsx
// GOOD — actionable gate screen
<View style={styles.pendingContainer}>
  <AlertCircle size={64} color="#F59E0B" />
  <Text>Approval Required</Text>
  <Text>A church admin will review your account.</Text>
  <Text>Questions? Contact {churchSettings.email}</Text>
</View>
```

## Checklist

Copy this checklist when prioritizing activation work:
- [ ] Does the pending user know their approval status?
- [ ] Does the admin get notified of new registrations?
- [ ] Can users complete their profile without admin help?
- [ ] Do empty "For You" sections explain why they're empty?
- [ ] Do role-gated walls provide a next action?
- [ ] Is there a first-login celebration or welcome?

See the **improving-activation-flow** skill for implementation details. See the **designing-onboarding-paths** skill for full funnel design.
