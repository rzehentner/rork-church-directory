# On-Page SEO Reference

## Contents
- Title Tag Patterns
- Meta Description Guidelines
- Open Graph Tags
- App Store / ASO On-Page
- WARNING: Generic Titles Across All Screens

---

## Title Tag Patterns

Titles follow `{Page-Specific Content} | EBC Connect`. The `| EBC Connect` suffix ensures brand recognition in search results and browser tabs.

```tsx
// Hierarchy:
// 1. Dynamic data-aware title (best)
<title>{event.title} | EBC Connect</title>

// 2. Section title (acceptable for tab screens)
<title>Events | EBC Connect</title>

// 3. App name alone (AVOID — zero keyword signal)
<title>EBC Connect</title>
```

Character limit: 50–60 characters. Truncation past 60 chars in SERPs wastes the signal.

```tsx
// Truncate long event titles
const pageTitle = event.title.length > 45
  ? `${event.title.slice(0, 45)}… | EBC Connect`
  : `${event.title} | EBC Connect`
```

---

## Meta Description Guidelines

Descriptions should answer: "Who is this for and what will they get?" Target 120–155 characters.

```tsx
// app/signup-form.tsx — form-specific description
const formDescription = form
  ? `Sign up for ${form.name} at Edna Baptist Church. ${form.description?.slice(0, 80) ?? ''}`
  : 'Sign up for events and activities at Edna Baptist Church.'

<Head>
  <meta name="description" content={formDescription.slice(0, 155)} />
</Head>
```

For the login screen (the only always-crawlable page):

```tsx
// app/(auth)/login.tsx
<Head>
  <title>EBC Connect — Edna Baptist Church Community App</title>
  <meta
    name="description"
    content="EBC Connect is the member app for Edna Baptist Church. Access events, prayer requests, announcements, and the church directory."
  />
</Head>
```

---

## Open Graph Tags

Open Graph controls how links preview in iMessage, Facebook, Slack, and messaging apps — critical for church members sharing events.

```tsx
// Full OG block for event-detail.tsx
<Head>
  <title>{event.title} | EBC Connect</title>
  <meta property="og:title" content={event.title} />
  <meta property="og:description" content={event.description?.slice(0, 155) ?? 'Church event at Edna Baptist Church'} />
  <meta property="og:type" content="event" />
  <meta property="og:site_name" content="EBC Connect" />
  {imageUrl && <meta property="og:image" content={imageUrl} />}
  <meta property="og:url" content={`https://app.ebcconnect.com/event-detail?id=${id}`} />

  {/* Twitter/X card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={event.title} />
  <meta name="twitter:description" content={event.description?.slice(0, 155) ?? ''} />
  {imageUrl && <meta name="twitter:image" content={imageUrl} />}
</Head>
```

The `eventImageUrl()` helper in `services/event-images.ts` resolves the Supabase storage URL — use it for `og:image`.

---

## App Store / ASO On-Page

The App Store listing IS on-page SEO for mobile. Key fields:

| Field | Limit | Signal Weight |
|-------|-------|---------------|
| App Name | 30 chars | Highest |
| Subtitle (iOS) | 30 chars | High |
| Keywords (iOS) | 100 chars | High (not shown) |
| Short Description (Android) | 80 chars | High |
| Long Description | 4000 chars | Medium |

Target keywords for Edna Baptist Church context:
- Primary: "church app", "church community", "church directory"
- Secondary: "prayer requests", "church events", "church announcements"
- Brand: "Edna Baptist Church", "EBC Connect"

**Recommended App Name:** `EBC Connect — Church Community`
**Recommended Subtitle (iOS):** `Events, Prayers & Directory`

See the **clarifying-market-fit** skill for value proposition language and the **crafting-page-messaging** skill for description copywriting.

---

## WARNING: Generic Titles Across All Screens

**The Problem:**

```tsx
// app/_layout.tsx — current state
<Stack.Screen name="event-detail" options={{ title: "Event Details" }} />
<Stack.Screen name="signup-form" options={{ title: "Sign Up" }} />
<Stack.Screen name="potluck-sheet" options={{ title: "Potluck Sign-Up" }} />
```

**Why This Breaks:**
1. Browser history shows "Event Details" for every event — indistinguishable tabs
2. If Google indexes these URLs, every page shows the same title and competes with itself
3. Shared links in iMessage/Slack show "Sign Up" with no context about what or when

**The Fix:**

Add `<Head>` tags in the screen component with data-aware titles. The `Stack.Screen` title serves as the native navigation header label (still useful). On web, `<Head>` overrides it for browser tab/crawler purposes.

```tsx
// Pattern: keep Stack.Screen title for native header,
// override with Head for web crawler + OG
<Stack.Screen options={{ title: event?.title ?? 'Event Details' }} />
<Head>
  <title>{event?.title ?? 'Event Details'} | EBC Connect</title>
</Head>
```
