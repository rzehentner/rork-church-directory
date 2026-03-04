# Content & Copy Reference

## Contents
- Voice and Tone Rules
- Copy Locations in the Codebase
- CTA Label Patterns
- Empty State Copy Formula
- WARNING: Product Language in User Copy
- WARNING: Passive Voice in CTAs
- Confirmation and Error Message Patterns
- Copy Review Workflow

## Voice and Tone Rules

EBC Connect serves a church community spanning teens to seniors. The voice is:

| Attribute | Do | Don't |
|-----------|----|----|
| Warm | "Help your church family get to know you" | "Complete required fields" |
| Direct | "Save Profile" | "Click here to save your profile information" |
| Inclusive | `person?.first_name \|\| 'Friend'` | "Unknown User" |
| Action-first | "Join Your Family" | "Family joining is available" |
| Transparent | "Your account is pending approval from church leadership" | "Processing..." |

**Core vocabulary:** "church family", "connect", "community", "prayer", "fellowship". NEVER use: "users", "account", "feature", "session", "token".

## Copy Locations in the Codebase

All user-facing strings are inline in screen and component files. There is no i18n layer or CMS.

| Copy Type | Location Pattern | Example File |
|-----------|-----------------|--------------|
| Hero/greeting text | `app/(tabs)/dashboard.tsx` | Time-aware greeting, user name |
| Login flow copy | `app/(auth)/login.tsx` | CTA labels, mode toggles |
| Onboarding prompts | `app/visitor-profile.tsx` | Form labels, value statements |
| Empty states | Individual screen files in `app/(tabs)/` | Prayers, forms, announcements |
| Toast messages | Inline `showToast()` calls in screen files | Success/error confirmations |
| Alert dialogs | `Alert.alert()` calls in screen/component files | Destructive confirmations |
| Status messaging | `app/(tabs)/dashboard.tsx`, `app/(tabs)/settings.tsx` | Pending badges, approval banners |

To find all user-facing strings for a screen, search for string literals in that file:

```bash
# Find all quoted strings in a screen file
grep -n "'" app/(tabs)/dashboard.tsx | grep -v "import\|style\|const\|=>"
```

## CTA Label Patterns

**Formula:** `[Verb] [Object]` — max 3 words.

```typescript
// PRIMARY CTAs (solid purple button)
"Save Profile"        // visitor-profile.tsx
"Create Event"        // create-event.tsx header
"Send Magic Link"     // login.tsx (magic link mode)
"Sign In"             // login.tsx (password mode)
"Create Account"      // login.tsx (signup mode)
"Update Password"     // reset-password.tsx
"Join Family"         // join-family.tsx

// SECONDARY CTAs (outlined or text link)
"Skip for now"        // visitor-profile.tsx
"Use magic link"      // login.tsx toggle
"Use password instead"// login.tsx toggle
"Forgot Password?"    // login.tsx link
"See All"             // dashboard.tsx section links
"Retry"               // error banners
```

**Rule:** If a CTA label exceeds 3 words, it's trying to do too much. Split the action or simplify.

### WARNING: Product Language in User Copy

**The Problem:**

```typescript
// BAD — technical product language
<Text>Your session has expired. Please re-authenticate.</Text>
<Text>No data available for this query.</Text>
<Text>Feature not available for your role.</Text>
```

**Why This Breaks:**
1. Church members don't think in sessions, queries, or roles
2. Creates anxiety ("Did something break?")
3. Breaks the community tone

**The Fix:**

```typescript
// GOOD — community-framed, action-oriented
<Text>Welcome back! Please sign in again.</Text>
<Text>Nothing here yet. Check back soon!</Text>
<Text>Become a member to participate in the prayer list</Text>
```

**When You Might Be Tempted:** When logging or debugging — never let debug language leak into UI strings.

### WARNING: Passive Voice in CTAs

**The Problem:**

```typescript
// BAD — passive, unclear who acts
<Text>Your profile can be completed here</Text>
<Text>Events are created by administrators</Text>
```

**Why This Breaks:**
1. Users don't know THEY should act
2. Passive CTAs get ignored — they feel informational, not actionable
3. Conversion rates drop when the user isn't the subject

**The Fix:**

```typescript
// GOOD — active voice, user is the subject
<Text>Complete Your Profile</Text>
<Text>Ask a leader to create this event</Text>
```

## Empty State Copy Formula

**Structure:** `[What's missing]` + `[What to do or what to expect]`

```typescript
// Prayers screen — action-oriented
<Text style={styles.emptyTitle}>No active prayers</Text>
<Text style={styles.emptySubtext}>Tap "New" to add a prayer request</Text>

// Forms screen — expectation-setting
<Text style={styles.emptyTitle}>No Signup Forms</Text>
<Text style={styles.emptySubtext}>
  When events have signup forms available, they'll appear here.
</Text>

// Family search — guidance
<Text style={styles.emptyTitle}>No families found</Text>
<Text style={styles.emptySubtext}>Try adjusting your search</Text>

// Admin approvals — completion state
<Text style={styles.emptyTitle}>No pending approvals</Text>
<Text style={styles.emptySubtext}>All users have been processed</Text>
```

**Rule:** NEVER render just the title without a subtext. The subtext is the conversion lever.

## Confirmation and Error Message Patterns

**Success toast formula:** `"[Object] [past-tense verb] successfully"` or `"[Object] [past-tense verb]"`

```typescript
showToast('Event created successfully', 'success');
showToast('Profile saved', 'success');
showToast('RSVP updated to going', 'success');
showToast('Marked as read', 'success');
showToast('Event added to calendar', 'success');
```

**Error toast formula:** `"Failed to [verb] [object]"` with optional recovery hint.

```typescript
showToast('Failed to create event', 'error');
showToast('Failed to load events. Pull down to retry.', 'error');
```

**Destructive confirmation formula:** `"Are you sure you want to [verb] [object]?"`

```typescript
Alert.alert(
  'Delete Event',
  'Are you sure you want to delete this event? This cannot be undone.',
  [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: handleDelete }]
);
```

## Copy Review Workflow

1. Read the target screen file with the Read tool
2. Extract all user-facing strings (text inside `<Text>`, `Alert.alert()`, `showToast()`, placeholder props)
3. Check each string against the voice rules table above
4. Edit violations using the Edit tool
5. Validate: `npx tsc --noEmit`
6. If validation fails, fix and repeat step 5

See the **frontend-design** skill for styling CTAs and empty states.
See the **clarifying-market-fit** skill for ICP-aligned value propositions.
