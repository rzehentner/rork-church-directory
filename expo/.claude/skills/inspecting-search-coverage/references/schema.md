# Structured Data / Schema Reference

## Contents
- Schema.org Surfaces for EBC Connect
- Event Schema (JSON-LD)
- Organization Schema
- MobileApplication Schema
- Implementation via Expo Router Head
- WARNING: Schema on Auth-Gated Pages Is Wasted

---

## Schema.org Surfaces for EBC Connect

Three schema types are relevant:

| Schema Type | Surface | Benefit |
|-------------|---------|---------|
| `Event` | `event-detail.tsx` (public events) | Google Event rich cards in search |
| `Organization` | Login page / web entry | Knowledge panel for "Edna Baptist Church app" |
| `MobileApplication` | Login page / web entry | App listing in Google search results |

All are injected via `<Head>` using a `<script type="application/ld+json">` tag. See the **adding-structured-signals** skill for full implementation details.

---

## Event Schema (JSON-LD)

Google can surface church events as rich cards if they have `Event` schema on a public, non-auth-gated URL.

```tsx
// app/event-detail.tsx — Event JSON-LD
import Head from 'expo-router/head'

function buildEventSchema(event: EventDetail, imageUrl: string | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.start_at,
    endDate: event.end_at,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: event.location
      ? { '@type': 'Place', name: event.location }
      : { '@type': 'Place', name: 'Edna Baptist Church' },
    organizer: {
      '@type': 'Organization',
      name: 'Edna Baptist Church',
    },
    ...(imageUrl ? { image: imageUrl } : {}),
  }
}

// In component:
{event?.is_public && (
  <Head>
    <script type="application/ld+json">
      {JSON.stringify(buildEventSchema(event, imageUrl))}
    </script>
  </Head>
)}
```

Only emit Event schema for `is_public: true` events. Private events on auth-gated pages will never be crawled anyway.

---

## Organization Schema

Emit once on the login/entry page to establish the church's knowledge panel:

```tsx
// app/(auth)/login.tsx — Organization JSON-LD
import Head from 'expo-router/head'

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Edna Baptist Church',
  alternateName: 'EBC',
  url: 'https://app.ebcconnect.com',
  description: 'Edna Baptist Church community app — events, prayer requests, announcements, and member directory.',
}

// In component:
<Head>
  <script type="application/ld+json">
    {JSON.stringify(orgSchema)}
  </script>
</Head>
```

---

## MobileApplication Schema

Signals to Google that the web URL is a mobile app listing. Boosts appearance in "apps like X" and direct brand searches:

```tsx
// app/(auth)/login.tsx — MobileApplication JSON-LD (add alongside Org schema)
const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'EBC Connect',
  description: 'The church community app for Edna Baptist Church members and visitors.',
  operatingSystem: 'iOS, Android',
  applicationCategory: 'LifestyleApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}
```

---

## Implementation via Expo Router Head

The `<Head>` component from `expo-router/head` accepts `<script>` tags. Ensure the JSON is valid before injecting:

```tsx
// Safe JSON-LD injection pattern
const schemaJson = JSON.stringify(buildEventSchema(event, imageUrl))

<Head>
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: schemaJson }}
  />
</Head>
```

Note: `dangerouslySetInnerHTML` is required for `<script>` tag content in React. The data comes from your own Supabase query, not user input — XSS risk is low. Still, validate that `event.title` and `event.description` don't contain `</script>` injection:

```tsx
function sanitizeForJson(str: string) {
  return str.replace(/<\/script>/gi, '<\\/script>')
}
```

---

## WARNING: Schema on Auth-Gated Pages Is Wasted

**The Problem:**

Adding `Event` schema to `event-detail.tsx` while the auth guard redirects all unauthenticated requests to `/login` means Google's crawler never reaches the schema markup.

**Why This Breaks:**
1. Googlebot follows the redirect and indexes `/login` with event schema metadata — invalid
2. Google Search Console may flag "Event not found at URL" errors
3. Rich result eligibility is lost

**The Fix:**

Gate schema emission on `is_public: true` AND defer rendering until after the auth decision:

```tsx
// Only show Event schema if:
// 1. Event is flagged is_public
// 2. Crawler can reach the page without auth
if (event?.is_public) {
  // render public content + schema
} else if (!session) {
  router.replace('/(auth)/login')
  return null
}
```

See `references/technical.md` for the full auth-guard bypass pattern.
