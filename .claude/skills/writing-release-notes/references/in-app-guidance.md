# In-App Guidance Reference

## Contents
- Guidance Surfaces in EBC Connect
- Toast Notification System
- Empty State Patterns
- Status Banners and Notices
- Confirmation Dialogs
- Swipe Hints
- Writing Release Notes for Guidance Changes
- DO/DON'T Patterns

## Guidance Surfaces in EBC Connect

The app communicates with users through five mechanisms: **toasts**, **empty states**, **status banners**, **confirmation dialogs**, and **inline hints**. Release notes about UX improvements should reference which mechanism changed and what the user now sees differently.

## Toast Notification System

Toasts are the primary feedback channel for mutations. Four types with distinct colors:

```typescript
// hooks/toast-context.tsx — toast API
showSuccess('Prayer request created');
showError('Failed to update event');
showWarning('You are offline. Some features may not work properly.');
showInfo('Announcement published');
```

Toasts auto-dismiss (4s default, 6s for errors), animate from the top, and deduplicate identical messages. They can carry an action button:

```typescript
showInfo('Event added to calendar', {
  action: { label: 'View', onPress: () => router.push('/event-detail') }
});
```

When writing release notes that mention feedback improvements, say "you'll see a confirmation" not "added toast notification."

## Empty State Patterns

Each feature screen has contextual empty states with an icon, title, and helpful subtext:

```typescript
// app/(tabs)/events.tsx — empty state
<CalendarIcon size={48} color="#9CA3AF" />
<Text style={styles.emptyText}>
  {viewMode === 'upcoming' ? 'No upcoming events' : `No events on ${date}`}
</Text>
<Text style={styles.emptySubtext}>
  {viewMode === 'upcoming' ? 'Check back later for new events' : 'Try selecting a different date'}
</Text>
```

```typescript
// app/(tabs)/prayers.tsx — role-gated empty state
if (myRole === 'pending') {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        Become a member to participate in the prayer list
      </Text>
    </View>
  );
}
```

Release notes about empty state changes fall under "UI improvements" — describe the improved guidance without quoting the exact copy.

## Status Banners and Notices

Two banner patterns communicate account status:

**Dashboard pending banner** (amber, top of screen):
```typescript
// app/(tabs)/dashboard.tsx
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={18} color="#D97706" />
    <Text>Your account is pending approval from church leadership</Text>
  </View>
)}
```

**Visitor profile notice** (amber, inline):
```typescript
// app/visitor-profile.tsx
<View style={styles.pendingNotice}>
  <AlertCircle size={20} color="#F59E0B" />
  <Text>Your account is pending approval. You can complete your profile
    and join a family while waiting for approval.</Text>
</View>
```

**Error banner with retry** (red, dismissible):
```typescript
// app/(tabs)/dashboard.tsx
{error && (
  <View style={styles.errorBanner}>
    <Text>Something went wrong loading your dashboard</Text>
    <TouchableOpacity onPress={refetch}><Text>Retry</Text></TouchableOpacity>
  </View>
)}
```

Release notes generally should not mention error handling improvements unless the old behavior was visibly broken.

## Confirmation Dialogs

The `useConfirmation` hook provides cross-platform confirmations:

```typescript
// components/Toast.tsx — useConfirmation
// Native: Alert.alert with Cancel/Confirm buttons
// Web: Custom Modal with the same button layout
const { confirm } = useConfirmation();
const shouldDelete = await confirm(
  'Delete Event',
  'This action cannot be undone. Are you sure?'
);
```

Release notes for destructive action changes should mention the confirmation step: "You'll be asked to confirm before deleting."

## Swipe Hints

The admin announcements list uses inline text hints for discoverability:

```typescript
// app/(tabs)/admin.tsx — swipe hint on unswipped cards
<Text style={styles.swipeHint}>← Swipe left for actions</Text>
```

When adding gesture-based interactions, release notes should describe the gesture and what it reveals: "Swipe left on any announcement to edit, unpublish, or delete."

## Writing Release Notes for Guidance Changes

Guidance changes are usually "quality of life" improvements. Group them under a clear heading:

```markdown
**Improvements**
- Clearer messages when your account is being set up
- Better guidance when no events are scheduled
- Confirmation step before deleting content
```

Avoid listing every copy change individually — batch them into a single bullet about "improved messaging" or "clearer feedback."

## DO/DON'T Patterns

### DO: Describe the user experience, not the component

```markdown
// GOOD
- You'll see a confirmation before deleting events or announcements

// BAD
- Added useConfirmation hook to delete flows
```

### DON'T: List copy changes verbatim

```markdown
// BAD — too granular for release notes
- Changed empty state text from "No items" to "No upcoming events"
- Updated toast message from "Saved" to "Prayer request created"
```

### DO: Mention new offline behavior

```markdown
// GOOD — users care about this
- The app now tells you when you're offline so you know why things aren't loading
```

### DON'T: Frame error handling as a feature unless it was previously broken

```markdown
// BAD — implies the app was broken before (even if true)
- Fixed crash when loading dashboard fails

// GOOD — frames it as an improvement
- Smoother recovery when network issues occur
```

### DO: Call out gesture discoverability

```markdown
// GOOD — teaches users a new interaction
- Tip: swipe left on announcements in Admin to see quick actions
```

See the **designing-inapp-guidance** skill for patterns on building these surfaces. See the **frontend-design** skill for styling conventions used in banners and toasts.
