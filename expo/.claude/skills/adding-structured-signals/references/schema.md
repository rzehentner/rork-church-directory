# Schema Reference — Schema.org Types for EBC Connect

## Contents
- Schema Types by Screen
- Event Schema (Full)
- Church / Organization Schema (Full)
- MobileApplication Schema
- BreadcrumbList Schema
- Field Validation Rules

## Schema Types by Screen

| Screen | Primary Type | Secondary Type | Priority |
|--------|-------------|----------------|----------|
| `app/event-detail.tsx` | `Event` | `BreadcrumbList` | High |
| `app/signup-form.tsx` | `Event` | `Offer` | High |
| `app/_layout.tsx` | `Church` | `MobileApplication` | High |
| `app/(tabs)/events.tsx` | `ItemList` | — | Medium |
| `app/+not-found.tsx` | — | — | Skip |

## Event Schema (Full)

All fields EBC Connect can populate from the `EventDetail` type:

```ts
// utils/schema.ts
export function buildEventSchema(event: {
  title: string;
  description: string | null;
  start_at: string;            // Supabase timestamptz → already ISO 8601
  end_at: string;
  is_all_day: boolean;
  location: string | null;
  image_path: string | null;
  is_public: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',

    // Required
    name: event.title,
    startDate: event.is_all_day
      ? event.start_at.split('T')[0]   // YYYY-MM-DD for all-day events
      : event.start_at,
    endDate: event.is_all_day
      ? event.end_at.split('T')[0]
      : event.end_at,

    // Recommended
    ...(event.description && { description: event.description }),
    ...(event.location
      ? { location: { '@type': 'Place', name: event.location } }
      : { location: { '@type': 'Place', name: 'Edna Baptist Church' } }
    ),
    organizer: {
      '@type': 'Organization',
      name: 'Edna Baptist Church',
      url: 'https://ebcconnect.app',
    },

    // Status fields — always set these for Google compliance
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };
}
```

**Why `is_all_day` matters:** Google rejects ISO 8601 datetime strings (`2026-03-15T00:00:00`) for all-day events — use date-only strings (`2026-03-15`). The `event.is_all_day` field in Supabase maps directly to this distinction.

## Church / Organization Schema (Full)

```ts
// utils/schema.ts
export const CHURCH_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Church',
  name: 'Edna Baptist Church',
  alternateName: 'EBC',
  description:
    'Baptist congregation in Edna, TX. EBC Connect is our community app for events, prayer, and connection.',
  url: 'https://ebcconnect.app',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Edna',
    addressRegion: 'TX',
    addressCountry: 'US',
  },
  // Add when known:
  // telephone: '+1-...',
  // geo: { '@type': 'GeoCoordinates', latitude: ..., longitude: ... },
  // openingHours: 'Su 09:00-12:00',
} as const;
```

## MobileApplication Schema

```ts
// utils/schema.ts
export const APP_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'EBC Connect',
  description:
    'Community app for Edna Baptist Church — events, prayer requests, announcements, and family directory.',
  operatingSystem: 'iOS, Android',
  applicationCategory: 'LifestyleApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  // Add App Store / Play Store URLs when available:
  // installUrl: 'https://apps.apple.com/...',
  // downloadUrl: 'https://play.google.com/...',
} as const;
```

## BreadcrumbList Schema

Add to `event-detail.tsx` alongside the Event schema for richer SERP display:

```ts
export function buildEventBreadcrumb(eventTitle: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Events',
        item: 'https://ebcconnect.app/events',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: eventTitle,
      },
    ],
  };
}
```

## Field Validation Rules

Google's Rich Results Test enforces these rules — violations suppress rich cards:

| Rule | Detail |
|------|--------|
| `startDate` format | ISO 8601: `2026-03-15` or `2026-03-15T10:00:00-06:00` |
| No `null` values | Omit fields rather than passing `null` |
| `name` required | Every Event must have a name |
| `eventStatus` required | Include for all events |
| Image dimensions | Min 1200×630px for Event image thumbnails |
| No future-omission | `endDate` strongly recommended; omitting degrades display |

Use `date-fns` (already in project dependencies) for date manipulation if the `start_at` field needs reformatting before schema inclusion. See the **date-fns** skill for formatting patterns.
