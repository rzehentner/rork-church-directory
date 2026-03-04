# Feedback & Insights Reference

## Contents
- Admin Approval as Feedback Loop
- User-Facing Feedback Surfaces
- Admin Dashboard Signals
- Notification Preferences
- Missing Feedback Channels
- Anti-Patterns

## Admin Approval as Feedback Loop

The admin approval flow in `app/(tabs)/admin.tsx` is the primary feedback loop between
church leadership and new users. Admins see pending users and can approve or reject:

```typescript
// Admin sees pending users with avatar, name, and requested date
// Two-action pattern: Approve / Reject
<TouchableOpacity onPress={() => handleApprove(user.id)}>
  <Text>Approve</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => handleReject(user.id)}>
  <Text>Reject</Text>
</TouchableOpacity>
```

**Feedback gap:** The user receives no notification when approved or rejected. The role
change happens silently in the database. Next time the user opens the app, the pending
banner disappears (if approved) or remains (if rejected).

**The Fix:** Send a push notification on role change:

```typescript
// In the approval handler (admin.tsx or a Supabase edge function)
await supabase.from('user_notifications').insert({
  user_id: approvedUserId,
  title: 'Welcome to EBC Connect!',
  body: 'Your account has been approved. You now have full access.',
});
```

## User-Facing Feedback Surfaces

### Toast Notifications

The toast system (`hooks/toast-context.tsx`) provides immediate feedback for user actions:

```typescript
// 4 feedback levels used throughout the app
showSuccess('Profile saved successfully!');        // Green, 4s
showError('Failed to save. Please try again.');    // Red, 6s
showWarning('You are offline');                     // Amber, auto
showInfo('Pull down to refresh');                   // Blue, 4s
```

156 toast calls across 17 files provide consistent action feedback.

### Alert Dialogs

Used for destructive or irreversible actions:

```typescript
// app/visitor-profile.tsx:157-166 — success with navigation
Alert.alert('Success', 'Your profile has been saved!', [
  { text: 'Continue', onPress: () => router.replace('/(tabs)/family') },
]);

// app/visitor-profile.tsx:182-192 — confirmation before skip
Alert.alert('Skip Profile Setup',
  'You can complete your profile later in the Family tab.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', onPress: () => router.replace('/(tabs)/family') },
  ]
);
```

## Admin Dashboard Signals

The admin panel provides aggregate signals about app health:

```typescript
// app/(tabs)/admin.tsx — stat cards in header
// Pending Approvals count — activation bottleneck indicator
// Total Tags count — content organization health
// Announcements count — content freshness
```

When pending approvals pile up, it signals that admin response time is blocking activation.
This is the most actionable admin signal for activation health.

## Notification Preferences

`app/(tabs)/settings.tsx` exposes notification preference toggles:

```typescript
// Settings screen notification section (lines 243-274)
// Toggle: Push notifications on/off
// Detailed preferences for event reminders, announcements, prayers
```

Users who disable notifications have significantly lower re-engagement rates.
Tracking the notification opt-out rate is a key health metric.

## Missing Feedback Channels

### WARNING: No In-App Support or Bug Report

**Detected:** No support channel, feedback form, or bug report mechanism
**Impact:** Users who hit issues during activation have no way to report problems
except leaving the app

**Recommended approach for Expo:**

```typescript
// Minimal feedback via email deep link
import { Linking } from 'react-native';

function handleFeedback() {
  Linking.openURL('mailto:support@ednabaptist.org?subject=EBC Connect Feedback');
}
```

Or add a feedback screen that posts to a Supabase `feedback` table:

```typescript
// services/feedback.ts
export async function submitFeedback(userId: string, message: string, screen: string) {
  return supabase.from('feedback').insert({
    user_id: userId,
    message,
    screen,
    created_at: new Date().toISOString(),
  });
}
```

### WARNING: No Activation Drop-Off Visibility

Admins can see pending users but cannot distinguish between:
- Users who signed up but never completed profile (stuck at step 2)
- Users who completed profile but are waiting for approval (stuck at step 5)
- Users who were approved but never joined a family (stuck at step 6)

**The Fix:** Add activation status to the admin view:

```typescript
// GOOD — show activation progress in admin approvals list
const activationStatus = {
  hasProfile: !!(person.first_name && person.last_name),
  hasFamily: !!person.family_id,
  hasPhoto: !!person.photo_url,
};
// Render as progress dots or checklist in the admin user card
```

## Anti-Patterns

### WARNING: One-Way Communication

The app communicates to users (banners, toasts, notifications) but provides no channel
for users to communicate back. In a church community app, this misses the relational
purpose of the tool.

**When You Might Be Tempted:** "We'll add feedback later." But early-stage activation
insights are the most valuable. Users who churn during onboarding will never come back
to give feedback later.

### WARNING: No Activation Health Dashboard

Admins see pending approvals but have no view into overall activation health:
- How many users signed up this week?
- What percentage completed their profile?
- Average time from signup to approval?
- How many approved users joined a family?

Without these metrics, leadership cannot optimize the activation process.

## Feedback Implementation Checklist

Copy this checklist when adding feedback collection:

- [ ] Step 1: Create `feedback` table in Supabase (user_id, message, screen, created_at)
- [ ] Step 2: Add feedback button to settings screen
- [ ] Step 3: Create feedback form screen with text input and submit
- [ ] Step 4: Add admin view for feedback in the admin panel
- [ ] Step 5: Add activation health queries to admin dashboard
- [ ] Step 6: Track feedback submission as a product event
