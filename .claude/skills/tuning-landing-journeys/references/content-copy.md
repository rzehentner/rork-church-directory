# Content Copy Reference

## Contents
- Copy Inventory by Screen
- Login Screen
- Visitor Profile
- Dashboard
- Empty States
- Error Messages
- Anti-Patterns

---

## Copy Inventory by Screen

| Screen | Key Copy Surface | File |
|--------|-----------------|------|
| Login | Tagline, form title, CTA labels, error messages | `app/(auth)/login.tsx` |
| Visitor Profile | Heading, field labels, skip CTA, pending notice | `app/visitor-profile.tsx` |
| Dashboard | Greeting, section headers, quick-action labels | `app/(tabs)/dashboard.tsx` |
| Settings | Section labels, toggle descriptions | `app/(tabs)/settings.tsx` |
| Tab bar | Tab labels | `app/(tabs)/_layout.tsx` |

---

## Login Screen

```tsx
// app/(auth)/login.tsx — current tagline below the logo
<Text style={styles.tagline}>Stay connected with your church community</Text>

// CTA labels — current
<Text>Sign In</Text>
<Text>Create Account</Text>
<Text>Send Magic Link</Text>
```

**Tagline principle:** Answer "Is this for me?" before asking the visitor to act. The current tagline is generic. Tie it to a specific benefit for Edna Baptist members:

```tsx
// GOOD — specific benefit + named church
<Text style={styles.tagline}>
  Everything happening at Edna Baptist, in one place.
</Text>
```

**CTA label principle:** Task-specific labels outperform generic ones. "Send Magic Link" requires the user to know what a magic link is — this is church-app jargon.

```tsx
// BAD — assumes technical literacy
<Text>Send Magic Link</Text>

// GOOD — outcome-first label
<Text>Email me a sign-in link</Text>
```

See the **crafting-page-messaging** skill for full CTA copy patterns.

---

## Visitor Profile

```tsx
// app/visitor-profile.tsx — current header
<Text style={styles.title}>Complete Your Profile</Text>
<Text style={styles.subtitle}>Help your church family get to know you</Text>
```

The subtitle is already benefit-framed. The title reads as a task. Align them:

```tsx
// GOOD — consistent benefit framing
<Text style={styles.title}>Let your church family get to know you</Text>
<Text style={styles.subtitle}>Add a photo and your info to get started.</Text>
```

**Skip CTA — avoid neutral framing:**

```tsx
// BAD — no cost, easy to dismiss
<Text>Skip for now</Text>

// GOOD — implies incompleteness, preserves intent
<Text>Finish later</Text>
```

**Post-save pending notice (currently missing):**

```tsx
// GOOD — sets expectations after profile save
<View style={styles.successBanner}>
  <Text style={styles.successTitle}>Profile submitted!</Text>
  <Text style={styles.successBody}>
    A church admin will review and approve your account.
    We'll notify you when you're in.
  </Text>
</View>
```

---

## Dashboard

```tsx
// app/(tabs)/dashboard.tsx — personalized greeting (already good)
`Good ${timeOfDay}, ${displayName}`
```

The greeting is well-personalized. The section headers below it drive scanning:

```tsx
// Current section headers
"Upcoming Events"
"Announcements"
"Prayer Requests"
```

These are fine for activated members. They fail for empty states — a screen of empty sections with no action guidance reads as broken.

---

## Empty States

Every empty state must answer: "What should I do now?"

```tsx
// BAD — informs but doesn't direct
<Text>No events</Text>

// GOOD — member-facing empty state
<View style={styles.emptyContainer}>
  <Text style={styles.emptyTitle}>Nothing on the calendar yet</Text>
  <Text style={styles.emptyBody}>
    Events posted by your church will appear here.
  </Text>
</View>

// GOOD — admin-facing empty state (same screen, role-aware)
{isAdmin && (
  <TouchableOpacity onPress={() => router.push('/create-event')}>
    <Text style={styles.emptyAction}>Post the first event →</Text>
  </TouchableOpacity>
)}
```

**Empty state copy formula:** `[What's missing] + [Why it's empty] + [What to do next]`

---

## Error Messages

```tsx
// app/(auth)/login.tsx — CURRENT: raw Supabase error
Alert.alert('Sign In Failed', error.message)
// Surfaces: "Invalid login credentials", "Email not confirmed", etc.
```

### WARNING: Raw API Errors Shown to Users

**The Problem:** Supabase error messages are written for developers, not church members.

**Why This Breaks:**
1. "Invalid login credentials" doesn't tell the user which field is wrong
2. Technical jargon erodes trust on a first-use screen
3. "Email not confirmed" requires the user to know what that means

**The Fix:**

```tsx
// GOOD — map to friendly messages
function getAuthErrorMessage(error: { message: string }): string {
  if (error.message.includes('Invalid login credentials')) {
    return 'Email or password is incorrect. Try again or use the email sign-in link.'
  }
  if (error.message.includes('Email not confirmed')) {
    return 'Check your email to confirm your account, then try again.'
  }
  if (error.message.includes('User already registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  return 'Something went wrong. Please try again.'
}
```

---

## Anti-Patterns

| Anti-Pattern | Example | Fix |
|--------------|---------|-----|
| Raw API error messages | `"Invalid login credentials"` | Map to friendly, actionable copy |
| Administrative framing | `"Complete Your Profile"` | Benefit framing: `"Let us get to know you"` |
| Generic empty states | `"No data"` / `"No events"` | Formula: missing + why + next action |
| Jargon in CTAs | `"Send Magic Link"` | `"Email me a sign-in link"` |
| Neutral skip labels | `"Skip for now"` | `"Finish later"` (implies cost) |
| Missing post-action copy | Silent redirect after sign-up | Confirmation + next-step instruction |
