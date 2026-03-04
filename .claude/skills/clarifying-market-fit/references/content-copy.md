# Content & Copy Reference

## Contents
- Copy Architecture
- Voice and Tone Rules
- Screen-by-Screen Copy Inventory
- Empty State Patterns
- Error and Status Copy
- Copy Update Workflow

## Copy Architecture

All user-facing copy in EBC Connect is **hardcoded in component files**. There is no CMS, no i18n layer, no content management system. Every string edit requires a code change.

Copy locations follow the file structure:
- **Screen copy:** `app/*.tsx` and `app/(tabs)/*.tsx`
- **Component copy:** `components/*.tsx`
- **System messages:** `hooks/*-context.tsx`
- **Toast/alerts:** `hooks/toast-context.tsx`

To find all instances of a term:

```bash
grep -rn "church family" app/ components/ hooks/
```

## Voice and Tone Rules

EBC Connect speaks as a **warm church community**, not a software product.

| Rule | DO | DON'T |
|------|-----|-------|
| Address members | "your church family" | "users", "customers" |
| Reference leadership | "church leadership" | "admins", "administrators" |
| Frame actions | "get to know you" | "complete registration" |
| Describe features | "stay connected" | "engagement tools" |
| Handle errors | "Something went wrong" | "Error 500" |
| Empty states | "Check back for updates from your community" | "No data found" |

### Brand Terminology (Canonical)

These terms appear in `app/developer-info.tsx` and must be used consistently:

```tsx
// Canonical terms — use these exact phrases
"EBC Connect"                    // app name (never "the app" or "the platform")
"Edna Baptist Church"            // full church name
"Connecting our church family"   // tagline
"church family"                  // members collectively
"church leadership"              // admins/leaders from user perspective
```

## Screen-by-Screen Copy Inventory

### Login (`app/(auth)/login.tsx`)

| Element | Copy | Tone |
|---------|------|------|
| CTA (sign in) | "Sign In" | Neutral |
| CTA (sign up) | "Create Account" | Neutral |
| Toggle | "Don't have an account?" | Neutral |
| Magic link | "Use magic link" | Neutral |
| Biometric upsell | "Would you like to enable biometric authentication for faster sign-in next time?" | Helpful |

**Gap:** No tagline or value proposition copy exists on this screen.

### Dashboard (`app/(tabs)/dashboard.tsx`)

| Element | Copy | Tone |
|---------|------|------|
| Greeting | "Good morning, {name}" | Warm |
| Pending banner | "Your account is pending approval from church leadership" | Informational |
| Profile prompt | "Help your church family get to know you" | Encouraging |
| Family prompt | "Connect with your family in the church community" | Warm |
| Section headers | "For You", "Events For You", "Quick Access" | Personal |

### Visitor Profile (`app/visitor-profile.tsx`)

| Element | Copy | Tone |
|---------|------|------|
| Title | "Complete Your Profile" | Directive |
| Subtitle | "Help your church family get to know you better" | Warm |
| Photo help | "Add a photo so your church family can recognize you" | Encouraging |
| Pending notice | "Your account is pending approval..." | Transparent |

## Empty State Patterns

Empty states are the highest-leverage copy surfaces. They appear when a user first encounters a feature.

### GOOD Empty States (Existing)

```tsx
// app/(tabs)/announcements.tsx — admin empty state with CTA
<Text>Create your first announcement to get started</Text>
<Pressable><Text>Create Announcement</Text></Pressable>

// app/(tabs)/prayers.tsx — directional empty state
<Text>No active prayers</Text>
<Text>Tap "New" to add a prayer request</Text>
```

### WARNING: Weak Empty States

```tsx
// BAD — app/(tabs)/events.tsx — no direction, no value framing
<Text>No upcoming events</Text>
<Text>Check back later for new events</Text>
// User has no idea WHEN to check back or WHY events matter

// BETTER — add value framing and specificity
<Text>No upcoming events</Text>
<Text>Events help our church family gather and grow together.
New events are added by church leadership each week.</Text>
```

```tsx
// BAD — app/notifications.tsx — purely descriptive
<Text>No notifications</Text>
<Text>You will see notifications about events and announcements here</Text>

// BETTER — explain the value of notifications
<Text>No notifications yet</Text>
<Text>You'll be notified when new events, announcements, or prayer
updates are shared with the church family.</Text>
```

## Error and Status Copy

### DO: Maintain Community Tone in Errors

```tsx
// GOOD — app/_layout.tsx crash screen
<Text>Something went wrong</Text>
<Text>The app encountered an error during initialization.</Text>
<Pressable><Text>Try Again</Text></Pressable>

// GOOD — hooks/toast-context.tsx network warning
"You are offline. Some features may not work properly."
```

### DON'T: Expose Technical Error Messages

```tsx
// BAD — exposing internal error messages
Alert.alert('Error', error.message);
// error.message could be "relation 'events_for_me' does not exist"

// GOOD — translate to community language
Alert.alert('Something went wrong',
  'We couldn\'t load this content. Please try again.');
```

## Copy Update Workflow

1. Find the copy: `grep -rn "text to find" app/ components/`
2. Edit the string in the source file
3. Verify no other screens use the old wording: `grep -rn "old text" app/`
4. Check that the new wording matches the voice rules above
5. Test on both web and native — some copy surfaces are platform-conditional
6. Deploy via OTA: `npx eas update`

See the **crafting-page-messaging** skill for page-level copy patterns.
