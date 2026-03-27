# Distribution Reference

## Contents
- Distribution Channels
- App Store Presence
- Deep Linking
- Sharing Mechanisms
- Push Notification Distribution
- Distribution Checklist

## Distribution Channels

EBC Connect distributes through three channels:

| Channel | Status | Configuration |
|---------|--------|---------------|
| iOS App Store | Configured | `eas submit --platform ios`, bundle `com.ebcconnect.app` |
| Google Play Store | Configured | `eas submit --platform android`, bundle `com.ebcconnect.app` |
| Web | Live | Hosted at church domain |

See the **eas** skill for build and submit workflows.

## App Store Presence

### WARNING: No Version-Controlled App Store Description

**The Problem:** `app.json` contains no `description`, `shortDescription`, or `keywords` fields. App store metadata lives only in App Store Connect / Google Play Console dashboards.

**Why This Breaks:**
1. No version-controlled record of positioning copy
2. Store description drifts from in-app messaging
3. New team members cannot find or update store copy without console access

**The Fix:** Track store metadata in `app.json`:

```json
{
  "expo": {
    "extra": {
      "store": {
        "shortDescription": "Connecting our church family at Edna Baptist Church",
        "description": "EBC Connect keeps our church family connected with events, prayer requests, announcements, and a family directory. Stay informed and engaged with the Edna Baptist Church community.",
        "keywords": ["church", "community", "events", "prayer", "Edna Baptist"]
      }
    }
  }
}
```

### App Store Copy Framework

Structure store descriptions around the three value pillars:

```
Line 1: Tagline — "Connecting our church family"
Line 2: What — "The official app for Edna Baptist Church"

Feature bullets (map to actual screens):
- Events & RSVPs — know what's happening and sign up
- Prayer requests — share and support each other in prayer
- Announcements — stay informed with tagged, personalized updates
- Family directory — find and connect with your church family
- Signup forms & potlucks — coordinate meals and volunteering

Closing: "Built with love for the EBC family"
```

## Deep Linking

### WARNING: Broken Calendar Deep Links

**The Problem:**

```typescript
// utils/calendar.ts — ICS export uses wrong scheme
const deepLink = `myapp://event-detail?id=${event.id}`;
// Should be:
const deepLink = `ebcconnect://event-detail?id=${event.id}`;
```

**Why This Breaks:** Events added to the device calendar contain links that open nothing (or the wrong app). The correct scheme `ebcconnect` is declared in `app.json` but not used in calendar exports.

**The Fix:**

```typescript
// utils/calendar.ts — use the declared scheme
const deepLink = `ebcconnect://event-detail?id=${event.id}`;
```

### Deep Link Configuration

```json
// app.json — scheme is declared
{ "expo": { "scheme": "ebcconnect" } }
```

| Link Pattern | Target Screen | Status |
|-------------|---------------|--------|
| `ebcconnect://event-detail?id=X` | `app/event-detail.tsx` | Broken (uses `myapp://`) |
| `ebcconnect://` (root) | `app/index.tsx` | Not tested |
| Universal links | Not configured | Missing |

## Sharing Mechanisms

### WARNING: Native Event Sharing Shows Error Toast

**The Problem:**

```tsx
// app/event-detail.tsx — current implementation
const handleShare = async () => {
  // Web: copies text to clipboard via navigator.clipboard
  // Native: shows "Sharing not available" toast — Share sheet NOT invoked
};
```

`expo-sharing` is used for PDFs and ICS files but NOT for event text sharing. The Share2 icon is visible but tapping it on native shows an error toast.

### DO: Generate Shareable Links with Native Share Sheet

```tsx
// Instead of clipboard-only token sharing:
import { Share } from 'react-native';

const shareToken = async (token: string) => {
  const joinUrl = `ebcconnect://join-family?token=${token}`;
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(joinUrl);
  } else {
    await Share.share({ message: `Join our family on EBC Connect: ${joinUrl}` });
  }
};
```

### DON'T: Show Share UI Without Native Support

```tsx
// BAD — app/event-detail.tsx shows Share2 icon but native share is broken
<Pressable onPress={handleShare}>
  <Share2 />
</Pressable>
// Tapping on native shows "Sharing not available" — frustrating dead-end
```

## Push Notification Distribution

Push notifications are the primary re-engagement channel:

| Aspect | Implementation |
|--------|---------------|
| Token registration | `expo-notifications` → `notification_endpoints` Supabase table |
| Content source | Server-driven via `user_notifications` table |
| Preferences | `AsyncStorage` only — NOT synced to server |
| Categories | Announcements (per-tag), Events (new/update/RSVP/cancel) |

### WARNING: Notification Taps Don't Navigate

**The Problem:** Tapping a notification in `app/notifications.tsx` calls `markAsRead(id)` but does NOT navigate to the related event/announcement. The `reference_type` and `reference_id` fields exist in the notification data but are unused.

**The Fix:**

```tsx
// Route based on reference_type
const handleNotificationPress = (notification: UserNotification) => {
  markAsRead(notification.id);
  if (notification.reference_type === 'event') {
    router.push(`/event-detail?id=${notification.reference_id}`);
  } else if (notification.reference_type === 'announcement') {
    router.push('/(tabs)/announcements');
  }
};
```

See the **instrumenting-product-metrics** skill for tracking notification engagement.

## Distribution Checklist

Copy this checklist for each release:

- [ ] Version string updated in `app.json`, `developer-info.tsx`, and `settings.tsx`
- [ ] App store description reviewed for consistency with in-app copy
- [ ] Deep links tested on both platforms
- [ ] Push notification delivery verified for each category
- [ ] Calendar deep link scheme verified (`ebcconnect://` not `myapp://`)
- [ ] OTA update tested via `npx eas update` before native build
