# In-App Guidance Reference

## Contents
- Toast System
- Confirmation Dialogs
- Empty State Anatomy
- Error Communication
- Loading States
- Form Validation Feedback
- Help Text and Placeholders
- WARNING: Missing Tooltip Component

## Toast System

All transient feedback uses `components/Toast.tsx` via the `useToast()` hook from `hooks/toast-context.tsx`.

```tsx
// hooks/toast-context.tsx — four toast types
const showToast = useCallback((
  type: 'success' | 'error' | 'warning' | 'info',
  message: string,
  options?: { duration?: number; actionText?: string; onAction?: () => void }
) => { ... }, []);

// Shorthand helpers
showSuccess('Event created');
showError('Failed to load data');
showWarning('You are offline. Some features may not work properly.');
```

**Duration rules:** Success/info = 4000ms. Errors = 6000ms. Toasts with `actionText` stay longer.

**Platform handling:** Toast positions itself 50px from top on iOS (status bar), 20px on Android.

### DO: Use specific, actionable error messages

```tsx
// GOOD — tells user exactly what's wrong
showToast('error', 'Please enter an event title');
showToast('error', '"Category" is required');

// BAD — vague, unhelpful
showToast('error', 'Validation failed');
showToast('error', 'Something went wrong');
```

### DON'T: Show toasts for state that needs to persist

Toasts auto-dismiss. If the user needs to see a message after scrolling or navigating, use an inline banner instead.

## Confirmation Dialogs

Destructive actions use `Alert.alert` on native and a custom `ConfirmationDialog` modal on web.

```tsx
// components/Toast.tsx — useConfirmation hook
const { confirm } = useConfirmation();

// Usage pattern for destructive actions
Alert.alert(
  'Delete Family',                           // title
  'Are you sure? Members with accounts will be unassigned. This cannot be undone.',  // body
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: handleDelete },
  ]
);
```

### DO: Explain consequences in the confirmation body

"Members with user accounts will be unassigned from this family" tells the user exactly what will happen. Generic "Are you sure?" dialogs don't help users make informed decisions.

### DON'T: Use confirmation dialogs for non-destructive actions

Don't confirm "Save", "Submit", or "Create". Only confirm actions that are hard to undo (delete, sign out, bulk status change).

## Empty State Anatomy

Every empty state follows a three-layer structure: **icon + title + subtitle**, with an optional CTA.

```tsx
// Standard empty state structure
<View style={styles.emptyContainer}>
  {/* Layer 1: Visual anchor */}
  <CalendarIcon size={48} color="#9CA3AF" />

  {/* Layer 2: What's empty */}
  <Text style={styles.emptyTitle}>No upcoming events</Text>

  {/* Layer 3: What to do about it */}
  <Text style={styles.emptySubtext}>Check back later for new events</Text>

  {/* Layer 4 (optional): Action button */}
  {canCreate && (
    <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreate}>
      <Plus size={16} color="#7C3AED" />
      <Text style={styles.emptyCreateButtonText}>Create Event</Text>
    </TouchableOpacity>
  )}
</View>
```

### DO: Tailor empty state copy to context

```tsx
// GOOD — different messages based on active filters
{searchQuery
  ? 'No matching announcements — try adjusting your search'
  : isAdmin
    ? 'Create your first announcement to get started'
    : 'Check back later for updates'}

// BAD — generic message regardless of context
'No data found'
```

### DON'T: Leave empty states without a next step

Every empty state should answer "what now?" — either "check back later", "try a different filter", or "create the first item".

## Error Communication

Errors use two patterns: inline banners (data still partially available) and full-screen error states (complete failure).

```tsx
// Inline error banner with retry — events.tsx pattern
{error && (
  <View style={styles.errorBanner}>
    <AlertCircle size={18} color="#EF4444" />
    <Text style={styles.errorBannerText}>{error}</Text>
    <TouchableOpacity onPress={loadAllEvents} style={styles.retryButton}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </TouchableOpacity>
  </View>
)}

// Full-screen error — announcements.tsx pattern
<View style={styles.errorContainer}>
  <AlertCircle size={48} color="#EF4444" />
  <Text style={styles.errorTitle}>Failed to load announcements</Text>
  <TouchableOpacity onPress={refetch}>
    <Text>Try Again</Text>
  </TouchableOpacity>
</View>
```

### DO: Always provide a retry action on fetch errors

Network failures are transient. A retry button costs nothing and prevents users from force-quitting the app.

## Loading States

Two patterns: `ActivityIndicator` for simple loading, `Skeleton` for content-shaped placeholders.

```tsx
// Simple loading — prayers.tsx
{isLoading ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#7C3AED" />
  </View>
) : /* content */}

// Skeleton loading — dashboard.tsx
const QuickActionsSkeleton = () => (
  <View style={styles.quickActionsGrid}>
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={`qa-skel-${i}`} style={styles.quickActionCard}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <Skeleton width={70} height={14} borderRadius={4} />
      </View>
    ))}
  </View>
);
```

### DO: Use Skeleton components for content with a known layout

Dashboard quick actions always have 6 tiles. Skeletons that match the final layout prevent layout shift.

### DON'T: Use skeletons for unpredictable content

If you don't know how many items will appear, use a centered `ActivityIndicator`. A skeleton with 5 rows that resolves to 1 item is misleading.

## Form Validation Feedback

Validation errors surface through `showToast('error', ...)` before submission.

```tsx
// app/create-event.tsx — sequential field validation
if (!title.trim()) {
  showToast('error', 'Please enter an event title');
  return;
}
if (!startDate || !endDate) {
  showToast('error', 'Please select start and end dates');
  return;
}
if (startDate >= endDate) {
  showToast('error', 'End date must be after start date');
  return;
}
```

```tsx
// app/signup-form.tsx — dynamic required field validation
const requiredCustom = customFields.filter(f => f.is_required);
for (const field of requiredCustom) {
  const val = fieldValues[field.field_key];
  if (!val || !val.trim()) {
    showToast('error', `"${field.field_label}" is required`);
    return;
  }
}
```

### DO: Validate one field at a time with a specific message

Show the first error, fix it, then surface the next. Dumping all errors at once overwhelms users.

## Help Text and Placeholders

Placeholder text provides hints before user input. Help text provides persistent guidance below fields.

```tsx
// app/visitor-profile.tsx — avatar help text
<Text style={styles.avatarHelp}>
  Add a photo so your church family can recognize you
</Text>

// app/(tabs)/family.tsx — token sharing help
<Text style={styles.tokenHelp}>
  Share this token with family members to let them join
</Text>

// app/create-prayer.tsx — example placeholder
<TextInput placeholder="e.g., Surgery tomorrow" placeholderTextColor="#9CA3AF" />
<TextInput placeholder="Add more context about this prayer request..." />
```

### DO: Use example-based placeholders for open-ended fields

"e.g., Surgery tomorrow" is clearer than "Enter subject". Show the user what good input looks like.

## WARNING: Missing Tooltip Component

**The Problem:** No tooltip or popover component exists. Complex fields (role permissions, tag filtering, family tokens) lack inline explanations.

**Why This Breaks:**
1. Users encounter unfamiliar concepts (tags, family tokens, RSVP) with no inline help
2. Settings descriptions are limited to one line of subtitle text
3. No way to provide contextual help without navigating to a separate screen

**The Fix:** Build a lightweight tooltip using `Modal` with absolute positioning. See the **react-native** skill for Modal patterns. Use `expo-blur` (already installed) for a backdrop effect.

```tsx
// Proposed tooltip pattern
function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setIsVisible(true)}>
        {children}
        <HelpCircle size={14} color="#9CA3AF" />
      </TouchableOpacity>
      <Modal transparent visible={isVisible} onRequestClose={() => setIsVisible(false)}>
        <TouchableOpacity style={styles.tooltipOverlay} onPress={() => setIsVisible(false)}>
          <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>{content}</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
```
