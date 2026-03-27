# Distribution Reference

## Contents
- Distribution Channels in EBC Connect
- Push Notification Copy
- Clipboard Sharing Pattern
- Family Join Token Flow
- WARNING: Missing Share Sheet Integration
- WARNING: No Deep Link Messaging
- App Store Listing Copy
- Distribution Checklist

## Distribution Channels in EBC Connect

The app has three active distribution mechanisms and two missing ones:

| Channel | Status | File Location |
|--------|--------|---------------|
| Push notifications | Active | `lib/notifications.ts`, `hooks/notification-context.tsx` |
| Clipboard sharing (events) | Active | `app/event-detail.tsx` |
| Family join tokens | Active | `app/(tabs)/family.tsx`, `app/join-family.tsx` |
| Social share sheet | Missing | Not implemented |
| Deep links | Missing | No link handling for shared content |

## Push Notification Copy

Notifications are delivered via Expo Notifications on native platforms. The copy lives in the notification payload sent from Supabase, not in the client code. The client configures display behavior:

```typescript
// hooks/notification-context.tsx — display configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
```

**Notification copy rules:**
- Title: action or entity name (e.g., "New Prayer Request", "Event Reminder")
- Body: one sentence with the key detail (e.g., "Sunday potluck starts in 1 hour")
- Max body length: 100 characters (truncated on lock screen)
- No urgency language ("URGENT!", "DON'T MISS") — church context demands calm tone

**Event reminders** are scheduled 60 minutes before events via `expo-notifications`:

```typescript
// services/events.ts — reminder scheduling
await Notifications.scheduleNotificationAsync({
  content: {
    title: event.title,
    body: `Starting in 1 hour`,
  },
  trigger: { date: reminderDate },
});
```

## Clipboard Sharing Pattern

Event sharing copies formatted text to the clipboard. This is the primary way members share events externally:

```typescript
// app/event-detail.tsx — share event details
const shareText = `Check out this event: ${event.title}\n${formattedDate}${
  event.location ? `\nLocation: ${event.location}` : ''
}${event.description ? `\n${event.description}` : ''}`;

await Clipboard.setStringAsync(shareText);
showToast('Event details copied to clipboard', 'success');
```

**Copy rules for shared text:**
- First line: hook ("Check out this event: [Title]")
- Second line: date/time (essential context)
- Optional lines: location, description
- No app branding or download links (missing opportunity — see WARNING below)

## Family Join Token Flow

The family join token is the app's only organic growth mechanism. A family member copies a token and shares it externally (SMS, verbal, etc.):

```typescript
// app/(tabs)/family.tsx — token sharing
const copyJoinToken = async () => {
  await Clipboard.setStringAsync(joinToken);
  showToast('Copied! Family join token copied to clipboard', 'success');
};
```

The recipient enters this token on `app/join-family.tsx` to connect to the family.

**Copy improvement opportunity:** The token is a raw string. Consider wrapping it in a message:

```typescript
// BETTER — contextual sharing message
const shareMessage = `Join our family on EBC Connect! Use this token: ${joinToken}`;
await Clipboard.setStringAsync(shareMessage);
```

### WARNING: Missing Share Sheet Integration

**Detected:** No native share sheet (`Share.share()`) integration found in the codebase. All sharing uses clipboard copy only.

**Impact:** Users must manually paste into their messaging app. This adds friction and reduces share completion rate.

**Recommended Fix:**

```typescript
import { Share, Platform } from 'react-native';

const handleShare = async () => {
  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(shareText);
    showToast('Copied to clipboard', 'success');
  } else {
    await Share.share({ message: shareText });
  }
};
```

**Why This Matters:** The native share sheet shows the user's recent contacts and apps, reducing the cognitive load of "where do I paste this?" to zero.

### WARNING: No Deep Link Messaging

**Detected:** No URL scheme or universal link handling for shared content. When a user shares event details, the recipient gets plain text with no link back to the app.

**Impact:** Shared content is a dead end. Recipients can't tap to open the event in the app.

**Recommended Fix:** Use Expo Linking to register a URL scheme and include a link in shared content:

```typescript
const shareText = `Check out this event: ${event.title}\n${formattedDate}\n` +
  `Open in EBC Connect: ebcconnect://event/${event.id}`;
```

See the **expo-router** skill for deep link configuration with Expo Router.

## App Store Listing Copy

App store descriptions are not stored in the codebase, but the positioning language should be consistent with in-app copy. Use the same vocabulary:

| In-App Term | App Store Equivalent |
|-------------|---------------------|
| "church family" | "your church family" |
| "connect" | "stay connected" |
| "prayer requests" | "share and track prayer requests" |
| "events" | "never miss a church event" |

**DO:** "Stay connected with your church family — events, prayers, and announcements in one place."
**DON'T:** "A comprehensive church management platform with event RSVP, prayer tracking, and notification features."

See the **clarifying-market-fit** skill for positioning and value proposition alignment.

## Distribution Checklist

Copy this checklist when adding or auditing a distribution surface:

- [ ] Shared text includes a hook line (why the recipient should care)
- [ ] Date/time is included in event shares
- [ ] Native share sheet is used on mobile, clipboard fallback on web
- [ ] Success toast confirms the share action
- [ ] No internal IDs or technical details in shared text
- [ ] Family join token includes contextual message, not just the raw token
- [ ] Push notification body is under 100 characters
- [ ] Push notification title names the entity, not the action

See the **instrumenting-product-metrics** skill for tracking share events.
