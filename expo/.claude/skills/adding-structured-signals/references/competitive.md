# Competitive Reference — Structured Data Strategy

## Contents
- Local Church SEO Context
- What Competing for in Search
- Structured Data Differentiation
- Anti-Patterns in Church Apps
- Checklist

## Local Church SEO Context

EBC Connect competes for search visibility against:
1. Generic church directory sites (ChurchFinder, iFellowship, etc.)
2. The church's own static website (if one exists)
3. Event aggregators (Eventbrite, Facebook Events) for community events

Structured data is one of the few levers available for a web-rendered React Native app because the web surface is a single-page application — it has limited crawlable text content compared to a content-heavy website.

**Realistic expectation:** JSON-LD won't dramatically increase organic traffic to a church app. The primary benefit is **rich result display** for users already searching for "Edna Baptist Church events" or clicking shared links. The secondary benefit is the **Organization knowledge panel**, which appears in branded searches.

## What EBC Connect Can Compete For

| Search Intent | Schema Type | Realistic Outcome |
|---------------|-------------|-------------------|
| "Edna Baptist Church events" | `Event` + `Church` | Rich event cards |
| "EBC Connect app" | `MobileApplication` | App listing card |
| "church events in Edna TX" | `Event` | Low volume, possible rich card |
| Shared event links | `Event` OG + JSON-LD | Rich link preview |

AVOID trying to rank for generic religious queries ("church near me", "Baptist services"). A member app's web surface cannot compete with dedicated websites for those terms.

## Structured Data Differentiation

Most competing church apps (Planning Center, Church Center, Realm) do NOT inject JSON-LD for individual event pages. This is an opportunity. Any publicly accessible event detail page with valid Event schema can appear as a Google Event rich card — a format that stands out visually in SERPs above standard blue links.

The critical requirement: events must be accessible without authentication. Check `event.is_public` before rendering schema or exposing the event detail URL publicly.

```tsx
// app/event-detail.tsx — only expose schema for public events
const schema = useMemo(() => {
  if (!event || !event.is_public || Platform.OS !== 'web') return null;
  return buildEventSchema(event);
}, [event]);
```

## Open Graph + JSON-LD Pairing

JSON-LD improves crawled rich results. Open Graph improves shared link previews (iMessage, Slack, Twitter). These are different signals targeting different surfaces — implement both for maximum coverage.

```tsx
// app/event-detail.tsx — both signals, same screen
{Platform.OS === 'web' && event && (
  <Head>
    {/* Open Graph — for link sharing */}
    <meta property="og:title" content={event.title} />
    <meta property="og:description" content={event.description ?? 'Church event at Edna Baptist Church'} />
    <meta property="og:type" content="website" />

    {/* JSON-LD — for Google rich results */}
    <script type="application/ld+json">
      {JSON.stringify(buildEventSchema(event))}
    </script>
  </Head>
)}
```

See the **inspecting-search-coverage** skill for a full Open Graph audit checklist.

## WARNING: Structured Data Without Indexable Pages

**The Problem:** Adding JSON-LD to a React Native web app where Google can't crawl the content.

**Why This Breaks:**
1. React Native Web renders client-side JavaScript — Googlebot may not execute JS on first pass
2. Dynamic routes (`/event-detail?id=<uuid>`) require Googlebot to discover the URL first
3. Schema on a URL Googlebot has never seen provides zero rich result benefit

**The Fix:**
1. Submit a sitemap with public event URLs to Google Search Console
2. Use canonical links to signal the correct URL for each event
3. Consider server-side rendering (SSR) for `event-detail.tsx` if event discovery is a priority

For a church member app, the pragmatic approach is: implement JSON-LD now, verify it via Rich Results Test, and monitor Google Search Console for impressions over 60-90 days. If event pages are not indexed, the sitemap + crawl request is the next step.

## Implementation Checklist

Copy this checklist and track progress:
- [ ] Add `buildEventSchema()` to `utils/schema.ts`
- [ ] Inject Event JSON-LD in `app/event-detail.tsx` (public events only)
- [ ] Add `CHURCH_SCHEMA` constant to `utils/schema.ts`
- [ ] Inject Church JSON-LD in `app/_layout.tsx`
- [ ] Add `APP_SCHEMA` constant to `utils/schema.ts`
- [ ] Inject MobileApplication JSON-LD in `app/_layout.tsx`
- [ ] Validate each schema type in Google's Rich Results Test
- [ ] Verify JSON-LD appears in View Source for web build
- [ ] Submit public event URLs to Google Search Console
- [ ] Monitor Search Console for rich result impressions after 60 days
