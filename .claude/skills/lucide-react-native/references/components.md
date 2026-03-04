# Components Reference

## Contents
- Icon-Bearing Component Patterns
- Toast Component (Icon-Status Mapping)
- TagPill Component (Conditional Icon)
- Calendar Navigation Icons
- ImageUploader Component
- WARNING: Inline Colors in Icon Components

---

## Icon-Bearing Component Patterns

This codebase has no centralized icon wrapper. Icons are imported directly from `lucide-react-native` into each component/screen file. Follow these conventions:

| Component Type | Icon Size | Color Source |
|----------------|-----------|--------------|
| Tab bar | Use `size` from callback | Use `color` from callback |
| Card header | 20-22 | `Colors.navy` or `Colors.text.primary` |
| Button with icon | 16-18 | Match button text color |
| Metadata row | 14-16 | `Colors.text.muted` or `Colors.text.secondary` |
| Close/dismiss | 20-24 | `Colors.text.muted` |
| Empty state | 28-32 | `Colors.steelBlue` |

## Toast Component (Icon-Status Mapping)

`components/Toast.tsx` maps toast types to icon components — the canonical pattern for status-driven icon rendering.

```tsx
// components/Toast.tsx
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react-native';

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const TOAST_COLORS = {
  success: { background: '#10B981', icon: '#FFFFFF' },
  error: { background: '#EF4444', icon: '#FFFFFF' },
  warning: { background: '#F59E0B', icon: '#FFFFFF' },
  info: { background: '#3B82F6', icon: '#FFFFFF' },
};

// Render dynamically based on toast type
const IconComponent = TOAST_ICONS[type];
const colors = TOAST_COLORS[type];
<IconComponent size={20} color={colors.icon} />
```

**DO:** Store icon components as object values for status mapping — avoids switch/if chains.

**DON'T:** Use string icon names and a lookup — lucide icons are tree-shakeable components, not a string registry.

## TagPill Component (Conditional Icon)

`components/TagPill.tsx` conditionally renders a close icon based on props. The icon size adapts to the pill size.

```tsx
// components/TagPill.tsx
import { X } from 'lucide-react-native';

{showRemove && onRemove && (
  <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
    <X size={size === 'medium' ? 14 : 12} color="#FFFFFF" />
  </TouchableOpacity>
)}
```

**Pattern:** Size icons proportionally to their container. Pill variants (`small`, `medium`) drive icon size.

## Calendar Navigation Icons

`components/Calendar.tsx` uses chevron icons for month navigation.

```tsx
// components/Calendar.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

<TouchableOpacity onPress={goToPreviousMonth}>
  <ChevronLeft size={20} color={Colors.navy} />
</TouchableOpacity>
<TouchableOpacity onPress={goToNextMonth}>
  <ChevronRight size={20} color={Colors.navy} />
</TouchableOpacity>
```

**DO:** Use `ChevronLeft`/`ChevronRight` for directional navigation. Use `ArrowLeft`/`ArrowRight` for back/forward screen navigation.

## ImageUploader Component

`components/ImageUploader.tsx` uses icons for the upload trigger and camera actions.

```tsx
// components/ImageUploader.tsx
import { Camera, Upload } from 'lucide-react-native';

<Camera size={24} color={Colors.navy} />
<Upload size={20} color={Colors.text.secondary} />
```

## WARNING: Inline Colors in Icon Components

**The Problem:**

```tsx
// BAD — Hardcoded hex colors throughout components
<Building2 size={20} color="#7C3AED" />
<MapPin size={20} color="#3B82F6" />
<PhoneIcon size={20} color="#10B981" />
<Clock size={20} color="#F59E0B" />
```

**Why This Breaks:**
1. **No single source of truth** — changing the brand palette requires finding every hex string
2. **Inconsistent colors** — `#7C3AED` (purple) is used in 50+ places but isn't in the `Colors` constant at all
3. **Theming impossible** — dark mode or palette changes require a codebase-wide find-and-replace

**The Fix:**

```tsx
// GOOD — Use Colors constants from @/constants/colors
import { Colors } from '@/constants/colors';

<Building2 size={20} color={Colors.navy} />
<MapPin size={20} color={Colors.status.info} />
<PhoneIcon size={20} color={Colors.status.success} />
<Clock size={20} color={Colors.status.warning} />
```

**When You Might Be Tempted:** When a design calls for a color not in the `Colors` object. Add the color to `constants/colors.ts` first, then reference it.

---

## Component Checklist for Icon Integration

Copy this checklist when adding icons to a new component:

- [ ] Import icon individually: `import { IconName } from 'lucide-react-native'`
- [ ] Use `Colors` constant for color prop (never raw hex)
- [ ] Choose size from the project size scale (12/14/16/18/20/22/24/28/32)
- [ ] For dynamic icons, store component reference in a typed object/array
- [ ] For toggle states, use `fill` prop (not two separate icon imports)
- [ ] Ensure icon has accessible label on its parent `TouchableOpacity` (`accessibilityLabel`)

See the **react-native** skill for `TouchableOpacity` and `accessibilityLabel` patterns.
