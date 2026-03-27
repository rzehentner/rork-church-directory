# Node.js Types Reference

## Contents
- TypeScript Strict Configuration
- Environment Variable Types
- Supabase Response Typing
- Type Guards
- Service Function Signatures
- Derived Role Types from Context
- WARNING: Using `any` for Supabase Responses
- WARNING: Missing Null Checks on Optional Data

---

## TypeScript Strict Configuration

TypeScript 5.x in strict mode, extending Expo's base config. See the **typescript** skill
for comprehensive type patterns.

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

Strict mode enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`,
`strictPropertyInitialization`, and all other strict flags. Every variable must have
a known, non-`any` type.

---

## Environment Variable Types

Expo public env vars are `string | undefined` at the TypeScript level. Metro bakes them
into the bundle at build time — they are NOT dynamic at runtime.

```typescript
// lib/supabase.ts — Non-null assertion after runtime guard
const url  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Fail fast at module load time, not buried in a component
if (!url || !key) {
  throw new Error('Supabase env vars missing. Copy .env.example to .env');
}
```

Expo auto-generates `expo-env.d.ts` to add type declarations for `EXPO_PUBLIC_*` vars.
Do not hand-edit this file — it is regenerated on `expo start`.

---

## Supabase Response Typing

Supabase queries return `{ data: T | null, error: PostgrestError | null }`. Types for
table queries are inferred from the auto-generated `types/supabase.ts`. Cast explicitly
only for database views where the inferred type doesn't match the actual shape.

```typescript
// services/prayer.ts — Explicit cast for view-based query
export async function listPrayers(status: PrayerStatus = 'open') {
  const { data, error } = await supabase
    .from('prayer_requests_with_counts')
    .select('*')
    .eq('status', status);
  if (error) throw error;
  return (data ?? []) as PrayerRequest[];
}
```

For table queries with joins, Supabase infers nested types automatically:

```typescript
// services/events.ts — Supabase infers joined types from select string
const { data, error } = await supabase
  .from('event_attendees')
  .select('person_id, status, responded_at, persons!inner (first_name, last_name, email)')
  .eq('event_id', eventId);
// typeof data[number].persons → { first_name: string; last_name: string; email: string | null }
```

See the **supabase** skill for query patterns and the `types/supabase.ts` generated file.

---

## Type Guards

The project uses a UUID type guard as the standard validation boundary for all IDs
passed to service functions. Type guards narrow `unknown` to a specific type at runtime.

```typescript
// utils/validation.ts — UUID regex type guard
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    value !== 'null' &&
    value !== 'undefined' &&
    UUID_REGEX.test(value)
  );
}
```

Usage — every service function that accepts an ID parameter calls this first:

```typescript
// services/events.ts — Guard at function entry point
export async function scheduleReminder(eventId: string, minutesBefore = 60) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');
  const { data, error } = await supabase.rpc('schedule_event_reminder', {
    p_event_id: eventId,
    p_minutes_before: minutesBefore,
  });
  if (error) throw error;
  return data;
}
```

---

## Service Function Signatures

Services use inline object types for multi-field inputs. Return types are inferred or
explicitly cast. Never use `any` as a return type.

```typescript
// services/prayer.ts — Typed input, inferred return
export async function createPrayer(input: {
  subject: string;
  details?: string | null;
  for_person_id?: string | null;
  is_anonymous?: boolean;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert([{
      subject: input.subject,
      details: input.details ?? null,
      for_person_id: input.for_person_id ?? null,
      is_anonymous: !!input.is_anonymous,
      created_by: user.id,
    }])
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
```

---

## Derived Role Types from Context

Role checks are centralized in `hooks/me-context.tsx`. Screens and components consume
derived booleans — never compute roles in component code.

```typescript
// hooks/me-context.tsx — Derived role booleans from profile
const isAdmin    = profile?.role === 'admin';
const isMember   = profile?.role === 'member' || isAdmin;
const isPending  = profile?.role === 'pending';
const isVisitor  = profile?.role === 'visitor';
```

Usage in screens:

```typescript
// app/(tabs)/admin.tsx — Consume role from context
const { isAdmin } = useMe();
if (!isAdmin) return <Redirect href="/(tabs)/dashboard" />;
```

See the **supabase** skill for the `user_role` enum definition.

---

## WARNING: Using `any` for Supabase Responses

**The Problem:**

```typescript
// BAD — Casting joined result to any
const person = item.persons as any;
return { first_name: person?.first_name ?? '' };
```

**Why This Breaks:**
1. **No autocomplete** — IDE cannot suggest valid field names, typos are invisible
2. **Silent schema breakage** — renaming a DB column causes a runtime crash, not a compile error
3. **Type propagation loss** — `any` spreads upstream; every consumer loses safety

**The Fix:**

Define an explicit interface for complex joined query results:

```typescript
// GOOD — Named interface for query result shape
interface EventAttendeeRow {
  person_id: string;
  status: string;
  responded_at: string;
  persons: {
    first_name: string;
    last_name: string;
    email: string | null;
  };
}

const person = (item as EventAttendeeRow).persons;
return { first_name: person.first_name };
```

**When You Might Be Tempted:** When Supabase view types don't exactly match your select
string. Define a local interface rather than reaching for `any`.

---

## WARNING: Missing Null Checks on Optional Data

**The Problem:**

```typescript
// BAD — Assumes list always has items
const events = await listUpcomingEvents();
const firstEvent = events[0];
console.log(firstEvent.title); // TypeError if events is []
```

**Why This Breaks:**
1. **Runtime TypeError** — accessing a property on `undefined` throws immediately
2. **White screen crash** — unhandled exception unmounts the entire screen
3. **Silent propagation** — `null` spreads through props into child components

**The Fix:**

```typescript
// GOOD — Guard before indexing
const events = await listUpcomingEvents();
if (events.length === 0) return;
const firstEvent = events[0];

// Or use optional chaining in JSX
<Text>{event?.title ?? 'Untitled Event'}</Text>
```

Project convention: service functions return `data ?? []` for lists and `data ?? null`
for single-row queries. Honor this at every callsite — never assume the list is non-empty.
