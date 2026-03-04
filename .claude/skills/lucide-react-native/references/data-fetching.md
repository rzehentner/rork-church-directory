# Data Fetching Reference

## Contents
- Data Fetching Architecture
- Loading State Icons
- Error State Icons
- Icon Rendering in Query Results
- WARNING: Icons in useEffect Fetch Callbacks

---

## Data Fetching Architecture

This project uses **TanStack React Query v5** for server state (see the **tanstack-query** skill) and **context providers** for auth/user state. Icons appear at the rendering layer — they reflect query state but never drive data fetching.

```
Query → data/isLoading/isError → Screen renders icons based on state
```

## Loading State Icons

Screens use `ActivityIndicator` (not icons) for loading states. Icons appear once data is available:

```tsx
// app/(tabs)/prayers.tsx pattern
const { data: prayers, isLoading } = useQuery({
  queryKey: ['prayers', activeTab],
  queryFn: () => listPrayers({ status: activeTab }),
});

if (isLoading) {
  return <ActivityIndicator size="large" color={Colors.navy} />;
}

// Icons render only after data loads
{prayers?.map(prayer => (
  <View key={prayer.id} style={styles.card}>
    <Heart size={14} color={Colors.text.muted} />
    <Text>{prayer.prayer_count} prayers</Text>
  </View>
))}
```

**DO:** Show `ActivityIndicator` or `Skeleton` during loading. Render icons only when data is available.

**DON'T:** Show icons with placeholder data or grayed-out icons during loading — it confuses users about what's interactive.

## Error State Icons

Use `AlertCircle` or `AlertTriangle` for error states alongside error messages:

```tsx
import { AlertCircle } from 'lucide-react-native';

if (isError) {
  return (
    <View style={styles.errorContainer}>
      <AlertCircle size={28} color={Colors.status.error} />
      <Text style={styles.errorText}>Failed to load prayer requests</Text>
      <TouchableOpacity onPress={() => refetch()}>
        <Text>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Icon-to-Error mapping:**

| Icon | When |
|------|------|
| `AlertCircle` | General errors, failed loads, validation warnings |
| `AlertTriangle` | Destructive action confirmations, data loss warnings |
| `XCircle` | Explicit failures (toast errors, rejected submissions) |

## Icon Rendering in Query Results

Icons often accompany list items from query results. Map data properties to icon appearance:

```tsx
// app/(tabs)/prayers.tsx — Status-driven icon rendering
import { CheckCircle2, Archive, RotateCcw } from 'lucide-react-native';

function getStatusIcon(status: string) {
  if (status === 'answered') return { icon: CheckCircle2, color: Colors.status.success };
  if (status === 'archived') return { icon: Archive, color: Colors.text.muted };
  return { icon: RotateCcw, color: Colors.status.info };
}

// In FlatList renderItem
const { icon: StatusIcon, color } = getStatusIcon(item.status);
<StatusIcon size={16} color={color} />
```

```tsx
// app/(tabs)/events.tsx — Conditional icon rendering based on event type
import { UtensilsCrossed, ClipboardList } from 'lucide-react-native';

{event.is_potluck && <UtensilsCrossed size={14} color={Colors.text.secondary} />}
{event.has_signup && <ClipboardList size={14} color={Colors.text.secondary} />}
```

## WARNING: Icons in useEffect Fetch Callbacks

**The Problem:**

```tsx
// BAD — Setting icon state from useEffect fetch
const [statusIcon, setStatusIcon] = useState<React.ReactNode>(null);

useEffect(() => {
  fetch('/api/status')
    .then(r => r.json())
    .then(data => {
      setStatusIcon(<CheckCircle size={20} color="green" />);
    });
}, []);
```

**Why This Breaks:**
1. Stores JSX in state — breaks React reconciliation assumptions
2. `useEffect` for fetching causes race conditions and memory leaks
3. No caching, no deduplication, no retry logic
4. Icon is a new object every set — triggers unnecessary rerenders

**The Fix:**

```tsx
// GOOD — Use React Query for fetching, derive icon from data
const { data } = useQuery({
  queryKey: ['status'],
  queryFn: fetchStatus,
});

// Derive icon at render time from query data
const StatusIcon = data?.status === 'ok' ? CheckCircle : AlertCircle;
const iconColor = data?.status === 'ok' ? Colors.status.success : Colors.status.error;

<StatusIcon size={20} color={iconColor} />
```

**When You Might Be Tempted:** When you need an icon to "react" to async data. The answer is always: fetch with React Query, derive the icon from the query result at render time.

---

## Data-Driven Icon Patterns

### Conditional rendering from Supabase views

```tsx
// Event detail with RSVP-driven icons
const { data: event } = useQuery({
  queryKey: ['event', eventId],
  queryFn: () => fetchEvent(eventId),
});

<Heart
  size={20}
  color={event?.my_rsvp === 'going' ? Colors.status.success : Colors.text.muted}
  fill={event?.my_rsvp === 'going' ? Colors.status.success : 'transparent'}
/>
```

See the **supabase** skill for query patterns and the **tanstack-query** skill for cache configuration.
