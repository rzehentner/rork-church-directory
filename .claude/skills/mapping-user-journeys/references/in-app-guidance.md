# In-App Guidance Reference

## Contents
- Empty State Patterns
- Toast Notification System
- Error Feedback Patterns
- Role-Based UI Gating
- Loading State Coverage
- Anti-Patterns

## Empty State Patterns

Empty states are the primary in-app guidance mechanism. They tell users what a screen does and how to get started. Coverage varies significantly across screens:

### Screens WITH Empty States

```typescript
// app/notifications.tsx — good empty state pattern
const renderEmptyState = () => (
  <View style={styles.emptyState}>
    <Bell size={48} color={Colors.steelBlue} />
    <Text style={styles.emptyTitle}>No notifications</Text>
    <Text style={styles.emptySubtitle}>
      You will see notifications about events and announcements here
    </Text>
  </View>
);
```

```typescript
// app/(tabs)/events.tsx — contextual empty state
<View style={styles.emptyState}>
  <CalendarX size={40} color={Colors.steelBlue} />
  <Text style={styles.emptyTitle}>
    {selectedDate ? `No events on ${format(selectedDate, 'MMM d')}` : 'No upcoming events'}
  </Text>
  <Text style={styles.emptySubtitle}>
    Create or join a family to see events targeting your tags
  </Text>
</View>
```

### WARNING: Screens MISSING Empty States

**The Problem:** Several screens render blank lists with no guidance:

| Screen | Missing Empty State | Impact |
|--------|-------------------|--------|
| `forms.tsx` | No message when no forms exist | Users think the feature is broken |
| `activity.tsx` | No explicit empty component | New users see a blank Activity tab |
| `family.tsx` (members list) | No empty state after family creation with 0 members | Confusing blank area |

**The Fix:** Every `FlatList` must have a `ListEmptyComponent`:

```typescript
// GOOD — all empty states follow this pattern
<FlatList
  data={items}
  ListEmptyComponent={
    <View style={styles.emptyState}>
      <IconComponent size={40} color={Colors.steelBlue} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{guidance}</Text>
      {canCreate && (
        <TouchableOpacity onPress={handleCreate}>
          <Text style={styles.ctaText}>Create One</Text>
        </TouchableOpacity>
      )}
    </View>
  }
/>
```

## Toast Notification System

The toast system (`hooks/toast-context.tsx`, `components/Toast.tsx`) provides transient feedback. It supports four types with deduplication:

```typescript
// hooks/toast-context.tsx — toast types
showSuccess('Event created successfully');
showError('Failed to save changes');
showWarning('You are offline');
showInfo('New announcement posted');
```

**Key behaviors:**
- Toasts auto-dismiss after a configurable duration
- Deduplication: same type + message won't stack
- Network status monitoring triggers offline warning (native only)
- 200-character message limit (longer messages silently drop)

### DO: Use Toasts for Non-Blocking Feedback

```typescript
// GOOD — success toast after background operation
const handleRSVP = async () => {
  await rsvpEvent(eventId, userId, 'going');
  showSuccess('RSVP confirmed!');
};
```

### DON'T: Use Alert.alert for Success Messages

```typescript
// BAD — blocks user interaction for a success message
Alert.alert('Success', 'Your profile has been saved!');
// User must tap OK before they can do anything
```

**Exception:** Use `Alert.alert` for destructive action confirmations (delete, sign out) where blocking is intentional.

## Error Feedback Patterns

The app uses two error feedback mechanisms based on platform:

```typescript
// Pattern 1: Alert.alert (native) — used throughout
Alert.alert('Error', 'Please enter your first and last name');
Alert.alert('Upload Failed', error.message);

// Pattern 2: Confirmation dialogs for destructive actions
Alert.alert(
  'Delete Prayer Request',
  'Are you sure? This cannot be undone.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: handleDelete },
  ]
);
```

### WARNING: No Web-Specific Error Handling

**The Problem:** `Alert.alert` works on native but shows browser `window.alert()` on web, which is jarring and non-brandable.

**Why This Breaks:**
1. Web users see unstyled browser dialogs
2. No way to include icons, branded colors, or custom buttons on web
3. Confirmation dialogs lose their destructive styling on web

**The Fix:** Use the existing Toast system for non-blocking errors, and build a modal-based confirmation for destructive actions on web:

```typescript
// GOOD — platform-aware error feedback
if (Platform.OS === 'web') {
  showError('Please enter your first and last name');
} else {
  Alert.alert('Error', 'Please enter your first and last name');
}
```

## Role-Based UI Gating

Screens conditionally render features based on role. This acts as implicit guidance — users only see what they can do:

```typescript
// app/(tabs)/prayers.tsx — admin-only bulk actions
{isAdminOrLeader && (
  <TouchableOpacity onPress={() => setIsSelectMode(!isSelectMode)}>
    <Text>Select</Text>
  </TouchableOpacity>
)}

// app/(tabs)/events.tsx — create button for staff only
{isAdminOrLeader && (
  <TouchableOpacity onPress={() => router.push('/create-event')}>
    <Plus size={24} color={Colors.navy} />
  </TouchableOpacity>
)}
```

**Guidance gap:** Members see no explanation of why they can't create events or manage prayers. A brief tooltip or info icon explaining role permissions would reduce confusion.

## Loading State Coverage

The app uses two loading patterns: `Skeleton` components and `ActivityIndicator`:

```typescript
// components/Skeleton.tsx — reusable loading placeholders
// Variants: Skeleton (generic), TagSkeleton, PersonCardSkeleton, TagPickerSkeleton
<Skeleton width={44} height={44} borderRadius={12} />

// Dashboard uses custom QuickActionsSkeleton
{isLoading && <QuickActionsSkeleton />}
```

| Screen | Loading Pattern | Coverage |
|--------|----------------|----------|
| Dashboard | Skeleton grid | Quick actions only; stats load separately |
| Events | RefreshControl spinner | No skeleton for initial load |
| Prayers | ActivityIndicator | Minimal — no skeleton placeholders |
| Directory | ActivityIndicator | No skeleton for member cards |
| Settings | ActivityIndicator | Role/account section only |

### DO: Use Skeletons for Content-Heavy Screens

```typescript
// GOOD — skeleton matches final layout shape
{isLoading ? (
  <PersonCardSkeleton />
) : (
  <PersonCard person={person} />
)}
```

### DON'T: Show Blank Screens During Load

```typescript
// BAD — user sees nothing while data loads
if (isLoading) return null;
```

## Guidance Audit Checklist

Copy this checklist and track progress:
- [ ] Every FlatList has a ListEmptyComponent with icon + title + subtitle
- [ ] Success feedback uses Toast, not Alert.alert
- [ ] Destructive actions use confirmation dialogs
- [ ] Web error handling avoids raw Alert.alert
- [ ] Loading states use Skeleton for content-shaped placeholders
- [ ] Role-gated features explain why they're hidden (or don't show at all)
- [ ] Toast messages stay under 200 characters
- [ ] Offline state shows a persistent warning banner
