# Content & Copy Reference

## Contents
- Tier-Specific Copy Patterns
- Value Proposition Copy Locations
- CTA Copy by Progression State
- WARNING: Generic Empty States
- Copy Consistency Rules
- Tone Guidelines

## Tier-Specific Copy Patterns

Each tier needs copy that acknowledges where the user is and motivates the next step.

### Pending User Copy

```tsx
// app/(tabs)/dashboard.tsx — pending banner
<Text>Your account is pending approval from church leadership</Text>

// app/visitor-profile.tsx — pending warning
<Text>Your account is pending approval. You can complete your profile
and join a family while waiting for approval.</Text>
```

**Pattern:** Acknowledge the wait, but show what they CAN do now.

### Member Value Copy

```tsx
// app/(tabs)/dashboard.tsx — join family CTA
<Text style={styles.joinFamilyTitle}>Join Your Family</Text>
<Text style={styles.joinFamilySubtitle}>
  Connect with your family in the church community
</Text>
```

### Admin/Leader Feature Copy

```tsx
// app/(tabs)/admin.tsx — bulletin promo card
<Text style={styles.bulletinPromoTitle}>Weekly Bulletin</Text>
<Text style={styles.bulletinPromoDescription}>
  Generate a print-ready bulletin with prayers, events,
  schedules, and custom sections
</Text>
```

## Value Proposition Copy Locations

| Screen | Copy Purpose | File |
|--------|-------------|------|
| Login | Brand promise, auth CTAs | `app/(auth)/login.tsx` |
| Visitor Profile | Profile completion motivation | `app/visitor-profile.tsx` |
| Dashboard | Engagement hooks, quick actions | `app/(tabs)/dashboard.tsx` |
| Developer Info | Mission statement, about | `app/developer-info.tsx` |
| Settings | Role status, account info | `app/(tabs)/settings.tsx` |
| Family | Family connection value | `app/(tabs)/family.tsx` |

### Core Brand Copy

```tsx
// app/developer-info.tsx — mission statement
"EBC Connect was built to strengthen the bonds of our church family
at Edna Baptist Church. Staying connected, informed, and engaged
has never been easier."

// Tagline
"Connecting our church family"

// Footer
"Made with love for the EBC family"
```

## CTA Copy by Progression State

### DO: Match CTA Copy to User's Current State

```tsx
// GOOD — contextual CTAs for pending users
{isPending && !person?.first_name && (
  <>
    <Text>Complete Your Profile</Text>
    <Text>Help your church family get to know you</Text>
  </>
)}

// GOOD — contextual CTA for members without family
{!family && !isPending && (
  <>
    <Text>Join Your Family</Text>
    <Text>Connect with your family in the church community</Text>
  </>
)}
```

### DON'T: Show the Same CTA to Every User

```tsx
// BAD — generic CTA ignoring user state
<Text>Get Started</Text>
<Text>Explore the app</Text>
// Pending users need to complete their profile, not "explore"
```

**Why this breaks:** A pending user seeing "Explore the app" has no clear next action. State-aware CTAs drive progression through the funnel.

## WARNING: Generic Empty States

**The Problem:**

```tsx
// BAD — empty state with no value hook
<Text>No events yet</Text>
```

**Why This Breaks:**
1. New users see empty screens and assume the app has no content
2. No motivation to return or check back
3. Missed opportunity to explain what this feature does

**The Fix:**

```tsx
// GOOD — empty state that explains value and shows next step
<Text style={styles.emptyTitle}>No upcoming events</Text>
<Text style={styles.emptySubtitle}>
  Church events will appear here. Check back soon!
</Text>
{isAdminOrLeader && (
  <TouchableOpacity onPress={() => router.push('/create-event')}>
    <Text>Create an Event</Text>
  </TouchableOpacity>
)}
```

## Copy Consistency Rules

### Terminology — Pick One, Use Everywhere

| Concept | Standard Term | Avoid |
|---------|--------------|-------|
| People in the church | "church family" | "congregation", "members", "users" |
| Login action | "Sign In" | "Log In", "Login" |
| Account creation | "Create Account" | "Register", "Sign Up" (except forms) |
| Approval process | "pending approval" | "awaiting verification", "under review" |
| Role promotion | "role" | "tier", "level", "plan" |

### DO: Use "church family" Consistently

```tsx
// GOOD — warm, community-oriented
"Help your church family get to know you better"
"Connect with your family in the church community"
"Loading your church family..."

// BAD — cold, transactional
"Complete your user profile"
"Browse the member directory"
```

### DON'T: Mix Formal and Informal Tone

```tsx
// BAD — inconsistent tone
"Your account is pending approval from church leadership" // formal
"Made with love for the EBC family" // informal
// Pick a consistent warmth level
```

## Tone Guidelines

EBC Connect copy follows a **warm-professional** tone:
- First person plural ("our church family") for community identity
- Second person ("your profile", "your family") for user actions
- Encouraging, not demanding ("Help your church family" vs "You must complete")
- Acknowledge friction ("while waiting for approval") rather than hiding it

See the **clarifying-market-fit** skill for deeper positioning and ICP alignment.
See the **crafting-page-messaging** skill for screen-level copy frameworks.
