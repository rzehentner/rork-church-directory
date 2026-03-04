# Distribution Reference

## Contents
- Distribution Channels
- App Store Distribution
- OTA Update Strategy
- Push Notification Distribution
- Content Distribution by Role
- WARNING: No Deep Linking Strategy

## Distribution Channels

EBC Connect distributes through three channels:

| Channel | Purpose | Implementation |
|---------|---------|---------------|
| App Store / Google Play | New user acquisition | EAS Build + Submit |
| OTA Updates (EAS Update) | Feature delivery to existing users | `npx eas update` |
| Push Notifications | Re-engagement, content distribution | `expo-notifications` |

## App Store Distribution

### Build Profiles

```json
// eas.json profiles (simplified)
{
  "development": { /* simulator/dev client */ },
  "preview": { /* internal distribution (TestFlight/Internal Track) */ },
  "production": { /* store submission */ }
}
```

### DO: Use Preview Builds for Internal Testing

```bash
# GOOD — test with real users before store submission
eas build --profile preview --platform all
# Distributes via TestFlight (iOS) and internal track (Android)
```

### DON'T: Ship Directly to Production Without Preview

```bash
# BAD — no internal testing phase
eas build --profile production --platform ios && eas submit --platform ios
```

**Why this breaks:** Church leadership and beta testers need to validate new features (especially role-gated ones) before the full congregation gets them. A broken admin screen shipped to production erodes trust.

### Submission Checklist

Copy this checklist for each store submission:

- [ ] Run `npx tsc --noEmit` — zero TypeScript errors
- [ ] Run `expo lint` — no lint violations
- [ ] Test on iOS simulator and Android emulator
- [ ] Test on physical device via preview build
- [ ] Verify role-gated features work for each role
- [ ] Update app version in `app.json`
- [ ] Build production: `eas build --profile production --platform all`
- [ ] Submit: `eas submit --platform ios` and `eas submit --platform android`

See the **eas** skill for detailed build configuration.
See the **writing-release-notes** skill for app store descriptions.

## OTA Update Strategy

OTA updates deliver JS bundle changes without app store review. Use for content, copy, and non-native feature changes.

### DO: Use OTA for Tier Copy and Feature Gate Changes

```bash
# GOOD — role gating changes are JS-only, perfect for OTA
# After updating dashboard CTAs or adding a new role check:
npx eas update --branch production --message "Update tier progression CTAs"
```

### DON'T: Use OTA for Native Module Changes

```bash
# BAD — adding a new native dependency requires a full build
# If you added expo-in-app-purchases, OTA won't include the native module
npx eas update  # This will crash on the new native import
```

## Push Notification Distribution

Push notifications are the primary re-engagement channel. They drive users back into tier-specific content.

### Current Implementation

```tsx
// hooks/notification-context.tsx — polls every 30 seconds
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchInterval: 30000,
});
```

### DO: Target Notifications by Role

```tsx
// Announcements already support roles_allowed targeting
// When creating an announcement, specify target roles:
await supabase.from('announcements').insert({
  title: 'Leadership Meeting Update',
  roles_allowed: ['leader', 'admin'],
  // Only leaders and admins receive this notification
});
```

### DON'T: Blast All Users with Admin-Only Content

```tsx
// BAD — sending admin content to all users
await supabase.from('announcements').insert({
  title: 'Admin: Review Pending Users',
  roles_allowed: null, // null = visible to everyone
});
```

**Why this breaks:** Members see content they can't act on. It trains them to ignore notifications. Targeted distribution preserves notification value.

## Content Distribution by Role

The Supabase views handle server-side role filtering:

```tsx
// events_for_me — filters by viewer's role automatically
const { data: events } = await supabase.from('events_for_me').select('*');

// announcements_for_me — same pattern
const { data: announcements } = await supabase
  .from('announcements_for_me').select('*');
```

### Role-Based Content Flow

```
Content Creator (admin/leader)
  → Sets roles_allowed on content
    → Supabase view filters by viewer role
      → Each user sees only their tier's content
```

## WARNING: No Deep Linking Strategy

**The Problem:** The app has no deep linking configuration for sharing content externally. When a member wants to share an event or prayer request outside the app, there's no URL scheme to link directly to that content.

**Impact:**
1. Cannot share specific events/announcements via text or email
2. Push notifications can't deep link to specific screens
3. No way to onboard new users directly to relevant content

**Recommended Fix:**

```tsx
// app.json — add URL scheme
{
  "expo": {
    "scheme": "ebcconnect",
    "web": {
      "bundler": "metro"
    }
  }
}
```

See the **expo-router** skill for typed route configuration.
See the **expo** skill for app.json configuration.
