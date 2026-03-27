# Technical Reference — Structured Data

## Contents
- Expo Router Head Component
- Platform Guard Pattern
- Schema Serialization
- Anti-Patterns
- Validation Workflow

## Expo Router Head Component

`expo-router/head` provides a `Head` component that renders into the HTML `<head>` on web and is a no-op on native. Import it directly — no additional package install needed in this project.

```tsx
// app/event-detail.tsx
import Head from 'expo-router/head';
import { Platform } from 'react-native';

export default function EventDetailScreen() {
  // ...data loading...
  return (
    <>
      {Platform.OS === 'web' && event && (
        <Head>
          <script type="application/ld+json">
            {JSON.stringify(buildEventSchema(event))}
          </script>
        </Head>
      )}
      <ScrollView>...</ScrollView>
    </>
  );
}
```

The `Platform.OS === 'web'` guard is belt-and-suspenders: `expo-router/head` already no-ops on native, but explicit guards make intent clear and prevent accidental native rendering regressions.

## Platform Guard Pattern

This project uses `Platform.OS` checks consistently (see `app/_layout.tsx:15`, `app/(tabs)/admin.tsx:505`). Follow the same pattern for structured data:

```tsx
// GOOD — consistent with existing codebase pattern
{Platform.OS === 'web' && schema && (
  <Head>
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  </Head>
)}
```

```tsx
// BAD — Platform.select is more verbose with no benefit here
{Platform.select({
  web: <Head><script type="application/ld+json">{...}</script></Head>,
  default: null,
})}
```

## Schema Serialization

Build schema objects as plain TypeScript objects, then `JSON.stringify` into the script tag. Never build JSON strings manually — string concatenation produces invalid JSON when values contain quotes.

```tsx
// GOOD — object first, serialize once
const schema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: event.title,
};
<script type="application/ld+json">{JSON.stringify(schema)}</script>
```

```tsx
// BAD — manual string building
<script type="application/ld+json">
  {`{"@context":"https://schema.org","name":"${event.title}"}`}
</script>
// Breaks if event.title contains a double-quote
```

## Memoizing Schema Objects

Schema building runs on every render. Use `useMemo` when the schema depends on fetched data:

```tsx
const eventSchema = useMemo(() => {
  if (!event) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.start_at,
    endDate: event.end_at,
    ...(event.description && { description: event.description }),
    ...(event.location && {
      location: { '@type': 'Place', name: event.location },
    }),
    organizer: {
      '@type': 'Organization',
      name: 'Edna Baptist Church',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };
}, [event]);
```

## WARNING: Null Fields in Schema

**The Problem:**

```tsx
// BAD — null values make schema invalid
const schema = {
  '@type': 'Event',
  name: event.title,
  description: event.description,  // null if not set
  location: event.location,        // null if not set
};
```

**Why This Breaks:**
1. Google's Rich Results Test rejects `null` values in required fields
2. `JSON.stringify(null)` produces `"null"` as a string — not omission
3. Schema validators flag unexpected nulls as errors, suppressing rich results

**The Fix:**

```tsx
// GOOD — use spread with short-circuit to omit null fields
const schema = {
  '@type': 'Event',
  name: event.title,
  ...(event.description && { description: event.description }),
  ...(event.location && { location: { '@type': 'Place', name: event.location } }),
};
```

## Validation Workflow

Copy this checklist and track progress:
- [ ] Step 1: Add JSON-LD to target screen with Platform guard
- [ ] Step 2: Run `npx expo start --web` and open screen in browser
- [ ] Step 3: View Page Source — confirm `<script type="application/ld+json">` is present
- [ ] Step 4: Copy JSON-LD and paste into Google's Rich Results Test
- [ ] Step 5: Fix any errors flagged by the validator
- [ ] Step 6: Repeat steps 4-5 until validation passes

```bash
# Start web dev server
npx expo start --web

# Then in browser: right-click → View Page Source
# Look for: <script type="application/ld+json">
```

See the **expo-router** skill for Head component routing context and the **inspecting-search-coverage** skill for full web meta audit checklist.
