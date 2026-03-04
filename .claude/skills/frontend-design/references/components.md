# Components Reference

## Contents
- Buttons
- Cards
- Form Inputs
- Badges and Pills
- Toast Notifications
- Skeleton Loading
- Empty States
- Error States
- Confirmation Dialogs

## Buttons

Four button variants exist across the app. Match these exactly when adding new buttons.

### Primary Button

```typescript
createButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#7C3AED',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
  gap: 6,
},
createButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '600',
},
```

### Outline Button

```typescript
rsvpButton: {
  flex: 1,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#D1D5DB',
  alignItems: 'center',
},
rsvpButtonText: {
  fontSize: 14,
  color: '#6B7280',
  fontWeight: '500',
},
```

### Icon Button

```typescript
iconButton: {
  padding: 8,
  borderRadius: 8,
  backgroundColor: '#F3F4F6',
},
```

### Disabled State

Apply `opacity: 0.6` to any button variant. Pair with `disabled` prop on `TouchableOpacity`.

```typescript
<TouchableOpacity
  style={[styles.createButton, isSubmitting && { opacity: 0.6 }]}
  disabled={isSubmitting}
  onPress={handleSubmit}
>
```

### WARNING: Undersized Touch Targets

**The Problem:**

```typescript
// BAD — too small for reliable finger taps
{ padding: 4, width: 24, height: 24 }
```

**Why This Breaks:** Apple HIG requires 44x44pt minimum touch targets. Small buttons cause mis-taps and frustration on mobile.

**The Fix:**

```typescript
// GOOD — minimum 44px touch area
{ padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }
```

## Cards

### Standard Card

```typescript
card: {
  backgroundColor: Colors.background.card,
  borderRadius: 12,
  padding: 16,
  marginHorizontal: 20,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
},
```

### Selected Card

```typescript
cardSelected: {
  borderWidth: 1,
  borderColor: '#C4B5FD',
  backgroundColor: '#FAFAFE',
},
```

Apply with style array: `[styles.card, isSelected && styles.cardSelected]`

## Form Inputs

### Text Input

```typescript
formInput: {
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  color: Colors.text.primary,
  backgroundColor: Colors.background.card,
},
```

### Form Label

```typescript
formLabel: {
  fontSize: 14,
  fontWeight: '500',
  color: '#374151',
  marginBottom: 8,
},
```

### Disabled Input

```typescript
{ backgroundColor: '#F9FAFB' }  // Light gray signals read-only
```

## Badges and Pills

### Tag Pill (components/TagPill.tsx)

Used for event tags, categories, and filters. See the **lucide-react-native** skill for icons inside pills.

```typescript
pill: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
// Text is always white on colored background
pillText: {
  fontSize: 10,
  fontWeight: '500',
  color: '#FFFFFF',
},
```

Background color comes from the database (`tag.color`), with `Colors.navy` as fallback.

### Status Badge

```typescript
ownerBadge: {
  backgroundColor: '#EDE9FE',
  paddingHorizontal: 7,
  paddingVertical: 2,
  borderRadius: 10,
},
ownerBadgeText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#7C3AED',
  textTransform: 'uppercase',
},
```

## Toast Notifications

Toasts slide in from the top. The `useToast()` hook provides convenience methods. See [motion.md](motion.md) for animation details.

```typescript
// Usage in screens
const { showSuccess, showError } = useToast();

showSuccess('Event created!');
showError('Failed to save');
```

Toast container style:

```typescript
container: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 50 : 20,
  left: 16,
  right: 16,
  zIndex: 9999,
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 8,
},
```

## Skeleton Loading

Use `Skeleton` from `@/components/Skeleton` for loading states. Pre-built variants exist for common shapes.

```typescript
import { Skeleton, PersonCardSkeleton, TagSkeleton } from '@/components/Skeleton';

// Generic skeleton
<Skeleton width={200} height={16} borderRadius={4} />

// Variable-width tags for realism
<TagSkeleton count={3} />

// Person card with avatar + text lines
<PersonCardSkeleton />
```

Skeleton base color: `#E5E7EB`. Animates opacity 0.3 → 1.0 in a loop.

## Empty States

Every list screen needs an empty state. Structure: icon + title + subtitle, centered.

```typescript
emptyContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 64,
},
emptyText: {
  fontSize: 18,
  fontWeight: '600',
  color: '#4B5563',
  marginTop: 16,
},
emptySubtext: {
  fontSize: 14,
  color: Colors.text.muted,
  marginTop: 4,
},
```

Use a relevant lucide icon at size 48, color `Colors.text.muted`.

## Error States

### Error Banner (inline)

```typescript
errorBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FEF2F2',
  borderWidth: 1,
  borderColor: '#FECACA',
  borderRadius: 12,
  padding: 14,
  marginBottom: 16,
  gap: 10,
},
errorBannerText: {
  flex: 1,
  fontSize: 14,
  color: '#991B1B',
  fontWeight: '500',
},
```

### Error Full Screen

```typescript
errorContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 40,
},
```

## Confirmation Dialogs

Platform-aware: native `Alert.alert()` on iOS/Android, custom `Modal` on web.

```typescript
// Native
if (Platform.OS !== 'web') {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: handleDelete },
  ]);
}

// Web modal dialog
dialog: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  minWidth: 300,
  maxWidth: 400,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 16,
},
```
