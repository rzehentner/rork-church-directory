# Data Fetching Reference

## Contents
- Architecture Overview
- Service Layer Pattern
- Supabase Query Patterns
- React Query for Server State
- WARNING: useEffect for Data Fetching
- WARNING: Partial React Query Adoption
- Optimistic Updates
- Error Handling Chain

---

## Architecture Overview

```
Screen
  → Service function (services/*.ts or lib/*.ts)
    → Supabase client (lib/supabase.ts)
      → DB view (events_for_me) or base table
```

Two patterns coexist — React Query is the target:

| Pattern | Used In | Status |
|---------|---------|--------|
| `useQuery` / `useMutation` | `church-settings-context`, `notification-context` | Preferred |
| Manual `useState` + `useEffect` | Most screens (`events.tsx`, `prayers.tsx`, etc.) | Legacy — migrate |

See the **tanstack-query** skill for full React Query API. See the **supabase** skill for query builder details.

---

## Service Layer Pattern

All data access goes through typed functions in `services/`. Services throw on error; screens catch.

```typescript
// services/events.ts
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/utils/validation';

export async function getEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');

  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Event not found');
  return data;
}
```

**Rules:**
- Named async exports only — no class wrappers
- Validate all UUIDs with `isValidUUID()` before any query
- Check `error` and throw immediately — never continue on error
- Use `.maybeSingle()` when absence is valid; `.single()` when it must exist
- Return `data ?? []` for list queries to avoid null

---

## Supabase Query Patterns

**Filtered list from a view:**

```typescript
const { data, error } = await supabase
  .from('events_for_me')
  .select('*')
  .gte('end_at', new Date().toISOString())
  .order('start_at', { ascending: true })
  .limit(50);
```

**View-to-table fallback** for permission edge cases:

```typescript
export async function getEvent(eventId: string) {
  const { data, error } = await supabase
    .from('events_for_me').select('*').eq('id', eventId).maybeSingle();
  if (error) throw error;
  if (data) return data;

  // Fallback when view returns nothing (permissions edge case)
  const { data: fallback, error: fbError } = await supabase
    .from('events').select('*').eq('id', eventId).maybeSingle();
  if (fbError) throw fbError;
  if (!fallback) throw new Error('Event not found');
  return { ...fallback, my_rsvp: null };
}
```

**RPC for complex mutations:**

```typescript
const { data, error } = await supabase.rpc('rsvp_event', {
  p_event_id: eventId,
  p_status: status,
});
if (error) throw error;
```

**Bulk diff operations** (add/remove tags):

```typescript
export async function setEventTags(eventId: string, tagIds: string[]) {
  const { data: curr } = await supabase
    .from('event_audience_tags').select('tag_id').eq('event_id', eventId);

  const have = new Set((curr ?? []).map(r => r.tag_id));
  const want = new Set(tagIds);
  const toAdd = [...want].filter(x => !have.has(x));
  const toDel = [...have].filter(x => !want.has(x));

  if (toDel.length) {
    await supabase.from('event_audience_tags')
      .delete().eq('event_id', eventId).in('tag_id', toDel);
  }
  if (toAdd.length) {
    await supabase.from('event_audience_tags')
      .insert(toAdd.map(tagId => ({ event_id: eventId, tag_id: tagId })));
  }
}
```

---

## React Query for Server State

Used in `church-settings-context.tsx` and `notification-context.tsx`:

```typescript
// Read with caching
const settingsQuery = useQuery({
  queryKey: ['church-settings'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('church_settings').select('*').limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 5 * 60 * 1000, // 5-minute cache
});

// Write with cache invalidation
const saveMutation = useMutation({
  mutationFn: async (newSettings: ChurchSettings) => {
    const { data, error } = await supabase
      .from('church_settings').update(mapSettingsToDb(newSettings))
      .eq('id', settingsId).select().single();
    if (error) throw error;
    return data;
  },
  onSuccess: (data) => {
    queryClient.setQueryData(['church-settings'], data); // sync update, no refetch needed
  },
});
```

---

## WARNING: useEffect for Data Fetching

**The Problem:**

```typescript
// ANTI-PATTERN — used in events.tsx, prayers.tsx, and others
const [events, setEvents] = useState<Event[]>([]);
const [isLoading, setIsLoading] = useState(true);

const loadEvents = useCallback(async () => {
  setIsLoading(true);
  try {
    setEvents(await listEvents());
  } catch (err) {
    setError('Failed to load');
  } finally {
    setIsLoading(false);
  }
}, []);

useEffect(() => { loadEvents(); }, [loadEvents]);
```

**Why This Breaks:**
1. **No caching** — every mount triggers a fresh network request; navigating back re-fetches.
2. **Race conditions** — fast navigation can cause a slow response to overwrite newer data.
3. **No deduplication** — two components fetching the same data make two identical requests.
4. **Manual boilerplate** — loading + error state is hand-rolled on every screen.
5. **No background refetch** — data goes stale without manual pull-to-refresh.

**The Fix:**

`@tanstack/react-query` is already installed. Use it:

```typescript
// GOOD — eliminates manual loading/error state
import { useQuery } from '@tanstack/react-query';

const { data: events = [], isLoading, error, refetch } = useQuery({
  queryKey: ['events'],
  queryFn: listEvents,
  staleTime: 2 * 60 * 1000,
});
```

---

## WARNING: Partial React Query Adoption

**Detected:** `@tanstack/react-query` is installed but only used in 2 of ~10 data-fetching contexts. Most screens still use manual `useState` + `useEffect`.

**Impact:** No cross-screen cache sharing, redundant network requests on navigation, loading/error boilerplate duplicated in every screen file.

**Migration path:**
1. Convert screen-level fetches to `useQuery(queryKey, serviceFn)`
2. Convert form submissions to `useMutation(serviceFn, { onSuccess, onError })`
3. Use consistent `queryKey` conventions: `['events']`, `['event', id]`, `['prayers', userId]`
4. Replace manual `setIsLoading` + `setError` state with `isLoading`/`error` from `useQuery`

---

## Optimistic Updates

Pattern used in `events.tsx` for RSVP (manual implementation):

```typescript
const handleRSVP = async (eventId: string, status: RSVP) => {
  // 1. Optimistic update
  setAllEvents(prev => prev.map(e =>
    e.id === eventId ? { ...e, my_rsvp: status } : e
  ));
  try {
    await rsvpEvent(eventId, status); // 2. Server call
  } catch {
    // 3. Rollback
    setAllEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, my_rsvp: null } : e
    ));
    showToast('error', 'Failed to update RSVP');
  }
};
```

With React Query, use `onMutate` / `onError` for cache-managed optimistic updates. See the **tanstack-query** skill.

---

## Error Handling Chain

Services throw → screens catch → toast shows human-readable message.

```typescript
// Service — throws raw error
export async function deleteEvent(id: string) {
  if (!isValidUUID(id)) throw new Error('Invalid event ID');
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// Screen — catches and maps to user message
const handleDelete = async () => {
  try {
    await deleteEvent(eventId);
    showToast('success', 'Event deleted');
    router.back();
  } catch (error) {
    console.error('Delete failed:', error);
    showToast('error', 'Failed to delete event');
  }
};
```

NEVER expose raw Supabase error messages to users — they contain schema details.
