# On-Page Reference — Structured Data Placement

## Contents
- Which Screens Need Structured Data
- Event Detail Screen
- Signup Form Screen
- Dashboard / Home
- Global Organization Schema
- Anti-Patterns

## Which Screens Need Structured Data

Priority order for EBC Connect:

| Screen | File | Schema Type | Rich Result |
|--------|------|-------------|-------------|
| Event detail | `app/event-detail.tsx` | `Event` | Event card in Google |
| Signup form | `app/signup-form.tsx` | `Event` + `EventReservation` | Registration card |
| Dashboard | `app/(tabs)/dashboard.tsx` | `Organization` | Knowledge panel |
| App root | `app/_layout.tsx` | `MobileApplication` | App listing |
| Announcements | `app/(tabs)/announcements.tsx` | `Announcement` | May appear in news |

The `event-detail.tsx` screen is the highest-value target: it has a unique URL per event (`/event-detail?id=<uuid>`), loads full event data from Supabase via `getEvent()`, and surfaces real dates, locations, and descriptions.

## Event Detail Screen

The `EventDetail` type (defined at `app/event-detail.tsx:42`) has all required fields:

```tsx
// app/event-detail.tsx — add after event state is populated
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { useMemo } from 'react';

// Inside EventDetailScreen, after useState for event:
const eventSchema = useMemo(() => {
  if (!event || Platform.OS !== 'web') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.start_at,        // ISO 8601 — already from Supabase timestamptz
    endDate: event.end_at,
    ...(event.description && { description: event.description }),
    ...(event.location && {
      location: {
        '@type': 'Place',
        name: event.location,
      },
    }),
    organizer: {
      '@type': 'Organization',
      name: 'Edna Baptist Church',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };
}, [event]);

// In JSX, wrap the return:
return (
  <>
    {eventSchema && (
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(eventSchema)}
        </script>
      </Head>
    )}
    {/* existing ScrollView */}
  </>
);
```

## Signup Form Screen

`app/signup-form.tsx` handles event registrations. Adding `EventReservation` schema signals to Google that this page accepts registrations:

```tsx
// app/signup-form.tsx — add alongside existing useQuery calls
import Head from 'expo-router/head';

// After resolvedFormIdQuery and event data load:
const registrationSchema = useMemo(() => {
  if (!signupForm || Platform.OS !== 'web') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: signupForm.title,
    ...(signupForm.description && { description: signupForm.description }),
    organizer: {
      '@type': 'Organization',
      name: 'Edna Baptist Church',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: typeof window !== 'undefined' ? window.location.href : '',
    },
  };
}, [signupForm]);
```

## Dashboard / Home

The dashboard (`app/(tabs)/dashboard.tsx`) is the authenticated home screen — not publicly crawlable. Skip structured data here. Google cannot index authenticated content behind a login wall.

## Global Organization Schema

Inject once at `app/_layout.tsx` inside `RootLayoutNav` before the Stack:

```tsx
// app/_layout.tsx — inside RootLayoutNav()
import Head from 'expo-router/head';
import { Platform } from 'react-native';

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Church',
  name: 'Edna Baptist Church',
  alternateName: 'EBC',
  url: 'https://ebcconnect.app',
  description: 'Community app for Edna Baptist Church members and visitors.',
};

function RootLayoutNav() {
  return (
    <>
      {Platform.OS === 'web' && (
        <Head>
          <script type="application/ld+json">
            {JSON.stringify(ORG_SCHEMA)}
          </script>
        </Head>
      )}
      <Stack screenOptions={{ headerBackTitle: 'Back' }} initialRouteName="index">
        {/* existing screens */}
      </Stack>
    </>
  );
}
```

## WARNING: Schema on Authenticated-Only Screens

**The Problem:** Adding Event schema to screens behind login (dashboard, prayers, family) wastes effort — Google's crawler cannot access them.

**Why This Breaks:**
1. Googlebot follows the auth redirect to `/(auth)/login` instead of the content screen
2. Schema injected on login-required screens is never seen by crawlers
3. You get zero rich result benefit while adding maintenance burden

**The Fix:** Only add structured data to screens accessible without authentication:
- `event-detail` (check `event.is_public`)
- `signup-form` (public registration pages)
- `app/_layout.tsx` (global org schema)

See the **inspecting-search-coverage** skill for a full audit of which screens are publicly accessible.
