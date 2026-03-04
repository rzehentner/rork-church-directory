# In-App Guidance Scoping

## Contents
- Guidance Surfaces in EBC Connect
- Scoping Guidance Features
- Empty State Patterns
- Role-Based Messaging
- Anti-Patterns

## Guidance Surfaces in EBC Connect

The app has four existing guidance mechanisms:

### 1. Toast Notifications

```typescript
// hooks/toast-context.tsx - 4 types
showToast('success', 'Event created successfully');
showToast('error', 'Failed to update RSVP');
showToast('warning', 'You are offline');
showToast('info', 'Pull down to refresh');
```

### 2. Pending User Banners

```typescript
// app/(tabs)/dashboard.tsx
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={20} color={Colors.status.warning} />
    <Text>Your account is pending approval by a church administrator</Text>
  </View>
)}
```

### 3. Empty States

Every list screen has an empty state with icon + message + CTA:

```typescript
// Pattern: icon → title → subtitle → action button
<View style={styles.emptyState}>
  <CalendarDays size={48} color={Colors.text.tertiary} />
  <Text style={styles.emptyTitle}>No upcoming events</Text>
  <Text style={styles.emptySubtitle}>Check back later for new events</Text>
</View>
```

### 4. Confirmation Dialogs

```typescript
// components/Toast.tsx exports ConfirmationDialog
<ConfirmationDialog
  visible={showConfirm}
  title="Delete Prayer Request"
  message="Are you sure? This cannot be undone."
  confirmText="Delete"
  confirmColor={Colors.status.error}
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
/>
```

## Scoping Guidance Features

### DO: Scope Guidance Per Screen, Not Globally

```markdown
Feature: First-Run Guidance for Events Screen
├── Slice 1: Empty state with "Create your first event" CTA (leader/admin)
├── Slice 2: Calendar usage hint (first time seeing calendar picker)
├── Slice 3: RSVP explanation tooltip on first event card
```

Each slice is a small change to one screen file + its styles.

### DON'T: Scope a Global Tutorial System

```markdown
# BAD - Massive scope, low ROI
Feature: "App-wide tutorial system"
- Tutorial overlay framework
- Step-by-step walkthrough engine
- Progress tracking across sessions
- Skip/resume capability
```

**Why this breaks:** Church app users are not power users needing a tutorial framework. Simple contextual hints per screen are more effective and 10x less work.

## Empty State Patterns

### Scope Empty States as Required Criteria

Every list screen MUST have an empty state. Include it in the MVP slice, not as a follow-up:

```markdown
## Acceptance Criteria for [Feature] List Screen
- [ ] Loading state: Skeleton placeholders while fetching
- [ ] Empty state: Icon + title + subtitle + CTA (if user has create permission)
- [ ] Error state: Error message + "Retry" button
- [ ] Data state: Scrollable list with pull-to-refresh
```

### Empty State by Role

The same screen needs different empty states per role:

```typescript
// Scoping template for role-aware empty states
// Member sees:
"No events yet. Check back soon!"

// Leader/Admin sees:
"No events yet. Create your first event."
// + TouchableOpacity → router.push('/create-event')
```

**Acceptance criteria:**

```markdown
- [ ] Member empty state: Passive message, no create CTA
- [ ] Leader/Admin empty state: Active message with create CTA
- [ ] Pending user empty state: "Account pending approval" message
```

## Role-Based Messaging

### Permission Denied Patterns

The admin screen already handles unauthorized access:

```typescript
// app/(tabs)/admin.tsx
if (!isAdmin) {
  return (
    <View style={styles.permissionDenied}>
      <Shield size={48} color={Colors.text.tertiary} />
      <Text>You don't have permission to access this page</Text>
    </View>
  );
}
```

**Scope permission messaging as a standard criterion:**

```markdown
- [ ] Unauthorized users see permission-denied view (not a blank screen)
- [ ] Permission view shows relevant icon + explanation
- [ ] No "back" button needed — user navigates away via tab bar
```

### Contextual Status Indicators

The app uses status badges throughout:

```typescript
// Event status
<TagPill label="Upcoming" color={Colors.status.success} />
<TagPill label="Past Event" color={Colors.text.tertiary} />

// Prayer status tabs
['Open', 'Answered', 'Archived']

// User role badges
<View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
  <Text>{role}</Text>
</View>
```

**When scoping a feature with statuses, always define the full status set upfront:**

```markdown
- [ ] Define all possible statuses: [list them]
- [ ] Each status has a color from Colors.status or Colors.text
- [ ] Status transitions are defined (which status can move to which)
- [ ] UI updates optimistically on status change
```

## Scoping Guidance Checklist

```markdown
- [ ] Empty state defined for zero-data scenario
- [ ] Loading state uses Skeleton component
- [ ] Error state has retry capability
- [ ] Permission-denied state for unauthorized roles
- [ ] Toast messages defined for success/error on mutations
- [ ] Confirmation dialog for destructive actions
- [ ] Offline state shows warning toast (via NetInfo)
```

## Anti-Patterns

### WARNING: Scoping Modals for Simple Messages

**The Problem:** Using modals for information that should be inline.

```typescript
// BAD - Modal for a simple status message
<Modal visible={showInfo}>
  <Text>Your account is pending approval</Text>
  <Button title="OK" onPress={() => setShowInfo(false)} />
</Modal>
```

**Why This Breaks:** Modals interrupt flow and require dismissal. For status information the user didn't request, inline banners are less disruptive. The codebase already uses the banner pattern on the dashboard.

**The Fix:** Use inline banners for persistent status, toasts for transient feedback, and modals only for required user decisions (confirmations, form inputs).

### WARNING: Scoping Guidance Without Platform Checks

**The Problem:** Scoping a feature like "show tooltip on long press" without considering web.

**Why This Breaks:** Long press doesn't exist on web. `Platform.OS === 'web'` needs a hover-based alternative. Forgetting this doubles scope during implementation.

**The Fix:** Add platform criteria:

```markdown
- [ ] Native: Long-press shows tooltip/context menu
- [ ] Web: Hover shows tooltip, or click opens popover
```

See the **frontend-design** skill for component styling patterns.
See the **lucide-react-native** skill for choosing icons in guidance UIs.
