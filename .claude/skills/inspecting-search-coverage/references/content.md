# Content SEO Reference

## Contents
- Content Strategy for a Church App
- Keyword Intent by Screen
- App Store Long Description
- Copywriting Patterns
- Empty State Copy as SEO Signal

---

## Content Strategy for a Church App

EBC Connect is a **closed community tool**, not a content marketing site. The content SEO surface is narrow but high-intent:

1. **Store listings** — discovered by "church app" / "Edna Baptist Church" searches
2. **Shared links** — events and signup forms shared by members in messaging apps
3. **Web entry page** — login screen indexed by Google when the web build is live
4. **Deep links with preview text** — OG description seen before clicking

Content should answer: "Is this for my church?" Prioritize specificity (Edna Baptist Church, location, community language) over generic marketing.

---

## Keyword Intent by Screen

| Screen | Primary Intent | Suggested Title Pattern |
|--------|---------------|------------------------|
| Login | "church app login" / brand | "EBC Connect — Edna Baptist Church" |
| Event detail | "[event name] church" | "{event.title} \| EBC Connect" |
| Signup form | "sign up [event name]" | "Sign Up: {form.name} \| EBC Connect" |
| Potluck sheet | "potluck signup" | "Potluck: {form.name} \| EBC Connect" |
| Reset password | (utility, not indexed) | "Reset Password \| EBC Connect" |

---

## App Store Long Description

Structure the Play Store / App Store long description with front-loaded keywords (first 3 lines visible without "more"):

```
EBC Connect is the official app for Edna Baptist Church members and visitors.
Stay connected to your church community with real-time events, prayer requests,
announcements, and a family directory — all in one place.

FEATURES
• Church Events — Browse, RSVP, and add events to your calendar
• Prayer Requests — Share and pray for your church family
• Announcements — Never miss an update from church leadership
• Family Directory — Find and connect with church members
• Signup Forms — Register for classes, potlucks, and activities
• Push Notifications — Get reminders for events and updates

Built for Edna Baptist Church (EBC) in [City, State].
```

See the **clarifying-market-fit** skill for positioning language. See the **crafting-page-messaging** skill for tone and value prop details.

---

## Copywriting Patterns

### DO: Lead with community specificity

```
// GOOD — answers "is this for me?"
"The app for Edna Baptist Church members and visitors"

// BAD — generic, no differentiation
"A church community app"
```

### DO: Use action-oriented feature descriptions

```
// GOOD
"RSVP to events and get calendar reminders"

// BAD
"Event management features"
```

### DO: Match the login screen headline to the store listing headline

The login screen (`app/(auth)/login.tsx`) is the first thing web visitors see. Its headline should echo the App Store subtitle so the brand impression is consistent from discovery through install.

```tsx
// Consistent brand voice across surfaces:
// App Store name: "EBC Connect — Church Community"
// Login screen headline: "Welcome to EBC Connect"
// Login screen subtext: "Your Edna Baptist Church community app"
```

---

## Empty State Copy as SEO Signal

Empty states in the web build are indexed if they render before auth. Write them for humans AND as fallback meta description content:

```tsx
// app/(tabs)/events.tsx — empty state
// This text becomes the visible content if a crawler hits the page
<Text>No upcoming events. Check back soon for upcoming events at Edna Baptist Church.</Text>
```

The phrase "events at Edna Baptist Church" is a long-tail keyword that costs nothing to include naturally.

---

## Checklist: Content Audit

Copy this checklist and track progress:

- [ ] Login screen headline matches App Store app name
- [ ] Event detail `<Head>` description pulls from `event.description`
- [ ] Signup form `<Head>` description includes form name and event name
- [ ] App Store long description leads with church name in first line
- [ ] App Store keywords field includes: "church app", "prayer requests", "church directory", "Edna Baptist"
- [ ] Play Store short description (80 chars) includes church name
- [ ] `app.json` web description is set and includes church name
- [ ] Empty states on public-facing screens mention "Edna Baptist Church"
