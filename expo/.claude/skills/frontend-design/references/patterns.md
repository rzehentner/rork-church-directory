# Patterns Reference

## Contents
- Style File Organization
- DO/DON'T Pairs
- Shadow Elevation System
- Conditional Styling
- Platform-Specific Patterns
- Style Reuse Strategy
- WARNING: Inline Styles in Render
- WARNING: Computed Values in Styles
- WARNING: Missing Form Validation Library
- Visual Consistency Checklist

## Style File Organization

Every screen gets its own style file. This is a hard rule — do not put styles inline or in the screen file.

```
app/events.tsx              → styles/events.styles.ts
app/create-event.tsx        → styles/create-event.styles.ts
app/(tabs)/dashboard.tsx    → styles/dashboard.styles.ts
```

Style file template:

```typescript
// styles/my-screen.styles.ts
import { StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/colors';

export const styles = StyleSheet.create({
  // ... all styles for this screen
});
```

Import in the screen:

```typescript
import { styles } from '@/styles/my-screen.styles';
```

## DO/DON'T Pairs

### Colors

```typescript
// DO — semantic tokens
color: Colors.text.primary
backgroundColor: Colors.background.card

// DON'T — hardcoded hex values
color: '#1A2744'
backgroundColor: '#FFFFFF'
```

**Why:** Hardcoded hex values make theming impossible and create maintenance burden. Every color change requires a codebase-wide search.

### Spacing

```typescript
// DO — values from the spacing scale
{ padding: 16, marginBottom: 12, gap: 8 }

// DON'T — arbitrary values
{ padding: 15, marginBottom: 13, gap: 7 }
```

**Why:** Off-scale values break visual rhythm. Designers and developers can't predict what spacing looks like without running the app.

### Shadows

```typescript
// DO — use one of the two standard elevation levels
// Light
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.04,
shadowRadius: 3,
elevation: 1,

// DON'T — make up shadow values
shadowOpacity: 0.3,
shadowRadius: 15,
```

**Why:** Heavy shadows look dated and fight the app's soft, warm aesthetic. Consistent elevation creates visual hierarchy without distraction.

### Text

```typescript
// DO — use established type scale
{ fontSize: 14, fontWeight: '500', lineHeight: 20 }

// DON'T — use sizes outside the scale
{ fontSize: 15, fontWeight: '550' }
```

**Why:** React Native doesn't support `fontWeight: '550'`. Only `'100'` through `'900'` in increments of 100 are valid. Off-scale font sizes create inconsistent hierarchy.

### Borders

```typescript
// DO — consistent border radius
borderRadius: 8   // buttons, inputs
borderRadius: 12  // cards
borderRadius: 16  // pills, large cards

// DON'T — random or extreme values
borderRadius: 9999  // not used in this app
borderRadius: 3     // too subtle, looks like a rendering artifact
```

## Shadow Elevation System

Two standard levels. Pick one — do not create custom shadow combinations.

### Light Elevation (Cards, List Items)

```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.04,
shadowRadius: 3,
elevation: 1,
```

### Medium Elevation (Active Cards, Floating Buttons)

```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 3,
```

### Heavy Elevation (Dialogs, Bottom Sheets)

```typescript
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 8,
elevation: 8,
```

Note: `elevation` is Android-only. Shadow properties are iOS-only. Both must be set for cross-platform shadows.

## Conditional Styling

Use style arrays for all conditional styling. Never use ternaries inside `StyleSheet.create()`.

```typescript
// GOOD — style array with conditional
<View style={[
  styles.card,
  isSelected && styles.cardSelected,
  isDisabled && styles.cardDisabled,
]} />

// GOOD — dynamic value from data
<View style={[styles.pill, { backgroundColor: tag.color || Colors.navy }]} />

// BAD — ternary creating new object every render
<View style={{
  ...styles.card,
  backgroundColor: isSelected ? '#FAFAFE' : '#FFFFFF',
}} />
```

**Why the spread is bad:** It creates a new object on every render, defeating StyleSheet's optimization. The style array approach reuses memoized style objects from `StyleSheet.create()`.

## Platform-Specific Patterns

### Safe Area Offsets

```typescript
// Toast positioning
top: Platform.OS === 'ios' ? 50 : 20,

// Bottom sheet padding
paddingBottom: Platform.OS === 'ios' ? 34 : 20,

// Date picker modal height
minHeight: Platform.OS === 'ios' ? 350 : ('auto' as any),
```

### Platform Fonts

```typescript
// Monospace for tokens/codes
fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
```

### Platform Components

The app has separate implementations for date picker:
- `components/DateTimePicker.tsx` — native iOS/Android
- `components/DateTimePicker.web.tsx` — web HTML input

See the **react-native** skill for platform file resolution (`.web.tsx` suffix).

## Style Reuse Strategy

Styles are NOT shared across screens. Each screen has its own complete style file. This is intentional:

1. **No coupling** — changing one screen's card style doesn't affect others
2. **Easy deletion** — remove a screen and its style file, nothing breaks
3. **Co-location** — a screen's styles are one import away, not buried in shared files

Shared visual patterns (like cards) are duplicated across style files. This is fine — the `Colors` constant ensures color consistency, and the spacing/shadow conventions ensure visual consistency.

The only shared styling components are reusable components in `components/` (TagPill, Skeleton, Toast) which carry their own styles internally.

## WARNING: Inline Styles in Render

**The Problem:**

```typescript
// BAD — new object created every render
<View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 12 }}>
```

**Why This Breaks:**
1. React Native compares styles by reference. New objects force re-renders.
2. No memoization — `StyleSheet.create()` optimizes styles at creation time.
3. Hard to find and maintain — styles scattered through JSX.

**The Fix:**

```typescript
// GOOD — in the style file
card: {
  backgroundColor: Colors.background.card,
  padding: 16,
  borderRadius: 12,
},

// In the component
<View style={styles.card}>
```

**When Inline Is Acceptable:** Dynamic values from data (tag colors, variable widths) used via style arrays: `[styles.base, { backgroundColor: dynamicColor }]`.

## WARNING: Computed Values in Styles

**The Problem:**

```typescript
// BAD — computed inside StyleSheet.create
export const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,  // This is fine
    width: Dimensions.get('window').width - 40,     // THIS is bad
  },
});
```

**Why This Breaks:** `StyleSheet.create()` runs once at import time. `Dimensions.get('window')` captures the initial window size. On screen rotation or split-view, the width becomes wrong.

**The Fix:**

```typescript
// GOOD — use flex/percentage for responsive widths
container: {
  paddingHorizontal: 20,  // 20px on each side, responsive to any width
},

// Or use useWindowDimensions() hook for truly dynamic values
const { width } = useWindowDimensions();
<View style={[styles.container, { width: width - 40 }]} />
```

## WARNING: Missing Form Validation Library

**Detected:** No `react-hook-form` or equivalent in dependencies.
**Impact:** Form screens use manual `useState` for each field and hand-written validation logic, leading to repetitive code and inconsistent validation UX.

The app uses **zod** for schema validation (see the **zod** skill), but forms are wired manually. If form complexity grows, consider adding `react-hook-form`:

```bash
bun add react-hook-form @hookform/resolvers
```

This would pair with existing zod schemas for type-safe, declarative form handling with built-in error states and field registration.

## Visual Consistency Checklist

Use this when reviewing new screen designs:

- [ ] Screen background is `Colors.background.primary` (#FAFAF7)
- [ ] Cards use `Colors.background.card` (#FFFFFF) with 12px radius
- [ ] Horizontal screen padding is 20px
- [ ] Card internal padding is 16px
- [ ] Shadows use standard light or medium elevation
- [ ] Text colors come from `Colors.text.*` tokens
- [ ] Button height meets 44px minimum touch target
- [ ] Font weights are strings (`'600'` not `600`)
- [ ] Spacing values are from the scale (4/8/12/16/20/24)
- [ ] Border radius values are from the scale (4/6/8/12/16/20)
- [ ] Loading state uses `Skeleton` component
- [ ] Empty state has icon + title + subtitle
- [ ] Error state has red banner or full-screen error
- [ ] Bottom padding accounts for tab bar and floating buttons (100px)
- [ ] Platform-specific code is guarded with `Platform.OS` checks
