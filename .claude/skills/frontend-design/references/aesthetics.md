# Aesthetics Reference

## Contents
- Color System
- Typography Scale
- Visual Identity
- Semantic Color Usage
- WARNING: Hardcoded Colors
- Dark Mode Status

## Color System

The brand palette is defined in `constants/colors.ts`. All colors are accessed via the `Colors` constant.

### Brand Colors

```typescript
Colors.navyDark   // #1A2744 — Darkest navy, text primary
Colors.navy       // #2B4C7E — Primary brand, active tabs, primary actions
Colors.navyLight  // #3E6BAF — Lighter navy, status.info
Colors.steelBlue  // #6B8EBF — Accent blue, secondary text, inactive tabs
Colors.gold       // #D4A843 — Brand gold accent
Colors.cream      // #F5F1EB — Cream backgrounds, elevated surfaces
Colors.warmWhite  // #FAFAF7 — Default screen background
```

### Semantic Tokens

```typescript
// Text hierarchy
Colors.text.primary    // #1A2744 — Headlines, body text
Colors.text.secondary  // #6B8EBF — Supporting labels
Colors.text.muted      // #9CA3AF — Hints, timestamps, tertiary
Colors.text.inverse    // #FFFFFF — Text on dark/colored backgrounds

// Surfaces
Colors.background.primary   // #FAFAF7 — Screen background
Colors.background.card      // #FFFFFF — Card surfaces
Colors.background.elevated  // #F5F1EB — Raised sections

// Borders
Colors.border.light   // #E8E2D9 — Dividers, card outlines
Colors.border.medium  // #6B8EBF — Accent borders

// Feedback
Colors.status.success  // #059669 — Green confirmations
Colors.status.warning  // #D97706 — Amber cautions
Colors.status.error    // #EF4444 — Red errors
Colors.status.info     // #3E6BAF — Blue informational
```

### Status Colors in Context

```typescript
// Toast backgrounds (slightly different from status tokens)
const TOAST_COLORS = {
  success: '#10B981',  // Brighter green for visibility
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',  // Brighter blue for contrast
};

// Error banners use layered red
backgroundColor: '#FEF2F2',  // Light red background
borderColor: '#FECACA',       // Medium red border
color: '#991B1B',             // Dark red text
```

## Typography Scale

The app uses system fonts only — no custom font loading. Weight is specified as string values per React Native convention.

| Role | Size | Weight | Color | Usage |
|------|------|--------|-------|-------|
| Page title | 24-28px | `'bold'` | `Colors.text.primary` | Screen headers |
| Section heading | 16-20px | `'600'` | `Colors.text.primary` | Card titles, section labels |
| Body | 14-16px | `'400'`-`'500'` | `Colors.text.primary` | Main content |
| Small / Caption | 12-13px | `'500'` | `Colors.text.muted` | Timestamps, hints, badges |
| Tab label | 11px | `'600'` | `Colors.navy` (active) | Bottom tab bar |

```typescript
// Title
{ fontSize: 24, fontWeight: 'bold', color: Colors.text.primary }

// Section header
{ fontSize: 16, fontWeight: '600', color: Colors.text.primary }

// Body
{ fontSize: 14, fontWeight: '400', color: Colors.text.primary, lineHeight: 20 }

// Caption
{ fontSize: 12, fontWeight: '500', color: Colors.text.muted, lineHeight: 18 }
```

### WARNING: Font Weight as Numbers

**The Problem:**

```typescript
// BAD — numeric fontWeight causes inconsistencies on Android
{ fontWeight: 600 }
```

**Why This Breaks:** React Native on Android may not map numeric weights correctly. Some devices ignore intermediate weights entirely.

**The Fix:**

```typescript
// GOOD — string fontWeight is reliable cross-platform
{ fontWeight: '600' }
```

## Visual Identity

What makes EBC Connect visually distinctive:

1. **Navy-cream contrast** — Dark navy text on warm white backgrounds, not stark black-on-white
2. **Gold accents** — Brand gold for premium/highlight elements, used sparingly
3. **Soft shadows** — Low opacity (0.04-0.1), never harsh drop shadows
4. **Warm neutrals** — `#F5F1EB` cream instead of cold `#F3F4F6` gray
5. **Purple action color** — `#7C3AED` for primary buttons and interactive elements (distinct from the navy brand)

### WARNING: Generic AI Aesthetics

NEVER introduce:
- Cold gray backgrounds (`#F3F4F6`, `#F9FAFB`) — use the warm `Colors.cream` and `Colors.warmWhite`
- Inter/Roboto/SF Pro references — the app uses system fonts, no custom fonts
- Blue-purple gradients — the app uses flat colors, no gradients anywhere
- Rounded-everything (borderRadius: 9999) — the app uses deliberate radius scale (8/12/16)

## Semantic Color Usage

### DO: Use Tokens for Intent

```typescript
// GOOD — semantic meaning is clear
color: Colors.status.error        // This text communicates an error
backgroundColor: Colors.background.elevated  // This surface is raised
```

### DON'T: Use Brand Colors for Semantics

```typescript
// BAD — navy doesn't mean "error" or "success"
color: Colors.navy  // Is this a link? A title? An action?
```

Reserve `Colors.navy` for brand moments: active tabs, primary navigation, logo-adjacent elements. Use `Colors.text.primary` for general dark text even though it's the same hex — the semantic name matters for maintainability.

## Dark Mode Status

The app does **not** implement dark mode. All color tokens assume a light theme. If dark mode is added later:

1. Convert `Colors` to a function or hook that reads theme preference
2. Create a `darkColors` object mirroring the same token structure
3. Every screen already references `Colors.*` tokens — the migration path is clean

Do NOT add dark mode handling to individual screens. The token system makes this a single-point-of-change when the time comes.
