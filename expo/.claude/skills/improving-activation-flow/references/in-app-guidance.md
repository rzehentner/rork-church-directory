# In-App Guidance Reference

## Contents
- Banner Patterns
- Empty State Patterns
- Toast System
- Confirmation Dialogs
- Skeleton Loading
- Anti-Patterns
- Guidance Checklist

## Banner Patterns

The app uses inline banners for status communication. Two patterns exist on the dashboard:

### Pending Account Banner

```typescript
// app/(tabs)/dashboard.tsx:383-388
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={18} color="#D97706" />
    <Text style={styles.pendingBannerText}>
      Your account is pending approval from church leadership
    </Text>
  </View>
)}
```

Style: amber background (`#FFFBEB`), amber border (`#FDE68A`), alert icon. This pattern
is reusable for any warning-level status banner.

### Profile Completion Card

```typescript
// app/(tabs)/dashboard.tsx:390-401
{isPending && (!person?.first_name || !person?.last_name) && (
  <TouchableOpacity style={styles.profilePromptCard}
    onPress={() => router.push('/visitor-profile')}>
    <View style={styles.profilePromptIcon}>
      <User size={20} color="#1C2E4A" />
    </View>
    <View style={styles.profilePromptContent}>
      <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
      <Text style={styles.profilePromptText}>Help your church family get to know you</Text>
    </View>
    <ChevronRight size={18} color="#94A3B8" />
  </TouchableOpacity>
)}
```

Style: white card with blue border (`#DBEAFE`), icon + title + subtitle + chevron.
This is the standard CTA card pattern for activation prompts.

### Error Banner

```typescript
// app/(tabs)/dashboard.tsx:373-381
{error && (
  <View style={styles.errorBanner}>
    <AlertCircle size={18} color="#EF4444" />
    <Text style={styles.errorBannerText}>{error}</Text>
    <TouchableOpacity onPress={onRefresh} style={styles.errorRetryButton}>
      <Text style={styles.errorRetryText}>Retry</Text>
    </TouchableOpacity>
  </View>
)}
```

Style: red background (`#FEF2F2`), red border, retry button. Use for recoverable errors.

## Empty State Patterns

Empty states appear when a feature has no data. The app uses text-only empty states:

```typescript
// Notifications screen empty state
<Text>No notifications</Text>
<Text>You will see notifications about events and announcements here</Text>

// Admin approvals empty state
<Text>No pending approvals</Text>
<Text>All users have been processed</Text>
```

### WARNING: Inconsistent Empty States

Some screens have empty states, others show nothing. Events, prayers, and directory
screens lack explicit empty states, resulting in a blank scroll area.

**The Fix:** Every list screen should include an empty state component:

```typescript
// GOOD — reusable empty state pattern
function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

See the **designing-inapp-guidance** skill for detailed empty state patterns.

## Toast System

`hooks/toast-context.tsx` provides `showSuccess`, `showError`, `showWarning`, `showInfo`:

```typescript
// Toast types with distinct durations
// Success: 4000ms auto-dismiss
// Error: 6000ms auto-dismiss (longer for readability)
// All types support action buttons with callbacks

const { showSuccess } = useToast();
showSuccess('Profile saved successfully!');
```

The toast system also monitors network connectivity and shows offline warnings
automatically via `@react-native-community/netinfo`.

## Confirmation Dialogs

Platform-aware confirmation pattern used throughout:

```typescript
// app/visitor-profile.tsx:181-193
Alert.alert(
  'Skip Profile Setup',
  'You can complete your profile later in the Family tab. Continue to the app?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', onPress: () => router.replace('/(tabs)/family') },
  ]
);
```

On web, `Alert.alert` renders as a custom Modal since native Alert is unavailable.
The toast context provides `showConfirmation()` for consistent cross-platform dialogs.

## Skeleton Loading

`components/Skeleton.tsx` provides animated loading placeholders:

```typescript
// Dashboard uses skeleton grid during data load
{isLoading ? (
  <QuickActionsSkeleton />  // 6 skeleton cards matching quick action layout
) : (
  <View style={styles.quickActionsGrid}>
    {quickActions.map(action => /* real cards */)}
  </View>
)}
```

Skeleton variants: `Skeleton` (generic), `TagSkeleton`, `PersonCardSkeleton`,
`TagPickerSkeleton`. All use a 1000ms pulsing opacity animation.

## Anti-Patterns

### WARNING: No Onboarding Tour or Tooltips

The app has zero guided tours, tooltips, or first-run hints. New users land on the
dashboard and must discover features through exploration alone.

**When You Might Be Tempted:** "Users will figure it out" works for simple apps.
A church app with 7+ features (events, prayers, directory, family, forms, announcements,
admin) needs at least contextual hints for first-time visitors.

### WARNING: Visitor Profile Has No Step Indicator

`app/visitor-profile.tsx` shows a form without indicating progress. Users don't know
if this is 1 of 1 or 1 of 5 steps.

**The Fix:** Add a step indicator at the top:

```typescript
<Text style={styles.stepIndicator}>Step 1 of 2</Text>
```

## Guidance Checklist

Copy this checklist when adding a new guidance surface:

- [ ] Step 1: Choose pattern — banner (status), card (CTA), empty state (no data), toast (feedback)
- [ ] Step 2: Match existing color semantics — amber=warning, red=error, blue=info, green=success
- [ ] Step 3: Use icons from `lucide-react-native` (see the **lucide-react-native** skill)
- [ ] Step 4: Add dismiss/completion logic — guidance should disappear when its condition is met
- [ ] Step 5: Test on both web and native (Platform-aware patterns for modals/alerts)
