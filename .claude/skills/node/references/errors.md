# Node.js Errors Reference

## Contents
- Error Handling by Layer
- Service Layer: Throw on Failure
- Context Layer: Try-Catch with Fallback
- Screen Layer: User-Facing Alerts
- Supabase Error Destructuring
- Fallback Queries for Resilience
- WARNING: Silent Error Swallowing
- WARNING: Throwing Inside Contexts
- WARNING: Missing UUID Validation

---

## Error Handling by Layer

The project enforces a strict three-layer error strategy. Each layer has exactly one job:

| Layer | Files | Strategy | Never Do |
|-------|-------|----------|----------|
| Services | `services/`, `lib/` | Throw on failure | Swallow or log |
| Contexts | `hooks/` | Catch, log, fallback to null/`[]` | Throw or rethrow |
| Screens | `app/` | Catch, show `Alert.alert` or modal | Silently ignore |

This separation means service functions stay simple and testable, contexts stay stable
(never crash the provider tree), and users always see a clear error message.

---

## Service Layer: Throw on Failure

Services validate inputs, execute queries, and throw immediately on any failure. They
never display errors or fall back — that is the caller's responsibility.

```typescript
// services/events.ts — Validate → query → throw
export async function setEventTags(eventId: string, tagIds: string[]) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');

  const { data: current, error: fetchError } = await supabase
    .from('event_audience_tags')
    .select('tag_id')
    .eq('event_id', eventId);
  if (fetchError) throw fetchError;

  const existing = new Set((current ?? []).map(r => r.tag_id));
  const desired  = new Set(tagIds);
  const toAdd    = [...desired].filter(x => !existing.has(x));
  const toRemove = [...existing].filter(x => !desired.has(x));

  if (toRemove.length) {
    const { error } = await supabase
      .from('event_audience_tags')
      .delete()
      .eq('event_id', eventId)
      .in('tag_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await supabase
      .from('event_audience_tags')
      .insert(toAdd.map(tag_id => ({ event_id: eventId, tag_id })));
    if (error) throw error;
  }
}
```

---

## Context Layer: Try-Catch with Fallback

Contexts wrap every async operation in `try/catch`. On failure they log with
`console.error` and reset state to a safe default. They NEVER throw.

```typescript
// hooks/user-context.tsx — Canonical context error handling
const fetchUserData = async () => {
  if (!user) {
    setProfile(null);
    setPerson(null);
    setFamily(null);
    setFamilyMembers([]);
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  try {
    const [profileRes, personRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('persons').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    setProfile(profileRes.data);
    setPerson(personRes.data);
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    // State remains at previous value — context stays usable
  } finally {
    setIsLoading(false);
  }
};
```

---

## Screen Layer: User-Facing Alerts

Screens catch errors from service calls and show a platform-appropriate message. Use
`Alert.alert` on native, a modal or toast on web.

```typescript
// app/create-event.tsx — Screen-level error handling pattern
const handleSubmit = async () => {
  try {
    setIsSubmitting(true);
    await createEvent(formData);
    router.back();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong';
    if (Platform.OS === 'web') {
      showToast(message); // use the toast context
    } else {
      Alert.alert('Error', message);
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Supabase Error Destructuring

Supabase NEVER throws. It always returns `{ data, error }`. Always destructure and
check `error` before using `data` — in that order.

```typescript
// GOOD — Immediate error check after every query
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('id', eventId)
  .single();
if (error) throw error;
// data is now guaranteed non-null
```

```typescript
// BAD — Skipping the error check
const { data } = await supabase.from('events').select('*');
return data; // Could be null if the query failed
```

See the **supabase** skill for Supabase-specific error codes and RPC error handling.

---

## Fallback Queries for Resilience

When a database view might be unavailable (schema drift, permission issues, migrations
in flight), use a try/fallback pattern to the base table.

```typescript
// services/events.ts — Try view, fall back to base table with join
export async function getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');

  // Prefer the view (faster, server-side join)
  try {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select('person_id, first_name, last_name, email, status, responded_at')
      .eq('event_id', eventId);
    if (!error && data) return data as EventRSVP[];
  } catch { /* fall through */ }

  // Base table fallback
  const { data, error } = await supabase
    .from('event_attendees')
    .select('person_id, status, responded_at, persons!inner (first_name, last_name, email)')
    .eq('event_id', eventId);
  if (error) return [];

  return (data ?? []).map(item => {
    const p = item.persons as { first_name: string; last_name: string; email: string | null };
    return {
      person_id: item.person_id,
      status: item.status,
      responded_at: item.responded_at,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
    };
  });
}
```

---

## WARNING: Silent Error Swallowing

**The Problem:**

```typescript
// BAD — Empty catch hides all failures
try {
  await createEvent(formData);
} catch {}
```

**Why This Breaks:**
1. **Invisible data loss** — user fills a form, submits, the event silently doesn't save
2. **No debugging trail** — no log, no alert, no way to reproduce in dev or production
3. **False success state** — the UI may navigate away as if the operation succeeded

**The Fix:**

```typescript
// GOOD — Log at minimum; show alert for user-initiated actions
try {
  await createEvent(formData);
} catch (error) {
  console.error('Failed to create event:', error);
  Alert.alert('Error', 'Could not save event. Please try again.');
}
```

**The One Acceptable Empty Catch:** Non-critical background operations where failure
is expected and harmless — like suppressing splash screen errors on web.

```typescript
// ACCEPTABLE — Non-critical; failure is expected on some platforms
SplashScreen.preventAutoHideAsync().catch(() => {});
```

---

## WARNING: Throwing Inside Contexts

**The Problem:**

```typescript
// BAD — Throwing inside a context async callback
export const [DataProvider, useData] = createContextHook(() => {
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('items').select('*');
      if (error) throw error; // UNHANDLED — async throw in useEffect
      setItems(data);
    };
    load();
  }, []);
});
```

**Why This Breaks:**
1. **Unhandled rejection** — async throws inside `useEffect` callbacks are not caught by React's error boundaries
2. **Provider tree crash** — the entire app white-screens; all child components unmount
3. **No user recovery** — the user must force-quit and relaunch

**The Fix:**

```typescript
// GOOD — Catch inside context, log, set safe fallback state
export const [DataProvider, useData] = createContextHook(() => {
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.from('items').select('*');
        if (error) {
          console.error('Failed to load items:', error);
          return;
        }
        setItems(data ?? []);
      } catch (error) {
        console.error('Unexpected error in DataProvider:', error);
      }
    };
    load();
  }, []);
});
```

---

## WARNING: Missing UUID Validation

**The Problem:**

```typescript
// BAD — No validation; Postgres receives garbage
export async function deleteEvent(eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId); // eventId could be 'undefined', '', or a route param string
  if (error) throw error;
}
```

**Why This Breaks:**
1. **Postgres 400 error** — `invalid input syntax for type uuid` for malformed values
2. **Dangerous wildcard** — an empty string in `.eq('id', '')` may match unexpected rows depending on the DB driver
3. **Silent route leakage** — Expo Router passes route params as strings; `params.id` might be `'undefined'` (the string)

**The Fix:**

```typescript
// GOOD — Validate at the service boundary before any DB operation
import { isValidUUID } from '@/utils/validation';

export async function deleteEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}
```

**Rule:** Every service function that accepts an ID parameter MUST call `isValidUUID()`
as its first statement. See the **zod** skill for schema-level validation at form
boundaries.
