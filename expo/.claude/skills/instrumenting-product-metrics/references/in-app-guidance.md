# In-App Guidance Metrics

## Contents
- Trackable Guidance Surfaces
- Empty State Tracking
- Prompt and CTA Metrics
- Anti-Patterns
- Implementation Patterns

## Trackable Guidance Surfaces

EBC Connect has several in-app guidance surfaces that should be instrumented. These surfaces nudge users through onboarding and feature discovery.

### Dashboard Prompt Cards

`app/(tabs)/dashboard.tsx` conditionally renders two guidance cards:

| Card | Condition | Target Screen |
|------|-----------|---------------|
| "Complete Your Profile" | `profile.role === 'pending' && !person?.first_name` | `/visitor-profile` |
| "Join Your Family" | authenticated, no `family_id` | `/(tabs)/family` |

Track impressions and interactions:

```typescript
// Track when the card renders (once per session)
useEffect(() => {
  if (showProfileCard) {
    posthog.capture('guidance_shown', {
      card: 'complete_profile',
      screen: 'dashboard',
    });
  }
}, [showProfileCard]);

// Track when user taps the card
const handleProfileCardPress = () => {
  posthog.capture('guidance_tapped', {
    card: 'complete_profile',
    screen: 'dashboard',
  });
  router.push('/visitor-profile');
};
```

### Pending Approval Banner

`app/(tabs)/settings.tsx` and `app/(tabs)/family.tsx` both show amber banners for pending users. Track whether users see this and how long they stay in pending state:

```typescript
posthog.capture('pending_banner_shown', {
  screen: 'settings',
  hours_since_signup: hoursSince(profile.created_at),
});
```

### Empty States

Several screens show empty states that are guidance opportunities:

| Screen | Empty Condition | Current UX |
|--------|----------------|------------|
| Prayers | No prayer requests | Text + icon |
| Events | No upcoming events | Text + icon |
| Notifications | No notifications | "No notifications" text |
| Family | No family | Create/Join buttons |
| Forms | No open forms | "No forms" text |

Track empty state impressions to understand how often users hit dead ends:

```typescript
// In any screen with empty state
if (data.length === 0) {
  posthog.capture('empty_state_shown', {
    screen: 'prayers',
    is_first_visit: !hasVisitedPrayers,
  });
}
```

## Biometric Prompt Tracking

`app/(auth)/login.tsx` shows a one-time `Alert.alert` prompt to enable biometric login after the first successful password sign-in. This is a critical adoption moment:

```typescript
// After successful signIn, when biometric prompt shows
Alert.alert(
  'Enable Biometric Login',
  'Would you like to enable biometric authentication?',
  [
    {
      text: 'Not Now',
      onPress: () => {
        posthog.capture('biometric_prompt_dismissed');
      },
    },
    {
      text: 'Enable',
      onPress: async () => {
        await enableBiometric(email, password);
        posthog.capture('biometric_prompt_accepted');
      },
    },
  ]
);
```

## WARNING: Guidance Without Measurement

**The Problem:** The dashboard shows "Complete Your Profile" and "Join Your Family" cards but tracks neither impressions nor taps.

**Why This Breaks:**
1. Cannot measure if guidance actually drives activation
2. No data to justify A/B testing card copy or placement
3. Cannot detect if cards are shown to the wrong cohort (e.g., already-completed users)

**The Fix:** Track `guidance_shown` on render and `guidance_tapped` on press for every prompt card.

## WARNING: Alert.alert as Guidance Surface

**The Problem:** Critical guidance (biometric prompt, sign-out confirmation, family join explanation) uses `Alert.alert`, which is not trackable by default.

**Why This Breaks:**
1. `Alert.alert` callbacks fire synchronously — easy to forget tracking
2. No impression tracking (you only know if they responded, not if they saw it)
3. On web, `Alert.alert` maps to `window.confirm` which has no styling or tracking hooks

**The Fix:** Wrap `Alert.alert` in a tracked helper:

```typescript
function trackedAlert(
  title: string,
  message: string,
  buttons: AlertButton[],
  eventName: string,
  properties?: Record<string, unknown>
) {
  posthog.capture(`${eventName}_shown`, properties);
  Alert.alert(
    title,
    message,
    buttons.map((btn) => ({
      ...btn,
      onPress: () => {
        posthog.capture(`${eventName}_${btn.text?.toLowerCase().replace(/\s/g, '_')}`, properties);
        btn.onPress?.();
      },
    }))
  );
}
```

## DO/DON'T

```typescript
// DON'T — Track guidance impression on every render
posthog.capture('guidance_shown', { card: 'complete_profile' });

// DO — Track once per session with a ref guard
const hasTrackedRef = useRef(false);
useEffect(() => {
  if (showCard && !hasTrackedRef.current) {
    hasTrackedRef.current = true;
    posthog.capture('guidance_shown', { card: 'complete_profile' });
  }
}, [showCard]);
```

```typescript
// DON'T — Track only the tap, not the impression
onPress={() => posthog.capture('guidance_tapped')}

// DO — Track both to compute tap-through rate
// Impression on render, tap on press
// Tap-through rate = guidance_tapped / guidance_shown
```

## Toast Notifications as Feedback Signals

The app uses `hooks/toast-context.tsx` for success/error toasts. These are implicit feedback:

```typescript
// In toast-context.tsx showToast, add a tracking passthrough
function showToast(type: 'success' | 'error' | 'warning' | 'info', message: string) {
  if (type === 'error') {
    posthog.capture('error_shown', { message, screen: getCurrentRoute() });
  }
  // ... existing toast logic
}
```

Track `error_shown` events to find friction points. High-frequency error toasts on specific screens reveal UX problems.

## Guidance Instrumentation Checklist

Copy this checklist and track progress:
- [ ] Add `guidance_shown` / `guidance_tapped` for dashboard prompt cards
- [ ] Add `pending_banner_shown` in settings and family screens
- [ ] Add `empty_state_shown` for prayers, events, notifications, forms
- [ ] Add `biometric_prompt_accepted` / `biometric_prompt_dismissed` in login
- [ ] Add `error_shown` tracking in toast context
- [ ] Verify guidance_tapped / guidance_shown ratio for each card
- [ ] Build dashboard for guidance effectiveness

## Related Skills

- See the **designing-inapp-guidance** skill for guidance UX patterns
- See the **orchestrating-feature-adoption** skill for nudge design
- See the **improving-activation-flow** skill for onboarding guidance
