# Conversion Optimization Reference

## Contents
- Conversion Surfaces in EBC Connect
- Progressive Disclosure Pattern
- CTA Hierarchy and Placement
- WARNING: Dead-End Empty States
- WARNING: Generic Error Messages
- Gated Feature Messaging
- Conversion Audit Workflow

## Conversion Surfaces in EBC Connect

The app has five primary conversion points, each living in a screen file under `app/`:

| Surface | File | Conversion Goal |
|---------|------|-----------------|
| Login | `app/(auth)/login.tsx` | Authenticate or create account |
| Visitor Profile | `app/visitor-profile.tsx` | Complete profile (name, photo) |
| Dashboard prompts | `app/(tabs)/dashboard.tsx` | Profile completion, family join |
| Family join | `app/join-family.tsx` | Connect to existing family |
| Prayer gate | `app/(tabs)/prayers.tsx` | Motivate pending→member upgrade |

## Progressive Disclosure Pattern

Show conversion prompts only when the user meets the trigger condition. Never show all prompts at once.

```typescript
// app/(tabs)/dashboard.tsx — profile completion card
// Only renders for pending users with incomplete names
{isPending && (!person || !person.first_name || !person.last_name) && (
  <TouchableOpacity onPress={() => router.push('/visitor-profile')}>
    <Text style={styles.ctaTitle}>Complete Your Profile</Text>
    <Text style={styles.ctaSubtext}>Help your church family get to know you</Text>
  </TouchableOpacity>
)}

// Family join card — only for approved users without a family
{!family && !isPending && (
  <TouchableOpacity onPress={() => router.push('/(tabs)/family')}>
    <Text style={styles.ctaTitle}>Join Your Family</Text>
    <Text style={styles.ctaSubtext}>Connect with your family in the church community</Text>
  </TouchableOpacity>
)}
```

**Why this matters:** Showing a "Join Family" card to a pending user creates confusion — they can't join until approved. Conditional rendering eliminates dead-end CTAs.

## CTA Hierarchy and Placement

The app uses a consistent three-tier CTA system:

```typescript
// PRIMARY — solid purple background, white text
// Used for: Save Profile, Create Event, Submit, Join Family
createButton: {
  backgroundColor: '#7C3AED',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
}

// SECONDARY — outlined purple border, white background
// Used for: Skip for now, Cancel, Use magic link
secondaryButton: {
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#7C3AED',
}

// DESTRUCTIVE — solid red background
// Used for: Delete, Sign Out
destructiveButton: {
  backgroundColor: '#EF4444',
}
```

**Rule:** Every screen has at most ONE primary CTA. If two actions compete, demote one to secondary.

### WARNING: Dead-End Empty States

**The Problem:**

```typescript
// BAD — tells the user nothing is here, offers no action
<Text>No signup forms</Text>
```

**Why This Breaks:**
1. User has no idea what to do next
2. No pathway back to engagement — they'll close the app
3. Wastes a prime conversion opportunity (the user came looking for something)

**The Fix:**

```typescript
// GOOD — sets expectation + gives context
<Text style={styles.emptyTitle}>No Signup Forms</Text>
<Text style={styles.emptySubtext}>
  When events have signup forms available, they'll appear here.
</Text>
```

For admin/leader users, add a creation CTA:

```typescript
// GOOD — role-aware empty state with action
{isAdmin && (
  <TouchableOpacity onPress={() => router.push('/create-signup-form')}>
    <Text>Create First Form</Text>
  </TouchableOpacity>
)}
```

**When You Might Be Tempted:** When building a new list screen quickly. Always add the empty-state copy in the same PR.

### WARNING: Generic Error Messages

**The Problem:**

```typescript
// BAD — exposes internal details, doesn't help the user
showToast(error.message, 'error');
// Renders: "relation \"events_for_me\" does not exist"
```

**Why This Breaks:**
1. Leaks database schema details (security risk)
2. Confuses non-technical church members
3. Gives no recovery path

**The Fix:**

```typescript
// GOOD — names the failed action, hides internals
showToast('Failed to load events. Pull down to retry.', 'error');
```

**Pattern:** `"Failed to [verb] [noun]. [Recovery hint]."`

## Gated Feature Messaging

When a feature requires a specific role, the gate copy must explain **why** and **what to do**:

```typescript
// app/(tabs)/prayers.tsx — membership gate
// DO: Frame the gate as a benefit, not a restriction
<Text>Become a member to participate in the prayer list</Text>

// DON'T: Make it feel like a wall
<Text>You don't have permission to view this</Text>
```

The difference: "Become a member" implies a path forward. "You don't have permission" implies a dead end.

## Conversion Audit Workflow

Copy this checklist when auditing conversion surfaces:

- [ ] Every empty state has a next-action hint or expectation-setter
- [ ] CTAs are conditional on user state (pending, member, admin)
- [ ] Error messages name the failed action, not the internal cause
- [ ] Gated features explain the path to access, not just the restriction
- [ ] Primary CTA is visually dominant (purple `#7C3AED`, not outlined)
- [ ] "Skip for now" exists on optional steps (visitor profile, biometric opt-in)
- [ ] Success toasts confirm the completed action in past tense

1. Read the target screen file
2. Check each user-facing string against the checklist above
3. Edit strings that violate any rule
4. Validate: `npx tsc --noEmit` to catch any broken string templates
5. If validation fails, fix type errors and repeat step 4

See the **improving-activation-flow** skill for funnel-level conversion optimization.
See the **clarifying-market-fit** skill for aligning copy to ICP positioning.
