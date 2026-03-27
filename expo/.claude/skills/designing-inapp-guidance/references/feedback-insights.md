# Feedback & Insights for Guidance

## Contents
- Current Feedback Channels
- In-App Feedback Signals
- Admin Approval as Feedback Loop
- Guidance Feedback Patterns
- WARNING: Missing In-App Feedback Mechanism
- Feedback-Driven Guidance Checklist

## Current Feedback Channels

EBC Connect has **no in-app feedback mechanism**. Users cannot report issues, request features, or rate their experience from within the app. The only indirect feedback signals come from usage patterns in Supabase.

The `app/developer-info.tsx` screen shows developer contact info but no structured feedback form.

```tsx
// app/developer-info.tsx — developer contact (not a feedback form)
<View style={styles.missionCard}>
  <Text style={styles.missionTitle}>Our Mission</Text>
  <Text style={styles.missionText}>
    EBC Connect was built to strengthen the bonds of our church family...
  </Text>
</View>
```

## In-App Feedback Signals

Even without explicit feedback, user behavior tells you what guidance is working.

### Signal 1: Empty State Encounters

If users frequently see empty states, they either arrived too early or can't find content.

```tsx
// Track empty state views to identify guidance gaps
// In any ListEmptyComponent:
useEffect(() => {
  // Log to console in dev — replace with analytics when available
  console.log('[Guidance] Empty state shown:', { screen: 'events', viewMode, hasFilters });
}, []);
```

### Signal 2: Error Toast Frequency

High error toast frequency on a specific screen signals a UX problem.

```tsx
// hooks/toast-context.tsx — existing toast queue
// Toast messages are already sanitized and deduped
// Monitor which error messages appear most frequently
setToasts(prev => {
  const filtered = prev.filter(
    toast => toast.type !== type || toast.message !== sanitizedMessage
  );
  return [...filtered, newToast];
});
```

### Signal 3: Form Abandonment

Users who start a form (mount the screen) but never submit indicate unclear guidance.

```tsx
// Proxy: compare screen navigation to form submissions in Supabase
// create-event.tsx mount count vs events table insert count
// create-prayer.tsx mount count vs prayer_requests insert count
```

### DO: Use existing data before adding new tracking

Supabase already has RSVP counts, prayer counts, signup submissions. Query these before building a new analytics system.

### DON'T: Ask users for feedback too early in their journey

A pending user who hasn't been approved yet should never see a "How's your experience?" prompt. Gate feedback requests on activation milestones.

## Admin Approval as Feedback Loop

The admin panel in `app/(tabs)/admin.tsx` includes user approval, which is itself a feedback loop. When admins approve or reject users, that signal could drive guidance.

```tsx
// app/(tabs)/admin.tsx — approval actions
<TouchableOpacity
  style={styles.approveButton}
  onPress={() => handleApprove(user.id)}
>
  <CheckCircle size={18} color="#10B981" />
  <Text style={styles.approveText}>Approve</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.rejectButton}
  onPress={() => handleReject(user.id)}
>
  <XCircle size={18} color="#EF4444" />
  <Text style={styles.rejectText}>Reject</Text>
</TouchableOpacity>
```

### DO: Notify users when their status changes

When an admin approves a pending user, the user should see a toast or banner on their next visit: "Welcome! Your account has been approved." This closes the feedback loop.

### DON'T: Leave pending users in limbo

If approval takes days, show a progress indicator or estimated wait time. Silence during the pending period drives users to abandon the app.

## Guidance Feedback Patterns

When guidance elements are interactive, capture the interaction as a feedback signal.

### Pattern 1: Dismissible Banners

```tsx
// Track when users dismiss guidance to avoid showing it again
const [isDismissed, setIsDismissed] = useState(false);

useEffect(() => {
  AsyncStorage.getItem('dismissed_join_family_cta').then(val => {
    if (val === 'true') setIsDismissed(true);
  });
}, []);

const handleDismiss = async () => {
  setIsDismissed(true);
  await AsyncStorage.setItem('dismissed_join_family_cta', 'true');
};

{!isDismissed && !family && (
  <View style={styles.ctaCard}>
    <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
      <X size={16} color="#94A3B8" />
    </TouchableOpacity>
    {/* CTA content */}
  </View>
)}
```

### Pattern 2: Toast with Action Feedback

```tsx
// components/Toast.tsx — existing action support
showToast('info', 'You can add events to your device calendar', {
  actionText: 'Learn More',
  onAction: () => router.push('/help/calendar-sync'),
});
```

If users frequently tap "Learn More", the feature needs better inline guidance. If they never tap it, the toast copy may be insufficient.

### Pattern 3: Confirmation Dialog as Sentiment Check

```tsx
// After completing a multi-step flow, ask if guidance was helpful
Alert.alert(
  'Family Created!',
  'Would you like to invite family members now?',
  [
    { text: 'Later', style: 'cancel' },
    { text: 'Invite Now', onPress: () => setShowInviteFlow(true) },
  ]
);
```

This dialog doubles as guidance (next step) and feedback (did the user want to continue?).

## WARNING: Missing In-App Feedback Mechanism

**The Problem:** No way for users to report issues or suggest improvements from within the app.

**Why This Matters:**
1. Church members won't email developers — they'll tell a leader in person and the feedback gets lost
2. Bug reports without device/OS context are hard to reproduce
3. No structured way to collect feature requests

**The Fix:** Add a simple feedback form accessible from settings that writes to a Supabase `feedback` table.

```tsx
// Proposed: feedback service
export async function submitFeedback(
  type: 'bug' | 'feature' | 'general',
  message: string
) {
  const { error } = await supabase.from('feedback').insert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    type,
    message,
    device_info: {
      platform: Platform.OS,
      version: Platform.Version,
    },
  });
  if (error) throw error;
}
```

See the **supabase** skill for table creation and RLS patterns.

## Feedback-Driven Guidance Checklist

Copy this checklist when using feedback to improve guidance:

- [ ] Identify the feedback signal (empty state hit, error toast, form abandonment)
- [ ] Query existing Supabase data for frequency and context
- [ ] Determine if the issue is guidance (unclear UI) or functionality (missing feature)
- [ ] If guidance: revise copy, add help text, or add a tooltip
- [ ] If functionality: log as feature request, see the **scoping-feature-work** skill
- [ ] Ship the fix and monitor the signal for improvement
- [ ] If signal doesn't improve, revisit the root cause
