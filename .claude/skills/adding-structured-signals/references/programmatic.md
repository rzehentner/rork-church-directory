# Programmatic Reference — Dynamic Schema Generation

## Contents
- Schema Builder Pattern
- Integrating with TanStack Query
- Handling Loading States
- Type-Safe Schema Builders
- Anti-Patterns

## Schema Builder Pattern

Extract schema construction into a pure function. Keep it out of the component body for testability and reuse across screens:

```ts
// utils/schema.ts — new file
import type { Tables } from '@/types/supabase';

type EventRow = Tables<'events'>;

export function buildEventSchema(event: {
  title: string;
  start_at: string;
  end_at: string;
  description: string | null;
  location: string | null;
  image_path: string | null;
}) {
  return {
    '@context': 'https://schema.org' as const,
    '@type': 'Event' as const,
    name: event.title,
    startDate: event.start_at,
    endDate: event.end_at,
    ...(event.description && { description: event.description }),
    ...(event.location
      ? { location: { '@type': 'Place' as const, name: event.location } }
      : {
          location: {
            '@type': 'Place' as const,
            name: 'Edna Baptist Church',
          },
        }),
    organizer: {
      '@type': 'Organization' as const,
      name: 'Edna Baptist Church',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };
}
```

## Integrating with TanStack Query

`app/event-detail.tsx` uses `useQuery` (via `@tanstack/react-query`) to load event data. See the **tanstack-query** skill for query patterns. Schema should only render after data resolves:

```tsx
// app/event-detail.tsx
import { useQuery } from '@tanstack/react-query';
import { getEvent } from '@/services/events';
import { buildEventSchema } from '@/utils/schema';
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { useMemo } from 'react';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
    enabled: !!id,
  });

  const schema = useMemo(
    () => (event ? buildEventSchema(event) : null),
    [event]
  );

  return (
    <>
      {Platform.OS === 'web' && schema && (
        <Head>
          <script type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        </Head>
      )}
      {isLoading ? <LoadingSkeleton /> : <EventContent event={event} />}
    </>
  );
}
```

## Handling Loading States

NEVER render a partial schema while data is loading. An incomplete Event schema (missing `startDate`) will fail Google's Rich Results Test.

```tsx
// GOOD — null check prevents partial schema
const schema = useMemo(
  () => (event && !isLoading ? buildEventSchema(event) : null),
  [event, isLoading]
);

// NEVER — partial schema emitted during loading
const schema = useMemo(() => ({
  '@type': 'Event',
  name: event?.title ?? 'Loading...',  // BAD — "Loading..." appears in rich results
}), [event]);
```

## Generating Schema for Multiple Events

The `app/(tabs)/events.tsx` screen lists multiple events. Use `ItemList` schema to signal the list structure to Google:

```tsx
// For the events list screen — web surface
const eventsListSchema = useMemo(() => {
  if (!events?.length || Platform.OS !== 'web') return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: buildEventSchema(event),
    })),
  };
}, [events]);
```

## WARNING: Schema Generation in useEffect

**The Problem:**

```tsx
// BAD — schema in useEffect causes hydration mismatch
const [schema, setSchema] = useState(null);
useEffect(() => {
  if (event) setSchema(buildEventSchema(event));
}, [event]);
```

**Why This Breaks:**
1. On web, the Head renders after the first paint — Google's crawler may see an empty head on first load
2. `useState` + `useEffect` adds an unnecessary render cycle
3. `useMemo` is the correct tool: schema is derived state, not async side-effect state

**The Fix:** Use `useMemo` with a null check on the data dependency.

## Validating Generated Schema

After implementation, iterate until validation passes:

1. Run `npx expo start --web`
2. Navigate to the event detail page in browser
3. Right-click → View Page Source → Ctrl+F `application/ld+json`
4. Copy the JSON-LD and paste into Google's Rich Results Test
5. If test fails, fix the reported field and repeat step 4

See the **supabase** skill for the `getEvent()` function signature and return type details used in schema builders.
