# Distribution Reference

## Contents
- Distribution Channels
- Push Notifications
- App Store Surfaces
- Deep Linking
- OTA Updates
- Missing Touchpoints
- Anti-Patterns

---

## Distribution Channels

EBC Connect reaches users through four channels:

| Channel | Surface | File |
|---------|---------|------|
| App Store (iOS) | Listing, screenshots | EAS Build + `eas submit` |
| Google Play (Android) | Listing, screenshots | EAS Build + `eas submit` |
| Web | `expo-router` web bundle | `npx expo start --web` |
| Push notifications | Native only (iOS/Android) | `lib/notifications.ts` |

Bundle ID: `com.ebcconnect.app` (both platforms).

---

## Push Notifications

Push notifications are the primary re-engagement channel. Registration is in `lib/notifications.ts`:

```typescript
// lib/notifications.ts — token registration on first auth
export async function registerPushEndpoint(userId: string) {
  const token = await Notifications.getExpoPushTokenAsync({ projectId })
  await supabase.from('notification_endpoints').upsert({
    user_id: userId,
    token: token.data,
    platform: Platform.OS,
  })
}
```

Registration is triggered from `hooks/notification-context.tsx` when the user authenticates:

```typescript
// hooks/notification-context.tsx
useEffect(() => {
  if (userId && Platform.OS !== 'web') {
    registerPushEndpoint(userId)
  }
}, [userId])
```

**Web users have no push channel.** Use in-app Toast banners for re-engagement on web.

### Event Reminder Scheduling

```typescript
// lib/notifications.ts — schedule a local notification for an event
export async function scheduleEventReminder(event: Event) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: event.title,
      body: `Reminder: starts in 1 hour`,
    },
    trigger: { date: reminderTime },
  })
}
```

### Notification Types That Drive Re-engagement

| Notification | Status | Impact |
|-------------|--------|--------|
| Event reminders | Implemented | High — time-sensitive action |
| New announcement | Missing | High — regular content cadence |
| Prayer activity ("3 people prayed for you") | Missing | High — social reciprocity |
| Account approved | **Missing — critical gap** | Highest — removes churn at gate 3 |
| Birthday (directory) | Missing | Medium — delight/retention |

---

## App Store Surfaces

The App Store listing is a landing surface for prospective members. Key fields:

- **App name**: `EBC Connect`
- **Subtitle** (iOS, 30 chars): Use benefit-specific copy, e.g. "Your church, always with you"
- **Description**: First 3 lines display before "More" — front-load the value proposition
- **Screenshots**: Show the dashboard and events — these are the highest-engagement screens

Build and submit:

```bash
# Production build
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores after build completes
eas submit --platform ios
eas submit --platform android
```

---

## Deep Linking

Expo Router handles deep links via file-based routing. Configure the URL scheme in `app.json`:

```json
{
  "expo": {
    "scheme": "ebcconnect"
  }
}
```

Deep link patterns for shareable content:
- `ebcconnect://event-detail?id=[id]` → `app/event-detail.tsx`
- `ebcconnect://signup-form?id=[id]` → `app/signup-form.tsx`
- `ebcconnect://potluck-sheet?id=[id]` → `app/potluck-sheet.tsx`

These links can be embedded in push notification payloads to route users directly to content.

See the **expo-router** skill for typed route patterns.
See the **inspecting-search-coverage** skill for web Open Graph and deep link audit patterns.

---

## OTA Updates

OTA updates via `npx eas update` push JS bundle changes to all published builds without a store review cycle:

```bash
# Publish OTA update (JS-only changes)
npx eas update
```

**Use OTA for:** Copy changes (taglines, CTAs, empty states), bug fixes, feature flag toggles.

**NEVER use OTA for:** New native permissions, new native modules, changes to `app.json` that affect native config. These require a full EAS build.

---

## Missing Touchpoints

### WARNING: No Account Approval Notification

The highest-impact missing distribution touchpoint is the account approval notification. When an admin approves a pending member, no push notification is sent. Members don't know they can now access the app.

**Fix:** Add a Supabase database trigger on `profiles.status` change from `pending` → `member`, then send a push via Expo's push API to the user's registered token in `notification_endpoints`.

### WARNING: Web Users Silently Excluded from Push

Web sessions never call `registerPushEndpoint`. Re-engage web users with in-app banners using the existing Toast system:

```typescript
// hooks/toast-context.tsx — use for web re-engagement
showToast('New announcements since your last visit', 'info')
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No approval notification | Members abandon during pending wait | Supabase trigger → push on status change |
| OTA for native changes | Silent failure or broken app | Audit change scope before publishing |
| Deep links without fallback | Broken experience if app not installed | Add universal link / web fallback |
| App Store screenshots showing empty states | Misrepresents value | Use populated demo content in screenshots |
