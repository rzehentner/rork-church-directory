# Feedback & Insights Reference

## Contents
- Feedback Channels in EBC Connect
- In-App Feedback Surfaces
- Admin Approval as Feedback Loop
- Notification Preferences as Signal
- Engagement Signals as Implicit Feedback
- WARNING: No Explicit Feedback Collection
- Lightweight Feedback Patterns

## Feedback Channels in EBC Connect

The app has **no explicit feedback collection mechanism** (no surveys, ratings, or feedback forms). Feedback is inferred from engagement signals and admin interactions.

| Channel | Type | Data Source |
|---------|------|-------------|
| RSVP responses | Implicit | `event_attendees` table |
| Prayer engagement | Implicit | `prayer_prayed` table |
| Announcement reads | Implicit | `announcement_reads` table |
| Form submissions | Implicit | `signup_responses` table |
| Push opt-in/out | Implicit | `notification_endpoints.is_active` |
| Notification prefs | Implicit | AsyncStorage (local only) |
| Admin approvals | Explicit (admin) | `profiles.role` changes |
| App Store reviews | External | App Store / Google Play |

## In-App Feedback Surfaces

### Toast as Micro-Feedback

Toasts confirm actions but don't collect feedback. They could be extended:

```tsx
// Current pattern — confirmation only
showSuccess('RSVP confirmed!');

// Potential pattern — confirmation + follow-up prompt
showSuccess('RSVP confirmed!', {
  actionText: 'Add to Calendar',
  onAction: () => addToDeviceCalendar(event),
});
```

### Error Toasts as Negative Signal

Error toasts indicate friction points. Each `showError()` call represents a moment where the user's intent was blocked.

```tsx
// hooks/toast-context.tsx — error toasts last 6 seconds (vs 4s default)
showError('Could not submit. Please try again.');

// Key error toast locations (friction points):
// - services/events.ts: RSVP failure
// - services/prayer.ts: Prayer creation failure
// - services/signup-forms.ts: Signup submission failure
// - app/visitor-profile.tsx: Profile save failure
// - app/(tabs)/admin.tsx: Approval mutation failure
```

```tsx
// DO — Include actionable recovery in error toasts
showError('Could not save. Check your connection and try again.');

// DON'T — Show vague errors
showError('Something went wrong'); // BAD: user can't act on this
```

### Offline Warning as Environment Feedback

The toast system detects network loss and proactively warns users:

```tsx
// hooks/toast-context.tsx lines 107-135
// NetInfo listener fires showWarning on connectivity loss
showWarning('You are offline. Some features may not work properly.');
```

## Admin Approval as Feedback Loop

The admin approval flow creates a two-way feedback channel between admins and new users:

```
New User signs up → role = 'pending'
  → User sees: "Your account is pending approval" (dashboard banner)
  → Admin sees: pending user in Admin > Approvals tab
  → Admin approves → user role updated → user sees full access
```

```tsx
// app/(tabs)/admin.tsx — approval mutation
const handleApprove = async (userId: string, newRole: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole, approved_at: new Date().toISOString(), approved_by: myUserId })
    .eq('id', userId);

  if (error) {
    showError('Failed to approve user');
  } else {
    showSuccess(`User approved as ${newRole}`);
    queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
  }
};
```

**Insight gap:** Admins cannot attach a note or reason when approving/rejecting. No feedback is sent back to the user beyond the role change itself.

## Notification Preferences as Signal

Notification preferences reveal which features users value. Currently stored in AsyncStorage only (not synced to Supabase).

```typescript
// lib/notification-preferences.ts — local storage structure
interface NotificationPreferences {
  announcements: { enabled: boolean; tagPreferences: Record<string, boolean> };
  events: { enabled: boolean; tagPreferences: Record<string, boolean> };
  general: { enabled: boolean };
}
```

```typescript
// DO — Sync preferences to Supabase for aggregate analysis
// Knowing that 80% of users disable event notifications is a product signal

// DON'T — Leave preferences in local storage only
// Local-only data cannot be analyzed at the population level
// You lose this signal when users reinstall or switch devices
```

## Engagement Signals as Implicit Feedback

Every engagement action is implicit feedback about feature value:

```sql
-- Which features are used most? (implicit feature satisfaction)
SELECT 'Events' AS feature, COUNT(*) AS actions FROM event_attendees
  WHERE responded_at > now() - interval '30 days'
UNION ALL
SELECT 'Prayer', COUNT(*) FROM prayer_prayed
  WHERE prayed_at > now() - interval '30 days'
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcement_reads
  WHERE read_at > now() - interval '30 days'
UNION ALL
SELECT 'Signups', COUNT(*) FROM signup_responses
  WHERE created_at > now() - interval '30 days'
ORDER BY actions DESC;
```

```sql
-- Which events get the most engagement? (content quality signal)
SELECT
  e.title,
  COUNT(DISTINCT ea.person_id) AS responses,
  COUNT(DISTINCT CASE WHEN ea.status = 'going' THEN ea.person_id END) AS going
FROM events e
JOIN event_attendees ea ON e.id = ea.event_id
WHERE e.start_date > now() - interval '90 days'
GROUP BY e.id, e.title
ORDER BY going DESC
LIMIT 10;
```

```sql
-- Which prayers get the most engagement? (community resonance signal)
SELECT
  pr.subject,
  pr.total_prayers,
  pr.last_prayed_at
FROM prayer_requests_with_counts pr
WHERE pr.status = 'open'
ORDER BY pr.total_prayers DESC
LIMIT 10;
```

## WARNING: No Explicit Feedback Collection

**Detected:** No in-app survey, rating prompt, feedback form, or NPS mechanism.

**Impact:**
- Cannot ask users what they want
- Cannot measure satisfaction beyond usage signals
- Cannot collect bug reports through the app
- App Store reviews are the only explicit feedback channel

**Recommended lightweight pattern** (no new dependencies):

```tsx
// A simple feedback prompt after completing a key action
const FEEDBACK_PROMPT_KEY = 'feedback_prompt_count';

async function maybShowFeedbackPrompt() {
  const count = parseInt(await AsyncStorage.getItem(FEEDBACK_PROMPT_KEY) ?? '0');
  if (count >= 5) return; // Don't ask after 5 prompts

  // Show after 3rd RSVP (engaged user, good timing)
  const rsvpCount = await getRsvpCount();
  if (rsvpCount === 3) {
    Alert.alert(
      'Enjoying EBC Connect?',
      'Your feedback helps us improve the app for our church family.',
      [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Rate the App', onPress: openAppStoreReview },
        { text: 'Send Feedback', onPress: () => Linking.openURL('mailto:support@ebcconnect.app') },
      ]
    );
    await AsyncStorage.setItem(FEEDBACK_PROMPT_KEY, String(count + 1));
  }
}
```

```tsx
// DO — Time feedback prompts after positive moments (successful RSVP, prayer streak)
// DON'T — Prompt on first launch or after errors (bad timing, low trust)
// DO — Offer both App Store review and direct feedback email
// DON'T — Show the prompt more than once per session or more than 5 times total
```

## Lightweight Feedback Patterns

### Developer Info as Feedback Channel

`app/developer-info.tsx` shows developer attribution and an email link. This is currently the only in-app path to send feedback.

```tsx
// app/developer-info.tsx — email link pattern
<TouchableOpacity onPress={() => Linking.openURL('mailto:developer@email.com')}>
  <Text>Contact Developer</Text>
</TouchableOpacity>
```

### Prayer Request as Community Feedback

Prayer requests with high engagement (`total_prayers` count) signal community needs. Admin can monitor:

```sql
-- High-engagement prayers = community sentiment
SELECT subject, total_prayers, created_at
FROM prayer_requests_with_counts
WHERE status = 'open' AND total_prayers > 10
ORDER BY total_prayers DESC;
```

### Signup Form Capacity as Demand Signal

When forms reach max capacity, it signals unmet demand:

```sql
-- Oversubscribed events = high demand signal
SELECT
  sf.title,
  sf.max_signups,
  COUNT(sr.id) AS submissions
FROM signup_forms sf
JOIN signup_responses sr ON sf.id = sr.form_id AND sr.status = 'confirmed'
GROUP BY sf.id, sf.title, sf.max_signups
HAVING COUNT(sr.id) >= sf.max_signups;
```

See the **instrumenting-product-metrics** skill for building systematic tracking and the **prioritizing-roadmap-bets** skill for using these signals to prioritize work.
