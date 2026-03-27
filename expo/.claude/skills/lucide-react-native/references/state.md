# State Reference

## Contents
- State Architecture for Icons
- Icon Toggle State (Fill Pattern)
- Status-Driven Icon State
- Selection Mode Icon State
- WARNING: Storing JSX Icons in State

---

## State Architecture for Icons

Icons in this codebase are **derived from state, never stored as state**. The pattern:

```
State (boolean/enum) → Render logic → Icon component + props
```

State lives in:
- **Local state** (`useState`) — toggle booleans, selection mode, active filters
- **Context state** (`useMe`, `useUser`) — roles, permissions, profile data
- **Server state** (React Query) — entity status, counts, relationships

## Icon Toggle State (Fill Pattern)

The most common icon-state interaction is toggling appearance based on a boolean.

```tsx
// app/(tabs)/prayers.tsx — Prayer toggle
const [isPrayed, setIsPrayed] = useState(item.i_prayed_today);

<TouchableOpacity onPress={() => handleTogglePrayer(item.id)}>
  <Heart
    size={15}
    color={isPrayed ? Colors.white : '#7C3AED'}
    fill={isPrayed ? Colors.white : 'transparent'}
  />
</TouchableOpacity>
```

**DO:** Use a single icon with `fill` and `color` props driven by boolean state.

**DON'T:** Conditionally render different icon components for toggled states:

```tsx
// BAD — Two separate renders
{isPrayed ? <HeartFilled size={15} /> : <Heart size={15} />}

// GOOD — One component, props change
<Heart size={15} fill={isPrayed ? Colors.white : 'transparent'} />
```

## Status-Driven Icon State

For multi-value state (enums), map status to icon+color pairs.

```tsx
// app/(tabs)/prayers.tsx — Prayer status icons
import { CheckCircle2, Archive, RotateCcw } from 'lucide-react-native';

const STATUS_CONFIG = {
  open: { icon: RotateCcw, color: Colors.status.info },
  answered: { icon: CheckCircle2, color: Colors.status.success },
  archived: { icon: Archive, color: Colors.text.muted },
} as const;

// Render from current status
const { icon: StatusIcon, color } = STATUS_CONFIG[prayer.status];
<StatusIcon size={16} color={color} />
```

**Pattern:** Define a `const` config object mapping every possible state value to its icon and color. This eliminates if/else chains and ensures exhaustive handling.

## Selection Mode Icon State

The prayers screen uses selection mode where checkboxes replace action icons.

```tsx
// app/(tabs)/prayers.tsx — Bulk selection with icon state
const [selectionMode, setSelectionMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Checkbox icons driven by selection state
{selectionMode && (
  <TouchableOpacity onPress={() => toggleSelection(item.id)}>
    {selectedIds.has(item.id)
      ? <CheckSquare size={20} color={Colors.navy} />
      : <Square size={20} color={Colors.text.muted} />
    }
  </TouchableOpacity>
)}
```

**DO:** Use `CheckSquare`/`Square` for multi-select checkboxes — they're visually consistent and clearly convey state.

## WARNING: Storing JSX Icons in State

**The Problem:**

```tsx
// BAD — Storing rendered JSX in state
const [headerIcon, setHeaderIcon] = useState(
  <Home size={24} color={Colors.navy} />
);

// Later, trying to update it
setHeaderIcon(<Settings size={24} color={Colors.navy} />);
```

**Why This Breaks:**
1. **React can't optimize** — JSX in state is a new object reference every time
2. **Serialization fails** — JSX isn't serializable for persistence or debugging
3. **Stale closure risk** — the icon captures props at creation time, not render time
4. **Violates separation** — state should be data, rendering should be in JSX

**The Fix:**

```tsx
// GOOD — Store the icon component reference, render in JSX
const [activeSection, setActiveSection] = useState<'home' | 'settings'>('home');

const SECTION_ICONS = {
  home: Home,
  settings: Settings,
} as const;

const ActiveIcon = SECTION_ICONS[activeSection];
<ActiveIcon size={24} color={Colors.navy} />
```

**When You Might Be Tempted:** When building dynamic UIs that switch icons. Always store the enum/key in state and map to the icon at render time.

---

## Context-Derived Icon Rendering

Icons change based on values from the context provider chain. See the **react-native** skill for provider patterns.

```tsx
// Role-based icon visibility from context
import { Shield } from 'lucide-react-native';
import { useMe } from '@/hooks/me-context';

const { isAdmin } = useMe();

{isAdmin && (
  <View style={styles.adminBadge}>
    <Shield size={14} color={Colors.gold} />
    <Text style={styles.adminText}>Admin</Text>
  </View>
)}
```

## Filter State with Icons

Sort/filter controls use icons to indicate active state:

```tsx
// Active filter indicator
const [showFilters, setShowFilters] = useState(false);

<TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
  <Filter size={20} color={hasActiveFilters ? Colors.navy : Colors.text.muted} />
</TouchableOpacity>

// Close filter panel
{showFilters && (
  <TouchableOpacity onPress={() => setShowFilters(false)}>
    <X size={20} color={Colors.text.muted} />
  </TouchableOpacity>
)}
```

**Pattern:** Use icon color (not icon swap) to indicate active/inactive filter state. `Colors.navy` for active, `Colors.text.muted` for inactive.
