# Technical SEO Reference

## Contents
- Expo Router Head Component
- Dynamic vs Static Titles
- Deep Link URL Structure
- PWA / app.json Web Config
- Robots and Crawlability
- WARNING: Auth-Gated Pages

---

## Expo Router Head Component

Expo Router 6.x ships `expo-router/head` for injecting web `<head>` tags per-screen. It renders only on web (`Platform.OS === 'web'`); on native it's a no-op.

```tsx
// app/event-detail.tsx
import Head from 'expo-router/head'

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  // ... fetch event data ...

  return (
    <>
      {event && (
        <Head>
          <title>{event.title} | EBC Connect</title>
          <meta name="description" content={event.description?.slice(0, 155) ?? 'Church event details'} />
          <meta property="og:title" content={event.title} />
          <meta property="og:description" content={event.description?.slice(0, 155) ?? ''} />
          <meta property="og:type" content="event" />
          <link rel="canonical" href={`https://app.ebcconnect.com/event-detail?id=${id}`} />
        </Head>
      )}
      {/* screen content */}
    </>
  )
}
```

---

## Dynamic vs Static Titles

`Stack.Screen options.title` in `app/_layout.tsx` sets a static browser tab title. It does NOT include dynamic data (event name, form title). This is the current state for all screens.

```tsx
// CURRENT — static, generic title
<Stack.Screen name="event-detail" options={{ title: "Event Details" }} />

// BETTER — dynamic, per-item title via Head in the screen itself
// (Stack.Screen title is overridden by Head <title> on web)
```

The `<Head>` component title takes precedence over `Stack.Screen` title on web. Keep both: `Stack.Screen` as fallback, `<Head>` for data-aware overrides.

---

## Deep Link URL Structure

Expo Router file paths become URL paths on web. Current public-facing deep-link surfaces:

| Screen file | Web URL pattern | Purpose |
|-------------|-----------------|---------|
| `app/event-detail.tsx` | `/event-detail?id={uuid}` | Shareable event |
| `app/signup-form.tsx` | `/signup-form?formId={uuid}` | Public signup |
| `app/potluck-sheet.tsx` | `/potluck-sheet?formId={uuid}` | Potluck signup |
| `app/(auth)/login.tsx` | `/(auth)/login` | Entry for web crawlers |

These query-param URLs are canonical for sharing. If Google indexes them, each URL needs a `<Head>` with unique title/description. See the **expo-router** skill for deep link configuration.

---

## PWA / app.json Web Config

The web entry point is configured in `app.json`. Add web metadata here:

```json
// app.json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "favicon": "./assets/images/favicon.png",
      "name": "EBC Connect",
      "shortName": "EBC Connect",
      "description": "The church community app for Edna Baptist Church members and visitors.",
      "themeColor": "#1B2B5E",
      "backgroundColor": "#F5F0E8",
      "lang": "en"
    }
  }
}
```

`name` and `description` populate the PWA manifest and the default `<title>` / `<meta name="description">` at the document level.

---

## Robots and Crawlability

The Expo web build does not auto-generate `robots.txt`. For the hosted web app, add a `robots.txt` to your web static assets:

```
# public/robots.txt (place in web static folder for Expo web output)
User-agent: *
Disallow: /(auth)/
Disallow: /(tabs)/
Allow: /event-detail
Allow: /signup-form
Allow: /potluck-sheet
Sitemap: https://app.ebcconnect.com/sitemap.xml
```

Since most content is auth-gated, blocking tab routes prevents indexing private screens.

---

## WARNING: Auth-Gated Pages

**The Problem:**

Most EBC Connect screens require authentication (`app/index.tsx` redirects to login). If a search crawler follows a deep link to `/event-detail?id=...` without auth, it receives the login redirect — not the event content.

**Why This Breaks:**
1. Google indexes the login page under the event URL, not event content
2. Shared links show login instead of event preview (bad UX + no OG cards)
3. `<Head>` meta tags on `event-detail.tsx` are unreachable by crawlers

**The Fix:**

For events and forms marked `is_public: true`, skip the auth guard and render the content (or at least meta tags) without requiring login:

```tsx
// app/event-detail.tsx — conditional auth gate
const { session } = useAuth()

// Always render Head for public events (even before auth loads)
if (event?.is_public) {
  // Render public view with Head tags — no auth required
}
// Redirect to login only for private events
if (!session && !event?.is_public) {
  router.replace('/(auth)/login')
}
```

This is the single highest-impact technical SEO improvement available in this codebase.
