# Components Reference

## Contents
- Component Architecture
- StyleSheet Patterns
- Platform-Specific Components (.web.tsx)
- WARNING: Hardcoded Colors
- WARNING: Inline Sub-Components in Screens
- Reusable Component Catalog
- Icon Usage

---

## Component Architecture

```
components/Calendar.tsx        → Reusable, props-driven
app/(tabs)/events.tsx          → Screen, calls hooks + services
styles/events.styles.ts        → StyleSheet.create export
```

- Components: `PascalCase`, `export default function ComponentName()`
- Screens: `kebab-case`, `export default function ScreenName()`
- Styles: `export const styles = StyleSheet.create({ ... })` in a matching `.styles.ts` file

---

## StyleSheet Patterns

**Separated style files** for screens — keeps component logic readable:

```typescript
// styles/events.styles.ts
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text.primary },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  buttonActive: { backgroundColor: Colors.navy },
});

// app/(tabs)/events.tsx
import { styles } from '@/styles/events.styles';
```

**Inline styles** for small components (keep styles at the bottom of the file):

```typescript
// components/TagPill.tsx
const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
```

**Conditional style composition** with arrays:

```typescript
<TouchableOpacity
  style={[styles.button, isActive && styles.buttonActive, isDisabled && styles.buttonDisabled]}
>
```

---

## Platform-Specific Components (.web.tsx)

Use the `.web.tsx` extension for components with fundamentally different web implementations. The Expo bundler selects the correct file automatically — no `Platform.OS` check needed at the import site.

```
components/DateTimePicker.tsx      → Native (iOS/Android)
components/DateTimePicker.web.tsx  → Web (HTML5 input)
```

```typescript
// DateTimePicker.tsx — native thin wrapper
import RNDateTimePicker from '@react-native-community/datetimepicker';
export default function DateTimePicker(props: Props) {
  return <RNDateTimePicker {...props} />;
}

// DateTimePicker.web.tsx — HTML5 input
export default function DateTimePicker({ value, mode, onChange }: Props) {
  const inputType = mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date';
  return (
    <input
      type={inputType}
      value={formatValue(value, mode)}
      onChange={handleChange}
      style={{ fontSize: 16, padding: 12, borderRadius: 8 }}
    />
  );
}
```

**For smaller divergences**, inline `Platform.OS` is fine:

```typescript
// Toast.tsx — small platform split
if (Platform.OS !== 'web') {
  Alert.alert(title, message, buttons);
} else {
  setShowModal(true);
}
```

---

## WARNING: Hardcoded Colors

**The Problem:**

```typescript
// BAD — scattered hex values, inconsistent brand
const styles = StyleSheet.create({
  title: { color: '#111827' },        // wrong — not our brand color
  button: { backgroundColor: '#7C3AED' }, // purple not in our palette
});
```

**Why This Breaks:**
1. Brand updates require grep-and-replace across dozens of files.
2. Near-duplicate hex values appear (`#111827` vs `#1A2744` — which is correct?).
3. Any future dark mode or theming becomes a rewrite.

**The Fix:**

```typescript
// GOOD — use Colors from constants/colors.ts
import { Colors } from '@/constants/colors';

const styles = StyleSheet.create({
  title: { color: Colors.text.primary },
  button: { backgroundColor: Colors.navy },
  border: { borderColor: Colors.border.light },
});
```

**Color system** (`constants/colors.ts`):

| Token | Use |
|-------|-----|
| `Colors.navy` | Primary brand, buttons, headers |
| `Colors.gold` | Accent, highlights, badges |
| `Colors.cream` | Elevated backgrounds |
| `Colors.text.primary` | Body text |
| `Colors.text.secondary` / `.muted` | Labels, captions |
| `Colors.status.error` | Error states |
| `Colors.status.success` | Success states |
| `Colors.background.primary` | Page background |
| `Colors.background.card` | Card surfaces |

---

## WARNING: Inline Sub-Components in Screens

**The Problem:**

```typescript
// BAD — FilterSection is a new component type every render
export default function EventsScreen() {
  const FilterSection = () => <View>{/* uses parent state via closure */}</View>;
  return <FlatList ListHeaderComponent={<FilterSection />} />;
}
```

**Why This Breaks:**
1. React treats `FilterSection` as a new component type on every render — it unmounts and remounts.
2. Internal state (inputs, animations) resets on every parent state change.
3. FlatList performance degrades because `ListHeaderComponent` is never stable.

**The Fix:**

For render helpers, use a plain function (not a component):

```typescript
// GOOD — render function, not a component definition
const renderHeader = useCallback(() => (
  <View style={styles.filterRow}>
    <FilterButton active={filter === 'all'} onPress={() => setFilter('all')} label="All" />
    <FilterButton active={filter === 'upcoming'} onPress={() => setFilter('upcoming')} label="Upcoming" />
  </View>
), [filter]);

return <FlatList ListHeaderComponent={renderHeader} />;
```

For reusable pieces, extract to `components/`:

```typescript
import EventFilterBar from '@/components/EventFilterBar';
```

---

## Reusable Component Catalog

| Component | Props | Purpose |
|-----------|-------|---------|
| `Calendar` | `events`, `selectedDate`, `onDateSelect` | Monthly calendar with event dots |
| `DateTimePicker` | `value`, `mode`, `onChange` | Platform-aware date/time picker |
| `ImageUploader` | `onUpload`, `currentImageUrl`, `size` | Pick, resize (1200px), upload to Supabase |
| `Toast` | rendered in `_layout.tsx` | Animated banner via `useToast()` context |
| `Skeleton` | `width`, `height`, `borderRadius` | Loading placeholder with pulse animation |
| `TagPill` | `tag`, `size`, `onRemove` | Colored tag badge |
| `ConfirmationDialog` | via `useConfirmation()` | Native `Alert` / web `Modal` |

---

## Icon Usage

All icons from `lucide-react-native`. Always pass both `size` and `color`:

```typescript
import { Plus, MapPin, Clock, AlertCircle, Search } from 'lucide-react-native';

<Plus size={20} color={Colors.white} />
<MapPin size={16} color={Colors.text.secondary} />
<AlertCircle size={18} color={Colors.status.error} />
```

NEVER omit `color` — icons inherit no default color and will be invisible on some platforms.

See the **lucide-react-native** skill for the full icon catalog and naming conventions.
See the **expo** skill for `expo-image` usage (prefer it over `<Image>` from react-native).
