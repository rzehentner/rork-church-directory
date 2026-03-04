# Performance Reference

## Contents
- Memoization Patterns
- Skeleton Loading
- FlatList Optimization
- WARNING: Inline Object Props
- WARNING: Component Definitions Inside Render
- Image Optimization
- Network Performance
- Bundle Size
- Validation Workflow

---

## Memoization Patterns

### useMemo for Filtered/Sorted Lists

Used in `events.tsx` for filtering large event arrays:

```typescript
const filteredEvents = useMemo(() => {
  let events = allEvents;

  if (searchQuery.trim()) {
    events = events.filter(e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (filters.tagNames.length > 0) {
    events = events.filter(e =>
      e.audience_tags?.some(tag => filters.tagNames.includes(tag.name))
    );
  }
  return events.sort((a, b) =>
    new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );
}, [allEvents, searchQuery, filters]);
```

**Rule:** Use `useMemo` for filtering/sorting arrays or combining multiple state values. Skip it for simple boolean derivations — the memoization overhead exceeds the savings.

### useCallback for Stable Function References

```typescript
// Stable reference allows FlatList to memoize rows
const handleRSVP = useCallback(async (eventId: string, status: RSVP) => {
  setAllEvents(prev => prev.map(e =>
    e.id === eventId ? { ...e, my_rsvp: status } : e
  ));
  try {
    await rsvpEvent(eventId, status);
  } catch {
    setAllEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, my_rsvp: null } : e
    ));
  }
}, []); // no deps — uses functional setState to avoid stale closures
```

### Memoized Context Return Values

Without `useMemo` on the return object, every context state change re-renders all consumers:

```typescript
// notification-context.tsx
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

---

## Skeleton Loading

`Skeleton` uses `Animated.timing` with `useNativeDriver: true` for smooth GPU-rendered pulse:

```typescript
// components/Skeleton.tsx — actual implementation
export function Skeleton({ width = '100%', height = 20, borderRadius = 4 }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop(); // cleanup on unmount
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { width, height, borderRadius, opacity }]} />;
}
```

Usage in screens:

```typescript
if (isLoading) {
  return (
    <View style={styles.container}>
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} width="90%" />
      <Skeleton height={16} width="75%" />
    </View>
  );
}
```

ALWAYS use `useNativeDriver: true` on opacity and transform animations. NEVER use it for layout properties (`width`, `height`, `margin`) — that causes a runtime error.

---

## FlatList Optimization

```typescript
<FlatList
  data={filteredEvents}
  keyExtractor={(item) => item.id}       // stable unique ID — NEVER use index
  renderItem={renderEvent}               // useCallback-wrapped, defined outside JSX
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  ListEmptyComponent={<EmptyState />}
  ListHeaderComponent={renderHeader}     // useCallback-wrapped function, not JSX
  contentContainerStyle={styles.list}    // StyleSheet reference, not inline object
  removeClippedSubviews                  // unmount off-screen items (Android perf)
/>
```

**Critical rules:**
- `keyExtractor` must return a **stable, unique string** — never `item.index`
- `renderItem` must be a `useCallback`-wrapped function, not an inline arrow
- `ListHeaderComponent` / `ListEmptyComponent` should be stable — memoize or extract
- Use `StyleSheet` references for style props — inline objects create new references every render

---

## WARNING: Inline Object Props

**The Problem:**

```typescript
// BAD — new object on every render
<FlatList
  contentContainerStyle={{ paddingBottom: 20 }}
  renderItem={({ item }) => <EventCard event={item} style={{ marginBottom: 12 }} />}
/>
```

**Why This Breaks:**
1. `{ paddingBottom: 20 }` creates a new object reference every render.
2. The inline `renderItem` arrow function is a new reference every render.
3. FlatList treats every prop as changed, preventing row memoization.
4. On large lists: visible frame drops during scroll.

**The Fix:**

```typescript
// GOOD — stable references
const renderEvent = useCallback(({ item }: { item: Event }) => (
  <EventCard event={item} />
), []);

<FlatList
  contentContainerStyle={styles.listContent}  // StyleSheet = stable reference
  renderItem={renderEvent}
/>
```

---

## WARNING: Component Definitions Inside Render

**The Problem:**

```typescript
// BAD — FilterSection is a NEW component type every render
export default function EventsScreen() {
  const FilterSection = () => <View>{/* ... */}</View>;
  return <FlatList ListHeaderComponent={<FilterSection />} />;
}
```

**Why This Breaks:**
1. React sees a different function reference for `FilterSection` on every render.
2. React unmounts and remounts it completely — internal state resets, animations restart.
3. `TextInput` focus is lost every time the parent re-renders.

**The Fix:**

Use a plain render function (not a component definition):

```typescript
const renderHeader = useCallback(() => (
  <View style={styles.filterRow}>
    <FilterPill active={filter === 'all'} label="All" onPress={() => setFilter('all')} />
  </View>
), [filter]);

<FlatList ListHeaderComponent={renderHeader} />
```

Or extract to a stable file-level component in `components/`.

---

## Image Optimization

`ImageUploader` automatically processes before upload:

```typescript
// components/ImageUploader.tsx — auto resize + compress
const MAX_WIDTH = 1200;
const result = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: MAX_WIDTH } }],
  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
);
```

For display, use `expo-image` (not React Native's `Image`) — it provides disk caching, memory caching, blurhash placeholders, and WebP:

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: event.image_url }}
  style={styles.eventImage}
  contentFit="cover"
  transition={200}
  placeholder={blurhash}
/>
```

---

## Network Performance

**Parallel context fetching** in `user-context.tsx`:

```typescript
const [profileRes, personRes] = await Promise.all([
  supabase.from('profiles').select('*').eq('id', user.id).single(),
  supabase.from('persons').select('*').eq('user_id', user.id).maybeSingle(),
]);
```

**Polling** for near-real-time notifications:

```typescript
useQuery({
  queryKey: ['notifications', user?.id],
  queryFn: fetchUserNotifications,
  refetchInterval: 30_000, // 30-second poll
  enabled: !!user,
});
```

**Caching** to prevent redundant refetches:

```typescript
useQuery({
  queryKey: ['church-settings'],
  queryFn: fetchChurchSettings,
  staleTime: 5 * 60 * 1000, // fresh for 5 minutes
});
```

See the **tanstack-query** skill for cache invalidation and background refetch patterns.

---

## Bundle Size

Import only what you use:

```typescript
// GOOD — tree-shakeable named imports
import { format, parseISO } from 'date-fns';
import { Plus, Search, Filter } from 'lucide-react-native';

// BAD — forces the entire library into the bundle
import * as dateFns from 'date-fns';
```

Expo Router automatically code-splits screens — each file in `app/` is a separate chunk loaded on navigation.

---

## Validation Workflow

After making performance changes:

1. Run TypeScript: `npx tsc --noEmit`
2. Run linter: `expo lint`
3. If either fails, fix and repeat from step 1
4. Verify on device: `npx expo start`
5. Check for scroll jank on FlatList screens using the React Native performance overlay
