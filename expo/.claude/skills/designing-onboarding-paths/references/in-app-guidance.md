# In-App Guidance Reference

## Contents
- Guidance Infrastructure
- Toast System
- Confirmation Dialogs
- Empty State Patterns
- Pending State Communication
- Building New Guidance Patterns
- Anti-Patterns

## Guidance Infrastructure

EBC Connect has three guidance mechanisms: toasts (transient feedback), confirmation dialogs (destructive action gates), and empty states (contextual education). There is no tooltip, coach mark, or walkthrough system — guidance is embedded in the UI through CTAs and empty states.

## Toast System

The toast context (`hooks/toast-context.tsx`) provides app-wide feedback with spam prevention and network status detection.

```typescript
// Usage in any screen or component
const { showSuccess, showError, showWarning, showToast } = useToast();

showSuccess('User approved successfully');
showError('Failed to approve user. Please try again.');
showWarning('You are offline. Some features may not work properly.');
showToast('info', 'Tag created successfully', { duration: 5000 });
```

**Toast behavior:**
- Auto-dismiss: 4s default, 6s for errors
- Message cap: 200 characters, trimmed
- Deduplication: Same type+message toast is replaced, not stacked
- Animation: Slide down from top, 250ms duration
- Colors: Success (#10B981), Error (#EF4444), Warning (#F59E0B), Info (#3B82F6)

**Network status toast** fires automatically when connectivity changes:

```typescript
// hooks/toast-context.tsx — automatic offline warning
useEffect(() => {
  if (Platform.OS === 'web') return; // Skip web to prevent hydration issues
  const unsubscribe = NetInfo.addEventListener(state => {
    if (!state.isConnected) {
      showWarning('You are offline. Some features may not work properly.');
    }
  });
  return unsubscribe;
}, []);
```

## Confirmation Dialogs

Platform-aware confirmation for destructive actions:

```typescript
// components/Toast.tsx — useConfirmation hook
const { showConfirmation, ConfirmationRenderer } = useConfirmation();

showConfirmation(
  'Delete Tag?',
  'This will remove the tag from all members and content.',
  handleDelete,
  { confirmText: 'Delete', destructive: true }
);
```

- **Native:** Uses `Alert.alert()` with native iOS/Android styling
- **Web:** Custom modal dialog matching brand colors

## Empty State Patterns

Every list screen implements a `ListEmptyComponent` with icon + title + subtitle. Some include action buttons.

```typescript
// Pattern: informational empty state (notifications)
<View style={styles.emptyState}>
  <Bell size={48} color={Colors.text.muted} />
  <Text style={styles.emptyTitle}>No notifications</Text>
  <Text style={styles.emptySubtitle}>
    You will see notifications about events and announcements here
  </Text>
</View>

// Pattern: actionable empty state (admin tags)
<View style={styles.emptyState}>
  <Tag size={48} color={Colors.text.muted} />
  <Text style={styles.emptyTitle}>No tags created yet</Text>
  <Text style={styles.emptySubtitle}>
    Create your first tag to get started
  </Text>
  <TouchableOpacity onPress={handleCreateTag}>
    <Plus size={16} /> <Text>Create Tag</Text>
  </TouchableOpacity>
</View>
```

**Empty state checklist for new screens:**
- [ ] Use lucide-react-native icon at size 48. See the **lucide-react-native** skill
- [ ] Title explains what's missing ("No events match your criteria")
- [ ] Subtitle explains what will appear or what to do next
- [ ] Add action button if the user can create the missing content
- [ ] Use `Colors.text.muted` for the icon color

## Pending State Communication

Pending users see guidance in three places:

1. **Dashboard banner** — persistent amber warning
2. **Settings role card** — shows "PENDING" badge with explanation
3. **Visitor profile header** — "Your account is pending approval" notice

```typescript
// Consistent pending indicator pattern
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={18} color="#D97706" />
    <Text style={styles.pendingText}>
      Your account is pending approval from church leadership
    </Text>
  </View>
)}
```

**Consistency rule:** Use `#D97706` (amber) for pending states across all screens. Match the `AlertCircle` icon + text layout.

## Building New Guidance Patterns

### Adding a First-Run Hint

The app currently lacks a tooltip or coach mark system. To add one:

1. Create `components/Tooltip.tsx` with absolute positioning and arrow
2. Track seen state in AsyncStorage: `tooltip_seen_${key}`
3. Show on first visit, dismiss on tap or after timeout

```typescript
// Proposed pattern — not yet in codebase
import { getItem, setItem } from '@/lib/storage';

export function useFirstRunHint(key: string) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    getItem(`hint_seen_${key}`).then(seen => {
      if (!seen) setIsVisible(true);
    });
  }, [key]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    setItem(`hint_seen_${key}`, 'true');
  }, [key]);

  return { isVisible, dismiss };
}
```

### Adding an Onboarding Checklist Card

For a dashboard-mounted progress checklist:

```typescript
// Proposed pattern — calculate completion from existing contexts
const steps = [
  { label: 'Create account', done: !!user },
  { label: 'Complete profile', done: !!person?.first_name },
  { label: 'Join a family', done: !!family },
  { label: 'Enable notifications', done: notificationsEnabled },
];

const completed = steps.filter(s => s.done).length;
const isComplete = completed === steps.length;

// Hide checklist once all steps are done
{!isComplete && <OnboardingChecklist steps={steps} />}
```

## Anti-Patterns

### WARNING: Using Toasts for Critical Information

**The Problem:**

```typescript
// BAD — toast auto-dismisses, user misses important info
showToast('info', 'Your account requires admin approval before you can RSVP');
```

**Why This Breaks:**
1. Toasts vanish after 4 seconds — users miss critical guidance
2. No way to re-read the message
3. Important state information needs persistent, in-place display

**The Fix:**

Use inline banners (like the pending banner) for persistent information. Reserve toasts for action confirmations ("Saved!", "Deleted!").

### WARNING: Platform-Inconsistent Guidance

**The Problem:**

```typescript
// BAD — web users get no confirmation, native users get Alert
if (Platform.OS !== 'web') {
  Alert.alert('Confirm', 'Delete this?', [...]);
} else {
  handleDelete(); // No confirmation on web!
}
```

**Why This Breaks:**
1. Web users accidentally delete content with no safety net
2. Inconsistent behavior erodes trust

**The Fix:**

Use the `useConfirmation` hook from `components/Toast.tsx` — it handles platform differences internally, showing `Alert.alert` on native and a custom modal on web.
