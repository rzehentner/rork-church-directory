# Feedback & Insights Reference

## Contents
- Current Feedback Channels
- Error Boundary as Feedback Signal
- Toast Feedback Patterns
- Admin Approval as Feedback Loop
- Prayer Requests as Engagement Signal
- Building a Feedback System
- Anti-Patterns

## Current Feedback Channels

EBC Connect has **no in-app feedback mechanism** (no surveys, ratings, or bug reports). User feedback flows through:

1. **Developer info page** (`app/developer-info.tsx`) — email link to developer
2. **Admin approval flow** — admins see new users and approve/reject
3. **Prayer requests** — indirect engagement signal
4. **RSVP patterns** — event participation data in Supabase

## Error Boundary as Feedback Signal

The root layout (`app/_layout.tsx`) includes an error boundary that catches render crashes. Unhandled errors surface to the user with a recovery option.

```typescript
// app/_layout.tsx — error boundary pattern
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <View style={styles.errorContainer}>
      <AlertCircle size={48} color={Colors.status.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <TouchableOpacity onPress={() => router.replace('/')}>
        <Text>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Limitation:** Errors are shown to users but not captured or reported. There is no Sentry, Bugsnag, or error aggregation service. Crash data is lost.

### WARNING: Missing Error Tracking

**Detected:** No error tracking library in dependencies.

**Impact:** Production crashes are invisible. Users hit errors, see "Something went wrong," and have no way to report what happened. The team has no visibility into error frequency or patterns.

**Recommended:** Add `sentry-expo` for crash reporting:

```bash
bun add @sentry/react-native
```

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
});
```

## Toast Feedback Patterns

Toasts provide immediate action feedback. They follow a consistent pattern across the app:

```typescript
// Success after mutation
showSuccess('User approved successfully');
showSuccess('Prayer request submitted');
showSuccess('RSVP updated');

// Error with retry guidance
showError('Failed to save profile. Please try again.');
showError('Network error. Check your connection.');

// Warning for degraded state
showWarning('You are offline. Some features may not work properly.');
```

**Pattern rules:**
- Success: Past tense, confirms what happened ("Saved", "Approved", "Submitted")
- Error: States what failed + suggests next action ("Failed to X. Please Y.")
- Warning: States the condition + implications ("You are offline. Some features...")
- Info: Neutral updates ("Tag created successfully")

## Admin Approval as Feedback Loop

The admin panel's approval flow is the primary feedback loop for user quality:

```typescript
// app/(tabs)/admin.tsx — approval actions
const handleApproveUser = async (userId: string, role: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role, approved_at: new Date().toISOString() })
    .eq('id', userId);

  if (!error) {
    showSuccess('User approved successfully');
    queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
  }
};
```

**Insight opportunity:** Track time-to-approval (gap between `profiles.created_at` and `profiles.approved_at`). Long approval times indicate admin bottlenecks that slow onboarding.

## Prayer Requests as Engagement Signal

Prayer requests and "I prayed" actions are strong engagement indicators for a church app:

```typescript
// services/prayer.ts — engagement actions
export async function prayForRequest(prayerRequestId: string): Promise<void> {
  if (!isValidUUID(prayerRequestId)) throw new Error('Invalid prayer request ID');

  const { error } = await supabase.rpc('pray_for_request', {
    p_prayer_request_id: prayerRequestId,
  });
  if (error) throw error;
}
```

**Metrics to derive:**
- Active prayers per user per week (engagement intensity)
- Prayer creation rate (content contribution)
- Anonymous vs. named prayer ratio (trust level indicator)

## Building a Feedback System

### In-App Feedback Form (Proposed)

Create a lightweight feedback form accessible from Settings:

```typescript
// Proposed: app/feedback.tsx
export default function FeedbackScreen() {
  const { user } = useAuth();
  const [category, setCategory] = useState<'bug' | 'feature' | 'other'>('other');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    await supabase.from('feedback').insert({
      user_id: user?.id,
      category,
      message: message.trim(),
      app_version: Constants.expoConfig?.version,
      platform: Platform.OS,
    });

    showSuccess('Thank you for your feedback!');
    router.back();
  };
}
```

**Requirements:**
- Create `feedback` table in Supabase
- Add RLS policy: users can insert, admins can read
- Add link from Settings screen
- Keep it simple: category picker + text area + submit

### NPS or Satisfaction Prompt (Proposed)

Trigger after the user has been active for 2+ weeks:

```typescript
// Check in dashboard — show once, store dismissal
const shouldShowNPS = useMemo(() => {
  if (!profile?.created_at) return false;
  const daysSinceSignup = differenceInDays(new Date(), new Date(profile.created_at));
  return daysSinceSignup >= 14;
}, [profile?.created_at]);
```

Use `AsyncStorage` with key `nps_dismissed_at` to prevent re-showing. See the **date-fns** skill for date calculations.

## Anti-Patterns

### WARNING: Asking for Feedback Too Early

**The Problem:**

Showing a "Rate this app" prompt during onboarding or on first dashboard visit.

**Why This Breaks:**
1. User hasn't formed an opinion yet — ratings will be neutral or negative
2. Interrupts the activation flow
3. Creates a negative first impression ("they care about ratings, not my experience")

**The Fix:**

Wait until the user has completed onboarding AND been active for 2+ weeks. Trigger on a positive moment (after successful RSVP, after prayer submission) rather than on screen load.

### WARNING: Ignoring Implicit Feedback

**The Problem:**

Only looking at explicit feedback (bug reports, ratings) while ignoring behavioral signals.

**Why This Breaks:**
1. Most users never submit feedback — you lose 95%+ of signal
2. Behavioral data (drop-off points, unused features) tells a richer story
3. Explicit feedback is biased toward power users and complainers

**The Fix:**

Query Supabase for behavioral patterns:

```sql
-- Users who signed up but never completed profile
SELECT p.id, p.created_at
FROM profiles p
LEFT JOIN persons pe ON pe.user_id = p.id
WHERE pe.id IS NULL
  AND p.created_at > NOW() - INTERVAL '30 days';

-- Users who completed profile but never joined a family
SELECT pe.id, pe.first_name, pe.created_at
FROM persons pe
WHERE pe.family_id IS NULL
  AND pe.user_id IS NOT NULL
  AND pe.created_at > NOW() - INTERVAL '30 days';
```

These queries identify onboarding drop-off points without any analytics library.
