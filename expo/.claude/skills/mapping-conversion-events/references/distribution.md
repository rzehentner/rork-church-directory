# Distribution Reference

## Contents
- Distribution Channels
- Push Notification Conversion Tracking
- Deep Link Tracking
- OTA Update Strategy
- Anti-Patterns

---

## Distribution Channels

EBC Connect distributes through three channels. Each has different conversion instrumentation requirements:

| Channel | Entry Point | Conversion Event | Tracking Constraint |
|---------|-------------|-----------------|---------------------|
| iOS App Store | App Store listing | `app_install` (via Apple's SKAdNetwork) | No direct access; use EAS metadata |
| Google Play | Play Store listing | `app_install` (via Play Install Referrer) | No direct access |
| Direct invite | Shared invite link or QR code | `auth_signup` with `source: 'invite'` | Trackable via Expo Linking |
| Word of mouth | Physical invite / announcement | `auth_signup` with `source: 'organic'` | Default; no referrer |

The most actionable distribution signal is **invite-driven signup tracking**, which is fully in your control.

---

## Push Notification Conversion Tracking

Push is the primary retention and re-engagement channel. All registration happens in `lib/notifications.ts`. The registration call site is `hooks/auth-context.tsx` after sign-in.

Track registration outcome — including permission denial:

```typescript
// lib/notifications.ts — registerPushEndpoint
export async function registerPushEndpoint() {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Track the outcome regardless of grant/deny
  posthog.capture('push_permission_outcome', {
    granted: finalStatus === 'granted',
    platform: Platform.OS,
  });

  if (finalStatus !== 'granted') return;

  const tokenResult = await Notifications.getExpoPushTokenAsync();
  // ... upsert to notification_endpoints ...

  posthog.capture('push_notification_registered', {
    platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' : 'android',
  });
}
```

Track notification opens via the foreground/background handler in `app/_layout.tsx`:

```typescript
// app/_layout.tsx — after existing Notifications.addNotificationResponseReceivedListener
Notifications.addNotificationResponseReceivedListener((response) => {
  const notifId = response.notification.request.identifier;
  const data    = response.notification.request.content.data;

  posthog.capture('notification_tapped', {
    notification_type: data?.type ?? 'unknown',
    notification_id:   notifId,
  });

  // Existing navigation logic...
});
```

---

## Deep Link Tracking

Expo Linking handles deep links on both native and web. Track which deep links drive conversions (e.g., shared event link → RSVP):

```typescript
// app/_layout.tsx — track inbound deep links at session start
import * as Linking from 'expo-linking';

useEffect(() => {
  Linking.getInitialURL().then((url) => {
    if (url) {
      posthog.capture('deep_link_opened', { url: url.split('?')[0] }); // strip query params
    }
  });

  const subscription = Linking.addEventListener('url', ({ url }) => {
    posthog.capture('deep_link_opened', { url: url.split('?')[0] });
  });

  return () => subscription.remove();
}, []);
```

Track family invite code usage specifically — this is the primary viral loop:

```typescript
// app/join-family.tsx — handleJoinFamily
posthog.capture('invite_code_used', {
  success: !error,
  family_id: familyId ?? null,
});
```

---

## OTA Update Strategy

EAS Update (`npx eas update`) lets you ship copy, fix funnel blockers, and instrument new tracking without an app store review cycle. Use it for:

1. **Funnel copy fixes** — visitor-profile labels, empty-state CTAs, toast messages
2. **Tracking instrumentation** — adding `posthog.capture()` calls to existing call sites
3. **A/B test variants** — ship variant B to the preview channel, measure vs. production

```bash
# Ship to production channel (all users on current binary)
npx eas update --channel production --message "Add funnel tracking"

# Ship to preview channel only (internal testers)
npx eas update --channel preview --message "Test new profile copy variant"
```

NEVER use OTA update to change native permissions, push notification entitlements, or Expo config. These require a full native build.

---

## WARNING: Tracking Push Registration Inside a useEffect

**The Problem:**

```typescript
// BAD — fires on every render cycle, not just on permission grant
useEffect(() => {
  registerPushEndpoint();
  posthog.capture('push_registered'); // fires even if already registered
}, [user]);
```

**Why This Breaks:**
1. Re-fires on any context re-render, inflating registration event counts
2. `registerPushEndpoint` upserts on conflict — the event fires but no new registration happened
3. PostHog deduplication relies on event count being accurate; inflation skews funnels

**The Fix:**

Check whether the token already exists before firing the tracking event, or use the `notification_endpoints` table to verify first-time registration:

```typescript
// lib/notifications.ts — inside registerPushEndpoint
const { data: existing } = await supabase
  .from('notification_endpoints')
  .select('id')
  .eq('token', token)
  .single();

const isNewRegistration = !existing;

await supabase.from('notification_endpoints').upsert({ ... }, { onConflict: 'provider,token' });

if (isNewRegistration) {
  posthog.capture('push_notification_registered', { platform });
}
```

---

## Distribution Instrumentation Checklist

- [ ] `push_permission_outcome` fires on native after `requestPermissionsAsync()`
- [ ] `push_notification_registered` fires only on first-time token registration
- [ ] `notification_tapped` fires in `addNotificationResponseReceivedListener`
- [ ] `deep_link_opened` fires in `Linking.getInitialURL()` and `Linking.addEventListener`
- [ ] `invite_code_used` fires in `app/join-family.tsx` with success flag
- [ ] All push tracking is guarded by `Platform.OS !== 'web'`

For ASO and app store discoverability, see the **inspecting-search-coverage** skill.
