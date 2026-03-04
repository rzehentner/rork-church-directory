# State Management Reference

## Contents
- State Categories
- Context Architecture
- Provider Pattern
- Derived State Pattern (MeProvider)
- WARNING: Prop Drilling Past Context
- WARNING: State for Derived Values
- Platform-Aware State
- Memoized Context Return Values

---

## State Categories

| Category | Tool | Location |
|----------|------|----------|
| UI state (modals, inputs, selected tab) | `useState` | Local to screen/component |
| Server state (events, prayers, announcements) | React Query / manual fetch | Screen or service |
| Auth state (session, user object) | `AuthProvider` | `hooks/auth-context.tsx` |
| User state (profile, person, family) | `UserProvider` | `hooks/user-context.tsx` |
| Derived state (role checks, display name) | `MeProvider` | `hooks/me-context.tsx` |
| App config (church name, service times) | `ChurchSettingsProvider` | `hooks/church-settings-context.tsx` |
| Toast queue, offline status | `ToastProvider` | `hooks/toast-context.tsx` |

**Rule:** Data from Supabase = server state. Computed from other state = derive it (no `useState`). UI-only = local `useState`.

---

## Context Architecture

All contexts use `@nkzw/create-context-hook`. Defined in `app/_layout.tsx`:

```typescript
<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <AuthProvider>
      <UserProvider>      {/* calls useAuth() */}
        <MeProvider>      {/* calls useAuth() + useUser() */}
          <ChurchSettingsProvider>
            <NotificationProvider>
              <Stack />
            </NotificationProvider>
          </ChurchSettingsProvider>
        </MeProvider>
      </UserProvider>
    </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

Each provider can only consume hooks from providers **above** it. Violating this order produces "hook used outside provider" runtime errors.

---

## Provider Pattern

**Auth context** — session + biometric + sign in/out:

```typescript
export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, isLoading, signIn, signOut };
});
```

**User context** — profile/person/family, re-fetched when auth changes:

```typescript
export const [UserProvider, useUser] = createContextHook<UserState>(() => {
  const { user } = useAuth(); // Depends on AuthProvider being above
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) { setProfile(null); return; }

    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('persons').select('*').eq('user_id', user.id).maybeSingle(),
    ]).then(([profileRes, personRes]) => {
      setProfile(profileRes.data);
      setPerson(personRes.data);
    }).catch(err => console.error('Failed to load user data:', err));
  }, [user]);

  return { profile, person, family, isLoading, refetch };
});
```

---

## Derived State Pattern (MeProvider)

`MeProvider` holds **zero** local state. Everything is computed synchronously from other contexts:

```typescript
export const [MeProvider, useMeContext] = createContextHook<MeState>(() => {
  const { user, session } = useAuth();
  const { profile, person, isLoading } = useUser();

  const isAuthenticated = !!session && !!user;
  const isAdmin = profile?.role === 'admin';
  const isAdminOrLeader = isAdmin || profile?.role === 'leader';
  const isMember = isMember || profile?.role === 'member';
  const displayName = person
    ? `${person.first_name || ''} ${person.last_name || ''}`.trim()
    : user?.email || 'User';

  return { isAuthenticated, isAdmin, isAdminOrLeader, isMember, displayName, isLoading };
});
```

**DO:** Add new derived values to `MeProvider` when multiple screens need the same computation.

**DON'T:** Add `useState` or async operations to `MeProvider` — if it needs data fetching, it belongs in a different provider.

---

## WARNING: Prop Drilling Past Context

**The Problem:**

```typescript
// BAD — threading profile through 3 levels just to check a role
<EventsScreen profile={profile} />
  → <EventList isAdmin={profile?.role === 'admin'} />
    → <EventCard canEdit={isAdmin} />
```

**Why This Breaks:**
1. Every intermediate component must declare and pass `profile` or `isAdmin` even if it doesn't use it.
2. Adding a new permission requires modifying every intermediate component in the tree.
3. TypeScript complains when you forget to pass props down.

**The Fix:**

```typescript
// GOOD — consume context where needed, skip the prop chain
function EventCard({ event }: { event: Event }) {
  const { isAdminOrLeader } = useMeContext();
  return (
    <View>
      <Text>{event.title}</Text>
      {isAdminOrLeader && <EditButton eventId={event.id} />}
    </View>
  );
}
```

---

## WARNING: State for Derived Values

**The Problem:**

```typescript
// BAD — three pieces of state that must stay in sync
const [events, setEvents] = useState<Event[]>([]);
const [upcoming, setUpcoming] = useState<Event[]>([]);
const [past, setPast] = useState<Event[]>([]);

useEffect(() => {
  const now = new Date();
  setUpcoming(events.filter(e => new Date(e.end_at) >= now));
  setPast(events.filter(e => new Date(e.end_at) < now));
}, [events]);
```

**Why This Breaks:**
1. There's a frame where `events` updated but `upcoming`/`past` haven't — stale data visible.
2. The `useEffect` triggers an extra render cycle on every `events` change.
3. Each new filter (by tag, search query) multiplies the problem.

**The Fix:**

```typescript
// GOOD — single source of truth, derived via useMemo (from events.tsx)
const [allEvents, setAllEvents] = useState<Event[]>([]);

const filteredEvents = useMemo(() => {
  let events = allEvents;
  if (viewMode === 'upcoming') events = events.filter(e => new Date(e.end_at) >= new Date());
  if (searchQuery.trim()) {
    events = events.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }
  return events.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}, [allEvents, viewMode, searchQuery]);
```

---

## Platform-Aware State

Some state is only meaningful on certain platforms. Skip it on others to avoid issues:

```typescript
// toast-context.tsx — offline detection native-only
const [isOffline, setIsOffline] = useState(false);

useEffect(() => {
  if (Platform.OS === 'web') return; // NetInfo doesn't work on web

  const unsubscribe = NetInfo.addEventListener(state => {
    setIsOffline(!state.isConnected);
  });
  return () => unsubscribe();
}, []);
```

Pattern: guard platform-specific subscriptions with `Platform.OS === 'web'` check. Provide a safe default for the skipped platform.

---

## Memoized Context Return Values

Without `useMemo` on the return object, every state change in a context re-renders all consumers — even if their specific values didn't change.

```typescript
// notification-context.tsx — memoized return
const unreadCount = useMemo(
  () => notifications.filter(n => !n.read_at).length,
  [notifications]
);

return useMemo(() => ({
  notifications,
  unreadCount,
  isLoading,
  markAsRead,
  refetch,
}), [notifications, unreadCount, isLoading, markAsRead, refetch]);
```

Apply this pattern to any context with multiple consumers or frequent state updates.
