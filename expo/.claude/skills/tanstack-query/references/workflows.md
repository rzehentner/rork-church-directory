# React Query Workflows Reference

## Contents
- Adding a New Query
- Adding a New Mutation
- Invalidation Strategy Map
- Pull-to-Refresh Integration
- Dependent Queries (Chaining)
- Realtime + React Query Integration
- Migrating useEffect Fetching to React Query
- Debugging Checklist

## Adding a New Query

Copy this checklist and track progress:
- [ ] Step 1: Create or identify the service function in `services/` or `lib/`
- [ ] Step 2: Choose a query key — check existing keys in `references/patterns.md` first
- [ ] Step 3: Add `useQuery` with `enabled: !!param` if params may be undefined on first render
- [ ] Step 4: Set `staleTime` per the guide below — don't use the default silently
- [ ] Step 5: Destructure `{ data = [], isLoading, error, refetch }` — default lists to `[]`
- [ ] Step 6: Render `<Skeleton />` while `isLoading`
- [ ] Step 7: Render error state with a `refetch()` retry button if `error` is non-null

### staleTime Decision Guide

| Data Type | staleTime | Rationale |
|-----------|-----------|-----------|
| Feeds (prayers, announcements, events) | `30 * 1000` | Users expect fresh data on revisit |
| Reference data (tags, church settings) | `5 * 60 * 1000` | Rarely changes mid-session |
| Edit form pre-fill | `0` | Stale data silently overwrites user edits |
| Polling (notifications) | default + `refetchInterval: 30000` | Continuous background updates |
| Admin data | `30000` | Moderate freshness for management screens |

### Example: New List Query

```typescript
// 1. Service function (services/events.ts)
export async function listUpcomingEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .gte('start_date', new Date().toISOString())
    .order('start_date');
  if (error) throw error;
  return data ?? [];
}

// 2. Screen (app/(tabs)/events.tsx)
import { useQuery } from '@tanstack/react-query';
import { listUpcomingEvents } from '@/services/events';

const { data: events = [], isLoading, error, refetch } = useQuery({
  queryKey: ['upcoming-events'],
  queryFn: listUpcomingEvents,
  staleTime: 30 * 1000,
});
```

## Adding a New Mutation

Copy this checklist and track progress:
- [ ] Step 1: Create or identify the service function for the write operation
- [ ] Step 2: Declare `const queryClient = useQueryClient()` at the top of the component
- [ ] Step 3: Add `useMutation` with `mutationFn` pointing to the service function
- [ ] Step 4: In `onSuccess`: invalidate **all** query keys that display this data
- [ ] Step 5: In `onSuccess`: show success toast and/or `router.back()`
- [ ] Step 6: In `onError`: show `Alert.alert` (native) or `showError` toast (modal screens)
- [ ] Step 7: Wire `mutation.mutate(payload)` to the submit handler
- [ ] Step 8: Disable the submit button with `disabled={mutation.isPending}`

### Example: Create + Invalidate Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { createPrayer } from '@/services/prayer';

const queryClient = useQueryClient();
const router = useRouter();

const createMutation = useMutation({
  mutationFn: createPrayer,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prayers'] });
    router.back();
  },
  onError: (error: Error) => {
    Alert.alert('Error', error.message || 'Failed to create prayer request');
  },
});

// JSX:
<TouchableOpacity
  onPress={() => createMutation.mutate({ subject, details })}
  disabled={createMutation.isPending}
>
  <Text>{createMutation.isPending ? 'Saving...' : 'Save'}</Text>
</TouchableOpacity>
```

## Invalidation Strategy Map

When a mutation modifies an entity, invalidate all keys that show it. Reference this map:

```
Mutation affects "tags"?
├── ['admin-tags']          (admin tag list)
├── ['tags', 'active']      (filtered picker lists)
└── ['tags']                (base key — catches any other variants)

Mutation affects "announcements"?
├── ['announcements-for-me'] (user feed)
└── ['admin-announcements']  (admin list)

Mutation affects "signup forms"?
├── ['signup-form', formId]          (form detail)
├── ['signup-form-fields', formId]   (form fields)
├── ['my-signup-forms']              (user's forms list)
├── ['signup-form-summary']          (summary stats)
└── ['event-signup-form', eventId]   (event-linked form, if applicable)

Mutation affects "person tags"?
├── ['person-with-tags', personId]   (picker state)
└── ['directory']                    (shows tag badges)
```

### Validation Loop

1. Add all `invalidateQueries` calls to `onSuccess`
2. Trigger the mutation in the running app
3. Navigate to every screen that displays the affected data
4. If any screen shows stale data, find its `queryKey` and add invalidation
5. Repeat from step 2 until all views refresh

## Pull-to-Refresh Integration

Wire `refetch` from `useQuery` directly to `RefreshControl`:

```typescript
const { data: prayers = [], isLoading, refetch } = useQuery({
  queryKey: ['prayers', activeTab],
  queryFn: () => listPrayers(activeTab),
  staleTime: 30 * 1000,
});

const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await refetch();
  setRefreshing(false);
}, [refetch]);

// JSX:
<FlatList
  data={prayers}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  }
/>
```

## Dependent Queries (Chaining)

Use `enabled` to chain queries. Steps that share the same resolved value run in parallel.

```typescript
// signup-form.tsx — resolve formId from either route param or event lookup
const resolvedFormIdQuery = useQuery({
  queryKey: ['signup-form-by-event', eventId],
  queryFn: () => getEventSignupForm(eventId!),
  enabled: !!eventId && !formId, // skip if formId already provided
});

const actualFormId = formId || resolvedFormIdQuery.data?.id;

// Steps 2 + 3 run in parallel once actualFormId resolves
const { data: form } = useQuery({
  queryKey: ['signup-form', actualFormId],
  queryFn: () => getSignupForm(actualFormId!),
  enabled: !!actualFormId,
});

const { data: fields } = useQuery({
  queryKey: ['signup-form-fields', actualFormId],
  queryFn: () => getFormFields(actualFormId!),
  enabled: !!actualFormId,
});
```

## Realtime + React Query Integration

Supabase realtime subscriptions call `refetch()` to sync the cache. Subscribe in a `useEffect`, unsubscribe on cleanup.

```typescript
// app/(tabs)/prayers.tsx
const { data: prayers = [], refetch } = useQuery({
  queryKey: ['prayers', activeTab],
  queryFn: () => listPrayers(activeTab),
  staleTime: 30 * 1000,
});

useEffect(() => {
  const ch = supabase
    .channel('prayers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_requests' },
      () => refetch())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_prayed' },
      () => refetch())
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [refetch]);
```

See the **supabase** skill for channel setup patterns.

## Migrating useEffect Fetching to React Query

`auth-context` and `user-context` still use `useEffect`-based fetching. When migrating:

### Before (manual pattern — existing debt)

```typescript
// BAD — still exists in several contexts
const [data, setData] = useState<Item[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function load() {
    setIsLoading(true);
    try { setData(await fetchItems()); }
    catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  }
  load();
}, [userId]);
```

### After (React Query)

```typescript
// GOOD — caching, deduplication, background refetch, no race conditions
const { data = [], isLoading } = useQuery({
  queryKey: ['items', userId],
  queryFn: () => fetchItems(),
  enabled: !!userId,
  staleTime: 30 * 1000,
});
```

Migration checklist:
- [ ] Identify `useEffect + useState` fetch pair
- [ ] Replace with `useQuery` using the same fetch function
- [ ] Delete the manual `isLoading`, `error`, `data` state
- [ ] Replace manual `refetch` with `refetch` from `useQuery`
- [ ] Update all consumers of the old state

## Debugging Checklist

### Stale data after mutation

- [ ] Confirm `onSuccess` is reached (add `console.log`)
- [ ] Check the exact query key matches (`['prayers', 'open']` ≠ `['prayers', 'closed']`)
- [ ] `invalidateQueries({ queryKey: ['prayers'] })` matches ALL keys starting with `'prayers'` — including `['prayers', 'open']`. This is usually correct behavior.
- [ ] Check that the screen consuming stale data is inside `QueryClientProvider`

### Query not firing

- [ ] Is `enabled` evaluating to `false`? Log the value.
- [ ] Does the component render inside `QueryClientProvider`? (Check `app/_layout.tsx` provider order)
- [ ] Does the query key change when filters change? Each unique key is a separate cache entry.

### Infinite refetch loop

- [ ] Is `queryKey` array stable? Inline objects/arrays create a new reference every render.
- [ ] Is `queryFn` stable? Don't create functions inline that close over changing state without including that state in the key.
- [ ] Is `refetchInterval` set accidentally? Check query options.

### WARNING: Missing useQueryClient

```typescript
// BAD - queryClient referenced but never declared
const mutation = useMutation({
  mutationFn: deleteTag,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] }); // ReferenceError
  },
});

// GOOD - declare at top of every component using mutations
const queryClient = useQueryClient();
```
