# Content Reference — Structured Data Copy

## Contents
- What Google Displays from Schema Fields
- Event Content Requirements
- Organization Content Requirements
- Field-Level Guidance
- Common Content Mistakes

## What Google Displays from Schema Fields

Google renders rich result cards from specific schema fields. Writing good content for these fields directly affects click-through rate in search results.

**Event rich card shows:**
- `name` → headline (bold, ~60 chars max displayed)
- `startDate` → date/time line
- `location.name` → venue line
- `description` → snippet below date (first ~100 chars)
- `image` → thumbnail (if provided)

**Organization knowledge panel shows:**
- `name` + `alternateName`
- `description` (first 160 chars)
- `url`

## Event Content Requirements

Google requires these fields for Event rich results to appear:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Use the event title verbatim from Supabase |
| `startDate` | Yes | ISO 8601 — Supabase `timestamptz` is already valid |
| `endDate` | Recommended | Include for better display |
| `location` | Recommended | Even "Edna Baptist Church" beats omitting |
| `description` | Recommended | First sentence is most important |
| `organizer` | Recommended | Always include; boosts trust signals |
| `image` | Optional | Include if `event.image_path` exists |

For events without explicit locations in Supabase (`event.location === null`), fall back to the church address:

```tsx
location: event.location
  ? { '@type': 'Place', name: event.location }
  : {
      '@type': 'Place',
      name: 'Edna Baptist Church',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Edna',
        addressRegion: 'TX',
        addressCountry: 'US',
      },
    },
```

## Event Image Field

The `event.image_path` field stores a Supabase Storage path. Convert it to a full URL using the existing `eventImageUrl()` helper from `services/event-images.ts`:

```tsx
import { eventImageUrl } from '@/services/event-images';

// In schema builder:
...(event.image_path && {
  image: eventImageUrl(event.image_path),
}),
```

Google requires images to be at least 1200×630px for rich cards. The existing `ImageUploader` component resizes on upload — verify the stored dimensions meet this threshold.

## Organization Content Requirements

The `Church` type (a subtype of `Organization`) is the correct schema type for EBC Connect:

```tsx
const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Church',                  // more specific than Organization
  name: 'Edna Baptist Church',
  alternateName: 'EBC',
  description:
    'Edna Baptist Church is a Baptist congregation in Edna, TX. ' +
    'EBC Connect is our community app for members and visitors.',
  url: 'https://ebcconnect.app',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Edna',
    addressRegion: 'TX',
    addressCountry: 'US',
  },
};
```

Keep `description` under 160 characters. The first sentence will be used in search snippets.

## WARNING: Fabricating Event Details

**The Problem:** Hardcoding event details in schema that differ from what's displayed on screen.

```tsx
// BAD — hardcoded address that may not apply to all events
location: { '@type': 'Place', name: '123 Church St, Edna TX' },
```

**Why This Breaks:**
1. Google cross-checks schema against visible page content — mismatches trigger manual penalties
2. Events at offsite locations (community hall, parks) will have wrong data
3. Users clicking rich results with wrong location information abandon

**The Fix:** Only put in schema what you'd display on screen. Use nullable spreads for optional fields. The church address fallback above is acceptable because it's the default venue for most events.

## MobileApplication Schema

Add this to `app/_layout.tsx` alongside the org schema for App Store discovery:

```tsx
const APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'EBC Connect',
  description: 'Community app for Edna Baptist Church — events, prayer, announcements, and more.',
  operatingSystem: 'iOS, Android',
  applicationCategory: 'LifestyleApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};
```

See the **clarifying-market-fit** skill for positioning language guidance on the description field.
