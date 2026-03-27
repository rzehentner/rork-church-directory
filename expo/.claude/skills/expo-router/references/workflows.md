# Expo Router Workflows

## Contents
- Adding a New Screen
- Adding a New Tab
- Auth-Gated Navigation Flow
- Form Submission Navigation
- Validating Route Changes

## Adding a New Screen

Copy this checklist and track progress:
- [ ] Step 1: Create `app/my-screen.tsx` with default export
- [ ] Step 2: Register in `app/_layout.tsx` with `<Stack.Screen name="my-screen" />`
- [ ] Step 3: Create `styles/my-screen.styles.ts` for StyleSheet
- [ ] Step 4: Add navigation calls (`router.push`) from source screens
- [ ] Step 5: Run `npx tsc --noEmit` to verify types

### Screen File Template

```typescript
// app/my-screen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useMe } from '@/hooks/me-context';
import { Colors } from '@/constants/colors';
import { styles } from '@/styles/my-screen.styles';

export default function MyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { personId } = useMe();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'My Screen' }} />
      {/* content */}
    </View>
  );
}
```

### Layout Registration

```typescript
// app/_layout.tsx — add inside RootLayoutNav
<Stack.Screen name="my-screen" options={{ title: "My Screen" }} />
```

**Forgetting to register the screen in `_layout.tsx`** causes Expo Router to render it with default options or miss it entirely in the stack. Always register.

### WARNING: Screen Without Layout Registration

**The Problem:**

```typescript
// BAD - file exists at app/my-screen.tsx but not registered in _layout.tsx
// Screen renders but with default header, no back button title, no options
```

**Why This Breaks:**
1. `headerBackTitle: "Back"` from `screenOptions` won't apply
2. Custom title won't appear — user sees the filename
3. The screen may flash or animate incorrectly

**The Fix:**

Always add a `<Stack.Screen>` entry in `app/_layout.tsx` for every new top-level screen.

## Adding a New Tab

Copy this checklist and track progress:
- [ ] Step 1: Create `app/(tabs)/my-tab.tsx` with default export
- [ ] Step 2: Add `<Tabs.Screen>` in `app/(tabs)/_layout.tsx`
- [ ] Step 3: Choose visible (with icon) or hidden (`href: null`)
- [ ] Step 4: If hidden, add navigation from dashboard or other screens
- [ ] Step 5: Create corresponding styles file

### Visible Tab

```typescript
// app/(tabs)/_layout.tsx
import { Bookmark } from 'lucide-react-native';

<Tabs.Screen
  name="my-tab"
  options={{
    title: "My Tab",
    tabBarIcon: ({ color, size }) => <Bookmark size={size} color={color} />,
  }}
/>
```

See the **lucide-react-native** skill for available icons.

### Hidden Tab (Hub Pattern)

```typescript
// app/(tabs)/_layout.tsx
<Tabs.Screen name="my-tab" options={{ href: null }} />
```

Then navigate from the dashboard quick actions array:

```typescript
// app/(tabs)/dashboard.tsx
const quickActions: QuickAction[] = [
  // ...existing actions
  { id: 'my-tab', label: 'My Tab', route: '/(tabs)/my-tab', /* ... */ },
];
```

### WARNING: Visible Tab Without Icon

**The Problem:**

```typescript
// BAD - visible tab with no icon renders an empty space in the tab bar
<Tabs.Screen name="my-tab" options={{ title: "My Tab" }} />
```

**Why This Breaks:**
1. Tab bar renders a blank square — users can't identify the tab
2. Inconsistent with the existing 4-tab layout
3. On small screens, empty icon area wastes space

**The Fix:**

Either add a `tabBarIcon` or hide the tab with `href: null`.

## Auth-Gated Navigation Flow

The `app/index.tsx` entry screen orchestrates the auth redirect:

```
App Launch
    │
    ▼
index.tsx (loading spinner)
    │
    ├─ authLoading || userLoading → show spinner
    │
    ├─ user exists + needs profile → router.replace('/visitor-profile')
    │
    ├─ user exists + has profile  → router.replace('/(tabs)/dashboard')
    │
    └─ no user                    → router.replace('/(auth)/login')
```

Key implementation details:

```typescript
// Prevent double navigation with a ref
const isNavigatingRef = useRef(false);

useEffect(() => {
  if (!authLoading && !userLoading && !isNavigatingRef.current) {
    isNavigatingRef.current = true;
    if (user) {
      router.replace('/(tabs)/dashboard' as any);
    } else {
      router.replace('/(auth)/login' as any);
    }
  }
}, [user, profile, person, authLoading, userLoading]);
```

**The `isNavigatingRef` pattern prevents:** React re-renders triggering multiple `router.replace()` calls, which causes flickering and "navigate to the same route" warnings.

### Post-Login Redirect

```typescript
// app/(auth)/login.tsx — after successful auth
router.replace('/(tabs)/dashboard' as any);
```

### Logout Redirect

```typescript
// From any screen after clearing session
router.replace('/(auth)/login' as any);
```

## Form Submission Navigation

Forms follow a consistent pattern: navigate forward to form, navigate back on success.

### Create Flow (Push → Back)

```typescript
// 1. Navigate to create screen
router.push('/create-event' as any);

// 2. Inside create-event.tsx, on success:
router.back();
// OR replace to the listing if you don't want back to return to the form:
router.replace('/(tabs)/events' as any);
```

### Edit Flow (Push with Params → Back)

```typescript
// 1. Navigate with the item ID
router.push(`/edit-event?id=${event.id}` as any);

// 2. Inside edit-event.tsx:
const params = useLocalSearchParams();
const eventId = params.id as string;

// 3. On save success:
router.back();

// 4. On delete success:
router.back();
```

### Detail → Sub-Form Flow

```typescript
// event-detail.tsx → signup form
router.push(`/signup-form?formId=${signupForm.id}` as any);

// event-detail.tsx → create linked form
router.push(`/create-signup-form?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}` as any);
```

### WARNING: router.push() After Mutation Without Invalidation

**The Problem:**

```typescript
// BAD - navigate back but stale data shows
await saveEvent(data);
router.back(); // List still shows old data
```

**Why This Breaks:**
1. The previous screen's data was fetched before the mutation
2. Without cache invalidation, the user sees stale state
3. They must pull-to-refresh manually

**The Fix:**

```typescript
// GOOD - invalidate queries before navigating back
await saveEvent(data);
queryClient.invalidateQueries({ queryKey: ['events'] });
router.back();
```

See the **tanstack-query** skill for query invalidation patterns.

## Validating Route Changes

After modifying routes, verify everything works:

1. Run TypeScript check:
   ```bash
   npx tsc --noEmit
   ```
2. If check fails, fix type errors and repeat until it passes
3. Start the dev server and test navigation:
   ```bash
   npx expo start --web
   ```
4. Verify on web first (fastest iteration), then test on device

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "No route named X" | Screen not registered in `_layout.tsx` | Add `<Stack.Screen name="X" />` |
| Blank screen on navigate | Screen file doesn't export default | Add `export default function` |
| Tab not appearing | Missing `tabBarIcon` or wrong `name` | Check `name` matches filename exactly |
| Params undefined | Wrong `useLocalSearchParams` generic | Match generic to actual query string keys |
| Double navigation warning | Multiple `router.replace()` in effect | Guard with `useRef` flag (see auth flow above) |
