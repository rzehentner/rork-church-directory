# Feedback & Insights Scoping

## Contents
- Existing Feedback Mechanisms
- Scoping Feedback Features
- User Signal Collection Patterns
- Error Feedback Patterns
- Anti-Patterns

## Existing Feedback Mechanisms

EBC Connect has three feedback channels, all transient:

### 1. Toast Notifications (Primary)

```typescript
// hooks/toast-context.tsx
const { showToast } = useToast();

// Usage across all screens:
showToast('success', 'Prayer request submitted');
showToast('error', 'Failed to update event');
showToast('warning', 'You are offline');
showToast('info', 'Refreshing data...');
```

Toast configuration:
- Auto-dismiss: 4s (error/warning) or 3s (success/info)
- Max visible: 1 at a time (queue-based)
- Position: Top of screen
- Deduplication: Same type+message suppressed

### 2. Confirmation Dialogs (Destructive Actions)

```typescript
// components/Toast.tsx exports ConfirmationDialog
// Used for: delete prayer, delete event, sign out, remove family member
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

### 3. Platform Alerts (Native Only)

```typescript
// Used in screens for web-incompatible scenarios
if (Platform.OS === 'web') {
  // Use modal or toast instead
} else {
  Alert.alert('Error', 'Something went wrong', [{ text: 'OK' }]);
}
```

## Scoping Feedback Features

### DO: Scope Feedback Inline With Features

Every mutation needs feedback criteria:

```markdown
## Feature: [Name] — Feedback Criteria
- [ ] Success: Toast with confirmation message
- [ ] Error: Toast with actionable error message (not "Something went wrong")
- [ ] Offline: Warning toast before attempting mutation
- [ ] Destructive: Confirmation dialog with explicit action name
- [ ] Loading: Disable submit button + show ActivityIndicator
```

### DON'T: Scope a Generic "Error Handling System"

```markdown
# BAD - Over-engineered for this app's scale
Feature: "Global Error Boundary System"
- Error boundary per route
- Error reporting service
- Retry queue for failed mutations
- Offline mutation queue
```

**Why this breaks:** EBC Connect serves a single church community (~hundreds of users). Enterprise-grade error infrastructure adds complexity without proportional benefit. Per-screen try/catch with toasts is the right level.

## User Signal Collection Patterns

### Pattern: Admin Approval as Feedback Loop

The admin approval flow is the app's strongest feedback mechanism:

```typescript
// app/(tabs)/admin.tsx — Approvals tab
// Admin sees: pending user name, email, signup date
// Actions: Approve (→ member) or Reject (→ deleted)
```

**Scope approval enhancements as feedback features:**

```markdown
Feature: Approval Feedback
├── Slice 1 (MVP): Approved user gets push notification
├── Slice 2: Rejection includes reason message
├── Slice 3: Pending user sees estimated wait time on dashboard
```

### Pattern: Prayer "Prayed" Count as Social Proof

The prayer feature uses prayer counts as implicit feedback:

```typescript
// services/prayer.ts
export async function markPrayed(prayerRequestId: string) {
  await supabase.rpc('mark_prayed', { p_prayer_request_id: prayerRequestId });
}

// Screen shows: "12 people prayed" on each prayer card
```

**Scope similar social proof for other features:**

```markdown
Feature: Event Attendance Count
- [ ] Show RSVP count on event cards ("15 going")
- [ ] Count updates optimistically on RSVP
- [ ] Count visible to all authenticated users
```

### Pattern: Form Responses as User Insights

Signup forms collect structured user input:

```typescript
// services/signup-forms.ts
export async function submitSignupResponse(formId: string, responses: FormResponse[]) {
  await supabase.rpc('submit_signup_response', { ... });
}
```

**Scope response viewing as an admin insight tool:**

```markdown
Feature: Signup Response Dashboard
- [ ] Admin sees response count per form
- [ ] Admin can view individual responses
- [ ] Export responses (future slice)
```

## Error Feedback Patterns

### Standard Error Flow

Every service call follows this pattern:

```typescript
// Screen-level error handling (consistent across app)
try {
  await serviceFunction(params);
  showToast('success', 'Action completed');
} catch (error) {
  console.error('Context for debugging:', error);
  showToast('error', 'User-friendly error message');
}
```

**Scope error messages as acceptance criteria:**

```markdown
- [ ] Network error: "Unable to connect. Check your internet connection."
- [ ] Permission error: "You don't have permission to [action]."
- [ ] Validation error: "[Field] is required." (inline, not toast)
- [ ] Server error: "Something went wrong. Please try again."
- [ ] Not found: "This [item] no longer exists."
```

### Offline Awareness

The toast context monitors network status:

```typescript
// hooks/toast-context.tsx
import NetInfo from '@react-native-community/netinfo';

// Shows warning toast when offline
// Shows success toast when back online
```

**Scope offline behavior per feature:**

```markdown
- [ ] List screens: Show cached data with "offline" indicator
- [ ] Create/edit forms: Disable submit with offline warning
- [ ] Detail screens: Show cached data if available, error if not
```

## Scoping Feedback Checklist

```markdown
- [ ] Success toast message defined for each mutation
- [ ] Error toast message defined (user-friendly, not technical)
- [ ] Confirmation dialog for destructive actions (delete, leave, remove)
- [ ] Loading state on submit buttons (disable + spinner)
- [ ] Inline validation for form fields (not just toast)
- [ ] Offline state handled (toast warning, submit disabled)
- [ ] Platform check: Alert.alert on native, modal on web
```

## Anti-Patterns

### WARNING: Showing Technical Errors to Users

**The Problem:**

```typescript
// BAD - raw error message shown to user
catch (error) {
  showToast('error', error.message);
  // User sees: "relation 'events' does not exist" or "JWT expired"
}
```

**Why This Breaks:** Technical error messages confuse users, expose system internals, and provide no actionable guidance.

**The Fix:**

```typescript
// GOOD - user-friendly message, technical detail logged
catch (error) {
  console.error('Failed to create event:', error);
  showToast('error', 'Unable to create event. Please try again.');
}
```

### WARNING: Scoping Feedback Without Platform Splits

**The Problem:** Scoping "show confirmation alert" without checking Platform.OS.

```typescript
// This crashes on web
Alert.alert('Confirm', 'Delete this item?', [
  { text: 'Cancel' },
  { text: 'Delete', onPress: handleDelete },
]);
```

**Why This Breaks:** `Alert.alert` is native-only. On web, use the existing `ConfirmationDialog` component.

**The Fix:** Always scope both platforms:

```markdown
- [ ] Native: Alert.alert for simple confirmations
- [ ] Web: ConfirmationDialog component (components/Toast.tsx)
- [ ] OR: Use ConfirmationDialog on all platforms (simpler, consistent)
```

See the **react-native** skill for platform-specific patterns.
See the **designing-inapp-guidance** skill for guidance UI patterns.
