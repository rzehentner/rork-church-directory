# Performance Reference

## Contents
- Tree Shaking (Individual Imports)
- Avoiding Re-renders from Icon Props
- Memoizing Icon-Heavy Lists
- Static Icon Config Objects
- WARNING: Barrel Imports from Lucide
- WARNING: Inline Object Props on Icons

---

## Tree Shaking (Individual Imports)

Lucide ships 1400+ icons. This project imports ~100. Individual named imports ensure unused icons are excluded from the bundle.

```tsx
// GOOD — Only Heart and MapPin are bundled
import { Heart, MapPin } from 'lucide-react-native';

// BAD — Would import the entire icon library (if such a pattern existed)
import * as Icons from 'lucide-react-native';
```

Each icon is ~1-2KB. Importing all 1400+ would add ~2MB to the JS bundle. The current individual import pattern keeps the icon footprint under 200KB.

## Avoiding Re-renders from Icon Props

Icon components accept primitive props (`size: number`, `color: string`). Primitives are compared by value, so icons only re-render when their props actually change. This is already optimal — no special memoization needed for individual icons.

```tsx
// This is fine — primitives don't cause unnecessary rerenders
<Heart size={20} color={Colors.navy} />
```

**The risk is on the parent.** If the parent re-renders, all icons re-render too. Focus memoization on the parent component, not the icon.

## Memoizing Icon-Heavy Lists

Prayer requests, event lists, and directory screens render 20-50+ icons per list. Use `React.useCallback` for `renderItem` and ensure `keyExtractor` uses stable IDs.

```tsx
// app/(tabs)/prayers.tsx pattern
const renderPrayerItem = useCallback(({ item }: { item: PrayerRequest }) => (
  <View style={styles.card}>
    <Heart size={14} color={Colors.text.muted} />
    <Text>{item.prayer_count}</Text>
    {/* More icons per card... */}
  </View>
), []); // Empty deps — styles and Colors are stable module-level constants

<FlatList
  data={prayers}
  renderItem={renderPrayerItem}
  keyExtractor={item => item.id}
/>
```

**DO:** Wrap `renderItem` in `useCallback` when cards contain multiple icons.

**DON'T:** Skip `keyExtractor` — React defaults to index keys, which causes full icon re-render on list reorder.

## Static Icon Config Objects

Define icon mapping objects at module level (outside the component). This avoids recreating the object on every render.

```tsx
// GOOD — Module-level constant, created once
const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
} as const;

export default function Toast({ type }: { type: ToastType }) {
  const IconComponent = TOAST_ICONS[type];
  return <IconComponent size={20} color={Colors.white} />;
}
```

```tsx
// BAD — Recreated every render
export default function Toast({ type }: { type: ToastType }) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
  };
  // ...
}
```

## WARNING: Barrel Imports from Lucide

**The Problem:**

```tsx
// BAD — Imports entire library
import * as LucideIcons from 'lucide-react-native';

// Also BAD — Dynamic string-based lookup
const iconName = 'Heart';
const Icon = LucideIcons[iconName];
```

**Why This Breaks:**
1. **Bundle size explosion** — includes all 1400+ icons (~2MB) instead of just the ones used
2. **Metro bundler can't tree-shake** `import *` — every icon becomes a dependency
3. **Slower app startup** — more JS to parse and evaluate on cold boot
4. **EAS build size limits** — unnecessary bloat can push past OTA update size thresholds

**The Fix:**

```tsx
// GOOD — Named imports, fully tree-shakeable
import { Heart, MapPin, Clock } from 'lucide-react-native';
```

For dynamic icon selection, use a pre-defined mapping object with explicit imports:

```tsx
import { Heart, Star, Bell } from 'lucide-react-native';

const ICON_MAP = { heart: Heart, star: Star, bell: Bell } as const;
const Icon = ICON_MAP[iconKey]; // Only these 3 are bundled
```

**When You Might Be Tempted:** When building a settings screen or admin panel where icon names come from a database. Pre-define the allowed icon set instead.

## WARNING: Inline Object Props on Icons

**The Problem:**

```tsx
// BAD — New style object created every render
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Heart size={20} color={Colors.navy} style={{ marginRight: 8 }} />
</View>
```

**Why This Breaks:**
1. `style={{ marginRight: 8 }}` creates a new object reference every render
2. In a `FlatList` with 50 items, that's 50 new objects per render cycle
3. Forces the SVG component to diff and potentially re-render

**The Fix:**

```tsx
// GOOD — Use StyleSheet (already the project convention)
const styles = StyleSheet.create({
  icon: { marginRight: 8 },
});

<Heart size={20} color={Colors.navy} style={styles.icon} />
```

**Note:** The `size` and `color` props are primitives and are fine inline — this warning is specifically about object-type props like `style`.

---

## Performance Checklist

Copy this checklist when optimizing icon-heavy screens:

- [ ] All icons imported individually (no `import *`)
- [ ] Icon config objects defined at module level (outside component)
- [ ] `FlatList` renderItem wrapped in `useCallback`
- [ ] `keyExtractor` uses stable IDs (not array index)
- [ ] No inline `style` objects on icon components
- [ ] Icon colors reference `Colors` constant (module-level, stable reference)

## Validation Loop

1. Check bundle size: `npx expo export --platform web` and inspect output
2. If bundle seems large, search for `import *` from lucide: should find zero results
3. Run the app and profile with React DevTools — icons should not appear as re-rendering components
4. If icons re-render excessively, memoize the parent `renderItem`, not the icon itself
