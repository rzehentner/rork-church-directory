# Hooks Reference

## Contents
- Icon State in Context Providers
- Dynamic Icon Selection Pattern
- Tab Bar Icon Hook Integration
- Icon Toggle State Pattern
- WARNING: Recreating Icon Components in Hooks

---

## Icon State in Context Providers

This codebase uses `@nkzw/create-context-hook` for all contexts. Icons are NOT stored in context state — they're rendered at the screen level based on context-derived values.

```tsx
// hooks/me-context.tsx provides role checks
// Screens use role to conditionally render icons
import { Shield } from 'lucide-react-native';
import { useMe } from '@/hooks/me-context';

const { isAdmin } = useMe();
// Render admin icon only when role matches
{isAdmin && <Shield size={16} color={Colors.gold} />}
```

## Dynamic Icon Selection Pattern

Store icon components as values in typed arrays/objects. Use `typeof` to type the icon field.

```tsx
// app/(tabs)/prayers.tsx — Sort options with icon components
import {
  ArrowDownAZ, ArrowUpAZ,
  CalendarArrowDown, CalendarArrowUp,
} from 'lucide-react-native';

const SORT_OPTIONS: { key: SortMode; label: string; icon: typeof ArrowDownAZ }[] = [
  { key: 'date_desc', label: 'Newest', icon: CalendarArrowDown },
  { key: 'date_asc', label: 'Oldest', icon: CalendarArrowUp },
  { key: 'subject_asc', label: 'A → Z', icon: ArrowDownAZ },
  { key: 'subject_desc', label: 'Z → A', icon: ArrowUpAZ },
];

// Render the active sort icon dynamically
const activeSortOption = SORT_OPTIONS.find(o => o.key === sortMode)!;
const ActiveSortIcon = activeSortOption.icon;
<ActiveSortIcon size={18} color={Colors.navy} />
```

## Tab Bar Icon Hook Integration

Expo Router passes `color` and `size` to `tabBarIcon`. ALWAYS destructure and forward both — never hardcode values here. See the **expo-router** skill for full tab configuration.

```tsx
// app/(tabs)/_layout.tsx
import { Home, Users, Settings, Zap } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

<Tabs screenOptions={{
  tabBarActiveTintColor: Colors.navy,
  tabBarInactiveTintColor: Colors.steelBlue,
}}>
  <Tabs.Screen options={{
    tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
  }} />
</Tabs>
```

**DO:** Forward `color` and `size` from the callback — Expo Router manages active/inactive states.

**DON'T:** Hardcode `size={24}` or `color={Colors.navy}` in tab icons. This breaks the active/inactive color switching.

## Icon Toggle State Pattern

For icons that change appearance based on boolean state (prayed/not prayed, liked/not liked):

```tsx
// app/(tabs)/prayers.tsx — Heart toggle
const [isPrayed, setIsPrayed] = useState(false);

<Heart
  size={15}
  color={isPrayed ? Colors.white : '#7C3AED'}
  fill={isPrayed ? Colors.white : 'transparent'}
/>
```

**DO:** Use `fill` prop to toggle between filled and outlined states.

**DON'T:** Swap between two different icon components (e.g., `Heart` and `HeartFilled`) — lucide only has outlined icons; use the `fill` prop instead.

## WARNING: Recreating Icon Components in Hooks

**The Problem:**

```tsx
// BAD — Creates new component reference every render
function useStatusIcon(status: string) {
  const getIcon = () => {
    if (status === 'success') return <CheckCircle size={20} color="green" />;
    if (status === 'error') return <XCircle size={20} color="red" />;
    return <Info size={20} color="blue" />;
  };
  return getIcon();
}
```

**Why This Breaks:**
1. Returns JSX from a hook — violates hook conventions
2. New JSX element created every render — no referential stability
3. Cannot memoize the result since JSX is always a new object

**The Fix:**

```tsx
// GOOD — Return the component reference, let the caller render
function useStatusIcon(status: string) {
  if (status === 'success') return CheckCircle;
  if (status === 'error') return XCircle;
  return Info;
}

// Caller renders with props
const StatusIcon = useStatusIcon(prayer.status);
<StatusIcon size={20} color={Colors.status.success} />
```

**When You Might Be Tempted:** When building reusable status indicators. Return the component type, not the rendered element.

---

## Icon Type References

When typing icon props or arrays of icon data, use `typeof` on any lucide icon:

```tsx
// All lucide icons share the same component signature
type IconComponent = typeof Heart; // works for any icon

interface ActionItem {
  label: string;
  icon: typeof Heart;
  onPress: () => void;
}
```

See the **typescript** skill for advanced type patterns.
