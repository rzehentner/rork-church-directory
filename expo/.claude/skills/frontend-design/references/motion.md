# Motion Reference

## Contents
- Animation Stack
- Toast Slide-In Animation
- Skeleton Pulse Animation
- Haptic Feedback
- Animation Timing Conventions
- WARNING: Missing useNativeDriver
- WARNING: Reanimated Not Needed
- Adding New Animations

## Animation Stack

The app uses React Native's built-in `Animated` API — no `react-native-reanimated`. This keeps the dependency tree light and avoids Reanimated's babel plugin complexity.

Available animation primitives:
- `Animated.timing()` — smooth value transitions
- `Animated.parallel()` — run multiple animations simultaneously
- `Animated.sequence()` — run animations one after another
- `Animated.loop()` — repeat animations indefinitely

Haptic feedback via `expo-haptics` complements visual animations on native.

## Toast Slide-In Animation

From `components/Toast.tsx`. Toasts slide down from off-screen and fade in simultaneously.

```typescript
const translateY = useRef(new Animated.Value(-100)).current;
const opacity = useRef(new Animated.Value(0)).current;

// Slide in
const animateIn = () => {
  Animated.parallel([
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start();
};

// Slide out
const animateOut = () => {
  Animated.parallel([
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }),
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }),
  ]).start();
};

// Apply to view
<Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
```

## Skeleton Pulse Animation

From `components/Skeleton.tsx`. A looping opacity pulse that signals loading.

```typescript
const opacity = useRef(new Animated.Value(0.3)).current;

useEffect(() => {
  const animation = Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: true,
      }),
    ])
  );

  animation.start();
  return () => animation.stop();  // Cleanup on unmount
}, [opacity]);

return (
  <Animated.View style={[styles.skeleton, { width, height, borderRadius, opacity }]} />
);
```

Key details:
- Oscillates between 0.3 and 1.0 opacity
- 1000ms per direction (2s full cycle)
- Returns cleanup function to stop animation on unmount

## Haptic Feedback

The app uses `expo-haptics` for tactile feedback on native devices. See the **expo** skill for platform-gating.

```typescript
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Light tap — button presses, selections
if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// Medium tap — confirmations, toggles
if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

// Success notification — completed actions
if (Platform.OS !== 'web') {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// Error notification — failed actions
if (Platform.OS !== 'web') {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
```

### WARNING: Haptics on Web

**The Problem:**

```typescript
// BAD — crashes on web
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

**Why This Breaks:** `expo-haptics` is native-only. Calling it on web throws a runtime error.

**The Fix:**

```typescript
// GOOD — platform guard
if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

## Animation Timing Conventions

| Animation | Duration | Easing |
|-----------|----------|--------|
| Toast in/out | 300ms | Default (ease-in-out) |
| Skeleton pulse | 1000ms per phase | Default |
| Modal slide | System default via `animationType="slide"` | Native |
| Modal fade | System default via `animationType="fade"` | Native |

The app keeps durations under 500ms for interactive animations. Skeleton pulses are intentionally slower since they indicate waiting, not responding.

### When to Use Each Duration

- **100-200ms** — Micro-interactions (opacity toggles, color changes)
- **250-350ms** — Component transitions (toast, dropdown, panel)
- **500-1000ms** — Ambient animations (skeleton pulse, progress indicators)

## WARNING: Missing useNativeDriver

**The Problem:**

```typescript
// BAD — runs animation on JS thread
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
}).start();
```

**Why This Breaks:** Without `useNativeDriver: true`, animations run on the JavaScript thread. Any JS work (re-renders, data fetching) causes jank and dropped frames. On lower-end Android devices this is immediately visible.

**The Fix:**

```typescript
// GOOD — runs on native UI thread, 60fps guaranteed
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,
  useNativeDriver: true,
}).start();
```

**Limitation:** `useNativeDriver` only supports `transform` and `opacity`. Layout properties (`width`, `height`, `padding`, `margin`) cannot use the native driver. For layout animations, accept JS-thread performance or use `LayoutAnimation`.

## WARNING: Reanimated Not Needed

Do NOT add `react-native-reanimated` unless implementing gesture-driven animations (swipe-to-dismiss, drag-and-drop). The built-in `Animated` API handles all current patterns. Reanimated adds:
- Babel plugin requirement
- Build complexity
- Larger bundle size
- Potential native module conflicts

If gesture animations become needed, `react-native-gesture-handler` is already installed — pair it with Reanimated at that point.

## Adding New Animations

Follow this pattern for any new animated component:

```typescript
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export default function FadeInView({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      {children}
    </Animated.View>
  );
}
```

Checklist for new animations:
- [ ] Use `useRef(new Animated.Value(...)).current` — not `useState`
- [ ] Always set `useNativeDriver: true` for transform/opacity
- [ ] Return cleanup function from `useEffect` if animation loops
- [ ] Guard haptics with `Platform.OS !== 'web'`
- [ ] Keep duration under 500ms for interactive animations
