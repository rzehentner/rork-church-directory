# Growth Engineering Reference

## Contents
- Growth Model for a Church App
- Activation Engineering
- Engagement Loops
- Re-engagement Patterns
- Referral and Organic Growth
- Growth Checklist

## Growth Model for a Church App

EBC Connect's growth differs fundamentally from SaaS. There is no paid acquisition, no viral loop, and no freemium upsell. Growth comes from:

1. **Pulpit announcements** — pastor tells congregation to download the app
2. **Word of mouth** — members tell family and friends
3. **Church bulletin/website** — QR code or link to app stores
4. **In-app family invites** — existing members invite family via join token

The growth engineering focus is **activation and retention**, not acquisition.

## Activation Engineering

### Current Activation Flow

```
Sign Up → Profile Completion → Admin Approval → Family Join → First Interaction
         ↑ visitor-profile.tsx    ↑ manual        ↑ family.tsx   ↑ events/prayers
```

### DO: Surface Next Steps at Every Stage

```tsx
// app/(tabs)/dashboard.tsx — good pattern: conditional prompts
// Pending + no profile → "Complete Your Profile" card
// Approved + no family → "Join Your Family" card

// Each prompt routes to the exact next screen:
onPress={() => router.push('/visitor-profile')}
onPress={() => router.push('/(tabs)/family')}
```

### DON'T: Leave Users in Limbo After Approval

```tsx
// BAD — user gets approved but sees no celebratory moment
// The role changes from 'pending' to 'member' in the database
// but the app shows no notification, no welcome, no "you're in!"

// GOOD — detect role change and surface it
// In hooks/user-context.tsx, compare previous and current role
useEffect(() => {
  if (prevRole === 'pending' && profile?.role === 'member') {
    showToast({
      type: 'success',
      title: 'Welcome to EBC Connect!',
      message: 'Your account has been approved by church leadership.',
    });
  }
}, [profile?.role]);
```

### Admin Approval Bottleneck

The biggest activation friction is the manual admin approval step:

```sql
-- Average approval time
SELECT AVG(
  (SELECT MIN(created_at) FROM profiles WHERE id = p.id AND role != 'pending')
  - p.created_at
) as avg_approval_time
FROM profiles p
WHERE role != 'pending';
```

**Optimization:** Notify admins immediately when a new account is pending:

```tsx
// In the sign-up success handler
await supabase.rpc('notify_admins_new_signup', {
  user_name: `${firstName} ${lastName}`,
});
```

See the **improving-activation-flow** skill for detailed activation optimization.

## Engagement Loops

### Content Creation Loop (Existing)

```
Member creates prayer request
  → Others see it in feed
    → They tap "Pray" (engagement)
      → Creator sees prayer count (reward)
        → Creator posts more prayers (reinforcement)
```

This loop exists in `app/(tabs)/prayers.tsx` and `services/prayer.ts`.

### Event Engagement Loop (Existing)

```
Admin creates event
  → Members see it in "For You" section (tag-personalized)
    → Member RSVPs
      → Event detail shows attendance count (social proof)
        → Social proof drives more RSVPs
```

### DO: Personalize Content Feeds

```tsx
// app/(tabs)/dashboard.tsx — "For You" sections use tag personalization
// Events and announcements filtered by the user's assigned tags
// This is the strongest engagement signal in the app

// Ensure new users get tags assigned quickly
// Otherwise "For You" is empty and the dashboard feels impersonal
```

### DON'T: Show Generic Content to Tagged Users

```tsx
// The current implementation does this correctly:
// "For You" renders ABOVE "Latest Announcements" in the dashboard
// Do NOT reorder these sections — personalized content must take visual priority
```

## Re-engagement Patterns

### Push Notifications (Primary Channel)

Current notification categories in `lib/notification-preferences.ts`:

```tsx
'newEvents'          // New event created
'eventUpdates'       // Event details changed
'rsvpReminders'      // Reminder before RSVP'd event
'eventCancellations' // Event cancelled
// Plus: per-tag announcement notifications
```

### WARNING: No Re-engagement for Dormant Users

**The Problem:** If a user stops opening the app, there is no mechanism to bring them back. Push notifications only fire for new content, not for re-engagement.

**The Fix:** Use Supabase pg_cron to identify dormant users and trigger a weekly digest:

```sql
-- Identify dormant users (no app open in 7 days)
SELECT user_id FROM profiles
WHERE last_sign_in_at < NOW() - INTERVAL '7 days'
AND role NOT IN ('pending', 'visitor');
```

## Referral and Organic Growth

### Family Token Sharing (Existing)

```tsx
// app/(tabs)/family.tsx — copies token to clipboard
<Text>Share this token with family members to let them join</Text>
<Pressable onPress={() => Clipboard.setStringAsync(family.join_token)}>
  <Text>Copy Token</Text>
</Pressable>
```

### DO: Make Sharing Frictionless

```tsx
// Use the native Share sheet instead of clipboard-only
import { Share } from 'react-native';

const handleShareToken = async () => {
  await Share.share({
    message: `Join our family on EBC Connect! Use this code: ${family.join_token}`,
  });
};
```

### DON'T: Require Multiple Steps to Share

```tsx
// BAD — current flow: Open Family tab → Find token → Tap Copy →
//       Open messaging app → Paste token → Explain context to recipient

// GOOD — single native Share sheet tap with embedded context
```

## Growth Checklist for New Features

Copy this checklist when building features with growth impact:

- [ ] Does the feature create a loop (create → consume → react → create more)?
- [ ] Is the feature personalized via tags when applicable?
- [ ] Does the feature generate push notifications for relevant users?
- [ ] Can the output be shared outside the app?
- [ ] Does the empty state guide users toward first interaction?
- [ ] Is there a re-engagement hook for dormant users?

See the **orchestrating-feature-adoption** skill for progressive disclosure patterns.
See the **designing-onboarding-paths** skill for new-user activation routing.
