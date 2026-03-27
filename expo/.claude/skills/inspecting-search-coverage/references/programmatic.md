# Programmatic SEO Reference

## Contents
- Programmatic SEO Scope for EBC Connect
- Dynamic Head Tags from Supabase Data
- Sitemap Generation
- Deep Link Sharing with Preview Data
- WARNING: Don't Over-Engineer for a Private App

---

## Programmatic SEO Scope for EBC Connect

EBC Connect is not a content-at-scale site. Programmatic SEO here means:

1. **Auto-generating correct Head tags** from Supabase data at render time (events, forms)
2. **Generating a sitemap** of public/deep-linked URLs if the web build is indexed
3. **Pre-populating OG data** for shareable links so previews work without auth

There is no pagination SEO, no category pages, no blog. Keep it simple.

---

## Dynamic Head Tags from Supabase Data

The event and signup form data fetched via TanStack Query (see the **tanstack-query** skill) is the source of truth for all dynamic meta tags. Wire it up once per public-facing screen.

```tsx
// app/event-detail.tsx — complete Head implementation
import Head from 'expo-router/head'
import { useQuery } from '@tanstack/react-query'
import { getEvent } from '@/services/events'
import { eventImageUrl } from '@/services/event-images'
import { useLocalSearchParams } from 'expo-router'

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id!),
    enabled: !!id,
  })

  const imageUrl = event?.image_path ? eventImageUrl(event.image_path) : null
  const description = event?.description?.slice(0, 155) ?? 'Church event at Edna Baptist Church'

  return (
    <>
      {event && (
        <Head>
          <title>{event.title} | EBC Connect</title>
          <meta name="description" content={description} />
          <meta property="og:title" content={event.title} />
          <meta property="og:description" content={description} />
          <meta property="og:type" content="event" />
          {imageUrl && <meta property="og:image" content={imageUrl} />}
          <meta property="og:url" content={`https://app.ebcconnect.com/event-detail?id=${id}`} />
          <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
        </Head>
      )}
      {/* rest of screen */}
    </>
  )
}
```

Apply the same pattern to `app/signup-form.tsx` and `app/potluck-sheet.tsx`.

---

## Sitemap Generation

Expo's web build does not auto-generate a sitemap. For EBC Connect, a sitemap is only useful if public events/forms should be indexed. Generate it as a build-time script using the Supabase client:

```ts
// scripts/generate-sitemap.ts — run as part of CI/CD before web deploy
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)

async function generateSitemap() {
  const { data: events } = await supabase
    .from('events')
    .select('id, updated_at')
    .eq('is_public', true)

  const urls = [
    `<url><loc>https://app.ebcconnect.com/</loc></url>`,
    ...(events ?? []).map(e =>
      `<url><loc>https://app.ebcconnect.com/event-detail?id=${e.id}</loc><lastmod>${e.updated_at}</lastmod></url>`
    ),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  // Write to web static output directory
  require('fs').writeFileSync('web-build/sitemap.xml', xml)
}

generateSitemap()
```

See the **supabase** skill for client initialization patterns.

---

## Deep Link Sharing with Preview Data

When a member shares an event link (`/event-detail?id=...`), the OG tags must resolve without auth. The current auth guard in `app/index.tsx` intercepts all navigation. The programmatic fix:

```tsx
// app/event-detail.tsx — render meta tags immediately from URL params
// even before session loads, for crawlers and link previews

export default function EventDetailScreen() {
  const { id, title: urlTitle, desc: urlDesc } = useLocalSearchParams<{
    id: string
    title?: string  // optional pre-filled from share link
    desc?: string
  }>()

  // Render Head immediately using URL params as fallback
  // Full data loads asynchronously after
  return (
    <>
      <Head>
        <title>{urlTitle ?? 'Event'} | EBC Connect</title>
        <meta name="description" content={urlDesc ?? 'Church event at Edna Baptist Church'} />
      </Head>
      {/* auth-dependent content renders after */}
    </>
  )
}
```

This lets WhatsApp/iMessage crawlers grab meta tags without waiting for Supabase auth.

---

## WARNING: Don't Over-Engineer for a Private App

**The Problem:**

Building a full sitemap pipeline, dynamic SSR, or pre-rendering for a mostly auth-gated app wastes engineering effort with near-zero SEO return.

**Why This Breaks:**
1. Crawlers see the login redirect for 95% of routes — sitemap entries become 302s
2. Public events are a small, low-frequency corpus — not worth complex infrastructure
3. Server-side rendering would require ejecting from Expo's managed workflow

**The Fix:**

Limit programmatic work to:
- `<Head>` tags on the 3 public-facing screens (event-detail, signup-form, potluck-sheet)
- `app.json` web description
- A simple build-time sitemap script (optional, only if public events are desired in index)

Everything else is ASO territory (App Store, Play Store) — not web crawl territory.
