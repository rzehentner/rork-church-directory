# Layouts Reference

## Contents
- Screen Structure
- Spacing Scale
- Header Pattern
- Scroll Patterns
- Tab Navigation
- Modal Layouts
- Flexbox Conventions
- Content Constraints

## Screen Structure

Every screen follows this vertical stack:

```
┌─────────────────────────┐
│  Header (fixed)         │  ← White bg, border-bottom, 20px horizontal padding
├─────────────────────────┤
│  Filter bar (optional)  │  ← Horizontal scroll of pills/tabs
├─────────────────────────┤
│  Content (scrollable)   │  ← FlatList or ScrollView, 16-20px padding
│                         │
│                         │
├─────────────────────────┤
│  Floating action (opt)  │  ← Absolute positioned, bottom: 24
├─────────────────────────┤
│  Tab bar (fixed)        │  ← System tab bar from Expo Router
└─────────────────────────┘
```

```typescript
// Screen container — always flex: 1 with warm background
container: {
  flex: 1,
  backgroundColor: Colors.background.primary,  // #FAFAF7
},
```

## Spacing Scale

The app uses a consistent spacing scale. Do not invent intermediate values.

| Token | px | Usage |
|-------|-----|-------|
| xs | 4 | Inner padding of small elements, icon gaps |
| sm | 8 | Icon buttons, tight spacing |
| md | 12 | Gap between related items, badge padding |
| lg | 16 | Card padding, list item spacing, standard gap |
| xl | 20 | Screen horizontal padding (universal) |
| 2xl | 24 | Section spacing, modal padding |
| 3xl | 32 | Large section gaps |
| 4xl | 64 | Empty state vertical padding |

### WARNING: Inconsistent Spacing

**The Problem:**

```typescript
// BAD — arbitrary values outside the scale
{ padding: 15, marginBottom: 18, gap: 7 }
```

**Why This Breaks:** Inconsistent spacing creates visual noise. Elements don't align with each other, the rhythm feels "off" even if users can't articulate why.

**The Fix:**

```typescript
// GOOD — stick to the scale
{ padding: 16, marginBottom: 16, gap: 8 }
```

## Header Pattern

Every screen uses the same header structure:

```typescript
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  backgroundColor: Colors.background.card,
  borderBottomWidth: 1,
  borderBottomColor: Colors.border.light,
},

// Left side: back button + title
headerLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
},

// Title
title: {
  fontSize: 24,
  fontWeight: 'bold',
  color: Colors.text.primary,
},
```

### Header Icon Buttons

```typescript
// Consistent icon button in headers
headerIconButton: {
  padding: 8,
  borderRadius: 8,
  backgroundColor: '#F3F4F6',
},
```

See the **lucide-react-native** skill for icon sizing (typically 20-24px in headers).

## Scroll Patterns

### FlatList with Pull-to-Refresh

```typescript
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={item => item.id}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  }
  contentContainerStyle={{
    padding: 16,
    paddingBottom: 100,  // Space for floating button + tab bar
  }}
  ListEmptyComponent={<EmptyState />}
/>
```

### ScrollView for Forms

```typescript
<ScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{
    padding: 20,
    paddingBottom: 40,
  }}
  keyboardShouldPersistTaps="handled"  // Allow tapping buttons while keyboard open
>
```

### WARNING: Missing Bottom Padding

**The Problem:**

```typescript
// BAD — content hidden behind tab bar and floating buttons
contentContainerStyle={{ padding: 16 }}
```

**Why This Breaks:** The last items in a list get obscured by the tab bar (height ~50px) and any floating action button (height ~56px + 24px offset).

**The Fix:**

```typescript
// GOOD — generous bottom padding
contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
```

## Tab Navigation

Defined in `app/(tabs)/_layout.tsx`. See the **expo-router** skill for route configuration.

```typescript
tabBarStyle: {
  backgroundColor: Colors.white,
  borderTopWidth: 1,
  borderTopColor: Colors.border.light,
  paddingBottom: 4,
  paddingTop: 4,
},
tabBarLabelStyle: {
  fontSize: 11,
  fontWeight: '600',
},
tabBarActiveTintColor: Colors.navy,
tabBarInactiveTintColor: Colors.steelBlue,
```

Tab visibility is role-gated — admin tab only shows for admin users. The layout reads the user's role from `usMe()` context.

## Modal Layouts

### Full-Screen Modal (Edit Forms)

```typescript
<Modal visible={visible} transparent={false} animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      {/* Close button + title + save button */}
    </View>
    <ScrollView style={styles.modalContent}>
      {/* Form fields */}
    </ScrollView>
    <View style={styles.modalFooter}>
      {/* Action buttons */}
    </View>
  </View>
</Modal>
```

### Overlay Dialog (Confirmations)

```typescript
<Modal visible={visible} transparent animationType="fade">
  <View style={styles.overlay}>
    {/* Semi-transparent black background */}
    <View style={styles.dialog}>
      {/* Centered white card */}
    </View>
  </View>
</Modal>

overlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
dialog: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  minWidth: 300,
  maxWidth: 400,
},
```

## Flexbox Conventions

### Row Layout (Horizontal)

```typescript
// Items in a row, vertically centered, spaced apart
{
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}
```

### Flexible Children

```typescript
// Left side takes remaining space, right side fixed
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <View style={{ flex: 1 }}>{/* Text that wraps */}</View>
  <TouchableOpacity>{/* Fixed-width button */}</TouchableOpacity>
</View>
```

### Gap Property

The app uses `gap` for spacing between flex children instead of margins:

```typescript
// GOOD — gap for consistent spacing
{ flexDirection: 'row', alignItems: 'center', gap: 8 }

// AVOID — margin on individual children
// child1: { marginRight: 8 }, child2: { marginRight: 8 }
```

## Content Constraints

No explicit `maxWidth` is used on screens — the app is mobile-first. For web rendering, cards and content naturally constrain via `marginHorizontal: 20` on both sides.

If a wide-screen web layout is needed later, add a container wrapper:

```typescript
contentWrapper: {
  maxWidth: 600,
  width: '100%',
  alignSelf: 'center',
},
```
