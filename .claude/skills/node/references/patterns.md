# Node.js Patterns Reference

## Contents
- Async/Await Service Pattern
- Parallel Operations with Promise.all
- Timeout Protection with Promise.race
- Context Initialization with Mounted Flag
- Platform-Aware Async Code
- WARNING: useEffect for Data Fetching
- WARNING: Unguarded Async in useEffect
- WARNING: Sequential Awaits for Independent Queries

---

## Async/Await Service Pattern

Every Supabase service function follows the same shape: validate inputs → query → check
error → return data with nullish coalescing. Services never handle errors — they throw.

```typescript
// services/prayer.ts — Canonical service function
export async function listPrayers(status: PrayerStatus = 'open', limit = 100) {
  const { data, error } = await supabase
    .from('prayer_requests_with_counts')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PrayerRequest[];
}
```

**Conventions enforced across all services:**
- `if (error) throw error` — always immediately after the query
- `data ?? []` for list queries, `data ?? null` for single-row queries
- Validate UUID params with `isValidUUID()` before touching the database
- Named exports only — no default exports from service files

---

## Parallel Operations with Promise.all

Use `Promise.all` when fetching multiple independent resources. This is the established
pattern in the context layer wherever two or more queries have no data dependency.

```typescript
// hooks/user-context.tsx — Profile and person fetched in parallel
const [profileResponse, personResponse] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', user.id).single(),
  supabase.from('persons').select('*').eq('user_id', user.id).maybeSingle(),
]);
setProfile(profileResponse.data);
setPerson(personResponse.data);
```

**When to parallelize:** Two or more Supabase queries where query B does not need
query A's result to run. If B needs A's data (e.g., a family ID from the profile), keep
them sequential.

---

## Timeout Protection with Promise.race

Use `Promise.race` for operations that might hang indefinitely — push token registration,
biometric prompts, or any network call without a built-in timeout.

```typescript
// lib/notifications.ts — Timeout wrapper for push token fetch
const tokenResult = await Promise.race([
  Notifications.getExpoPushTokenAsync({ projectId }),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Push token fetch timed out after 10s')), 10_000)
  ),
]);
```

---

## Context Initialization with Mounted Flag

The `mounted` flag prevents `setState` on unmounted components during async
initialization. This pattern is correct for one-time session setup in `useEffect` — not
for data fetching, which belongs in React Query or service functions.

```typescript
// hooks/auth-context.tsx — Canonical context init pattern
useEffect(() => {
  let mounted = true;

  const initAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      if (mounted) setIsLoading(false);
    }
  };

  initAuth();
  return () => { mounted = false; };
}, []);
```

---

## Platform-Aware Async Code

Native-only APIs must be gated with `Platform.OS` checks. Calling `SecureStore`,
`LocalAuthentication`, or `Notifications` on web will crash.

```typescript
// hooks/auth-context.tsx — Gate secure storage behind platform check
async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(key, value);
}
```

See the **expo** skill for the full list of native-only APIs and their web alternatives.

---

## WARNING: useEffect for Data Fetching

**The Problem:**

```typescript
// BAD — Raw fetch inside useEffect
useEffect(() => {
  fetch('/api/events').then(r => r.json()).then(setEvents);
}, []);
```

**Why This Breaks:**
1. **Race conditions** — fast navigation causes stale responses to overwrite newer data
2. **No caching** — every mount hits the network even for identical queries
3. **No deduplication** — same data fetched simultaneously across multiple components
4. **Silent failures** — no `.catch` means errors disappear without trace
5. **Memory leaks** — `setEvents` fires on an unmounted component

**The Fix:**

This project uses React Query for server-state caching (see the **tanstack-query** skill)
and Supabase service functions called from contexts for session-scoped data.

```typescript
// GOOD — React Query for server state (church settings pattern)
const { data, isLoading } = useQuery({
  queryKey: ['church-settings'],
  queryFn: fetchChurchSettings,
  staleTime: 5 * 60 * 1000,
});
```

**When You Might Be Tempted:** Adding a quick one-off fetch in a screen component.
Always route it through a service function called from a context or a `useQuery` hook.

---

## WARNING: Unguarded Async in useEffect

**The Problem:**

```typescript
// BAD — No mounted flag, no error handling
useEffect(() => {
  const load = async () => {
    const data = await fetchData();
    setState(data); // setState may fire after component unmounts
  };
  load();
}, []);
```

**Why This Breaks:**
1. **Memory leak warnings** — React logs "Can't perform a React state update on an unmounted component"
2. **Stale updates** — a slow response from a previous render overwrites the current state
3. **No error path** — uncaught rejections surface as unhandled promise rejections

**The Fix:**

```typescript
// GOOD — Mounted flag + try/catch + cleanup
useEffect(() => {
  let mounted = true;
  const load = async () => {
    try {
      const data = await fetchData();
      if (mounted) setState(data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };
  load();
  return () => { mounted = false; };
}, []);
```

---

## WARNING: Sequential Awaits for Independent Queries

**The Problem:**

```typescript
// BAD — Three round trips when one batch would suffice
const profile = await supabase.from('profiles').select('*').eq('id', id).single();
const person  = await supabase.from('persons').select('*').eq('user_id', id).maybeSingle();
const family  = await supabase.from('families').select('*').eq('id', familyId).single();
```

**Why This Breaks:**
1. **Waterfall latency** — 3 sequential round trips instead of ~1 parallel batch
2. **Degraded startup** — context loading takes 3× as long, blocking the UI
3. **Wasted network** — queries could overlap with zero extra complexity

**The Fix:**

```typescript
// GOOD — All three queries in parallel
const [profile, person, family] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', id).single(),
  supabase.from('persons').select('*').eq('user_id', id).maybeSingle(),
  supabase.from('families').select('*').eq('id', familyId).single(),
]);
```

**When Sequential IS Correct:** Query B needs data from query A's result. Example:
fetch `profiles` first to get `family_id`, then fetch `families` using that ID.
