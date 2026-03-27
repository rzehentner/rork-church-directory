# Content Copy Reference

## Contents
- Copy as a Conversion Lever
- High-Impact Copy Locations
- Anti-Patterns
- Copy Iteration Workflow

---

## Copy as a Conversion Lever

In EBC Connect, the app has no landing page — the login screen IS the top of funnel. Every string on the activation path (login, visitor-profile, family join, first RSVP) directly affects completion rates. Copy changes are low-risk and fast to deploy via OTA update (`npx eas update`).

The primary levers, in order of funnel impact:
1. Login screen headline + auth method labels
2. Visitor profile screen labels and placeholder text
3. Family tab empty-state CTAs
4. Dashboard quick-action labels and counts
5. Toast messages on successful conversions

---

## High-Impact Copy Locations

### Login Screen (`app/(auth)/login.tsx`)

The toggle between "Sign In" and "Sign Up" is a single boolean (`isSignUp`). Copy that conflates the two causes hesitation. Keep them distinct:

```typescript
// Button label — be specific about what happens next
<TouchableOpacity onPress={handleAuth}>
  <Text>{isSignUp ? 'Create My Account' : 'Sign In'}</Text>
</TouchableOpacity>

// Toggle link — frame as an escape, not a rebuke
<TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
  <Text>
    {isSignUp
      ? 'Already have an account? Sign in'
      : "New to EBC Connect? Create an account"}
  </Text>
</TouchableOpacity>
```

Magic link copy should explain the mechanic — church members may not know what a magic link is:

```typescript
// BAD — generic
<Text>Send Magic Link</Text>

// GOOD — explains the action
<Text>Email Me a Sign-In Link</Text>
```

### Visitor Profile Screen (`app/visitor-profile.tsx`)

The screen title and subtitle are the only explanation a new user gets for why they must complete a profile before accessing anything. Make the value explicit:

```typescript
// BAD — transactional
<Text style={styles.title}>Complete Your Profile</Text>

// GOOD — positions the app's value, explains the gate
<Text style={styles.title}>Welcome to EBC Connect</Text>
<Text style={styles.subtitle}>
  Add your name so members can recognize you in the directory and events.
</Text>
```

Required vs optional field labels affect completion. Mark optional fields explicitly:

```typescript
// BAD — no signal on optionality
<Text>Phone Number</Text>

// GOOD — removes friction on optional fields
<Text>Phone Number <Text style={styles.optional}>(optional)</Text></Text>
```

### Family Tab Empty State (`app/(tabs)/family.tsx`)

When `person.family_id` is null, the family tab shows an empty state. This is the highest-leverage copy in Stage 3 of the funnel. The empty state must do three things: explain why family matters, offer a clear path to create, and offer a clear path to join.

```typescript
// Empty state copy pattern
<Text style={styles.emptyTitle}>Connect With Your Family</Text>
<Text style={styles.emptySubtitle}>
  Link family members to share events, birthdays, and updates — or join an
  existing family group with an invite code.
</Text>

<TouchableOpacity onPress={() => setShowCreateModal(true)}>
  <Text>Create a Family Group</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => setShowJoinModal(true)}>
  <Text>Join with an Invite Code</Text>
</TouchableOpacity>
```

### Dashboard Quick-Action Labels (`app/(tabs)/dashboard.tsx`)

Quick-action labels are the first navigation the user sees post-activation. Use action-oriented nouns, not screen names:

```typescript
// BAD — screen name labels
{ id: 'prayers', label: 'Prayers' }
{ id: 'forms',   label: 'Forms'   }

// GOOD — what the user does there
{ id: 'prayers', label: 'Prayer Requests' }
{ id: 'forms',   label: 'Sign Ups'        }
```

### Toast Messages on Conversion

Toasts fire immediately after key conversions. They're underused as positive reinforcement:

```typescript
// app/(tabs)/events.tsx — after RSVP
showToast('success', status === 'going'
  ? "You're going! We'll remind you before the event."
  : `RSVP updated to ${status}`);

// app/signup-form.tsx — after submitMutation.onSuccess
showToast('success', data.status === 'waitlisted'
  ? `${data.respondent_name} is on the waitlist — we'll notify you if a spot opens.`
  : `${data.respondent_name} is signed up!`);
```

---

## WARNING: Vague Placeholder Text Suppresses Form Completion

**The Problem:**

```typescript
// BAD — tells the user nothing about what to enter
<TextInput placeholder="Name" />
<TextInput placeholder="Enter text..." />
```

**Why This Breaks:**
1. Users skip optional fields when placeholder gives no hint of value
2. Ambiguous placeholders on required fields cause validation errors and frustration
3. For church members who may be less tech-savvy, "Name" doesn't clarify first vs. full name

**The Fix:**

```typescript
// GOOD — specific, reduces input errors
<TextInput placeholder="First name" />
<TextInput placeholder="Last name" />
<TextInput placeholder="(555) 555-5555" keyboardType="phone-pad" />
```

---

## Copy Iteration Workflow

Because string changes can ship via OTA update without a native build, copy is the fastest thing to iterate on. Follow this loop:

1. Identify the screen with the highest funnel drop-off (use the SQL query in `measurement-testing.md`)
2. Read the current copy in the component
3. Write 2 variants — one more benefit-oriented, one more action-oriented
4. Ship via `npx eas update` to the preview channel
5. Compare activation rates before/after in Supabase (profile_complete ÷ signed_up)
6. Adopt the winning variant

For copy review, see the **crafting-page-messaging** skill for conversion copy standards and the **clarifying-market-fit** skill for ICP-aligned value framing.
