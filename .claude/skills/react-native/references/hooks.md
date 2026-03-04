# Hooks Reference

## Contents
- createContextHook Pattern
- Provider Nesting Order
- Auth & Me Context Usage
- WARNING: Stale Closures in useCallback
- WARNING: Missing Listener Cleanup
- Confirmation Dialog Pattern

---

## createContextHook Pattern

All app contexts use `@nkzw/create-context-hook`. Pattern: define an interface, call `createContextHook`, export the provider/hook pair as named constants. The hook throws if used outside its provider — no manual null checks needed.

```typescript
// hooks/auth-context.tsx — real pattern
import { createContextHook } from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isBiometricEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe(); // ALWAYS clean up
  }, []);

  return { session, isLoading, isBiometricEnabled, signIn, signOut };
});
```

**DO:** Export `[XxxProvider, useXxx]` as named constants. Use the interface as the generic type argument.

**DON'T:** Use raw `createContext` + manual `useContext` — every context in this project uses `createContextHook`.

---

## Provider Nesting Order

Order matters: inner providers can consume outer hooks. Defined in `app/_layout.tsx`:

```
QueryClientProvider
  └─ ToastProvider
       └─ AuthProvider
            └─ UserProvider       ← calls useAuth()
                 └─ MeProvider    ← calls useAuth() + useUser()
                      └─ ChurchSettingsProvider
                           └─ NotificationProvider
```

When adding a context that depends on `useAuth` or `useUser`, nest it **inside** those providers. Violating this order causes "hook used outside provider" runtime errors.

---

## Derived State with MeContext

`me-context.tsx` computes role booleans from `useAuth` + `useUser`. Zero async operations — pure derivations.

```typescript
// hooks/me-context.tsx
export const [MeProvider, useMeContext] = createContextHook<MeState>(() => {
  const { user, session } = useAuth();
  const { profile, person } = useUser();

  const isAdmin = profile?.role === 'admin';
  const isAdminOrLeader = isAdmin || profile?.role === 'leader';
  const displayName = person
    ? `${person.first_name || ''} ${person.last_name || ''}`.trim()
    : user?.email || 'User';

  return { isAdmin, isAdminOrLeader, displayName, isAuthenticated: !!session };
});
```

**DO:** Use `useMeContext()` for role checks (`isAdmin`, `isAdminOrLeader`, `displayName`).

**DON'T:** Compare `profile?.role === 'admin'` directly in screens — that logic belongs in `MeProvider`.

---

## Platform-Gated Auth Features

Biometric auth and secure storage are native-only. Guard with `Platform.OS !== 'web'`:

```typescript
// Biometric auth — only on native
if (Platform.OS !== 'web') {
  const { biometricSignIn, isBiometricAvailable } = useAuth();
}
```

---

## WARNING: Stale Closures in useCallback

**The Problem:**

```typescript
// BAD — allEvents is always the initial [] empty array
const handleFilter = useCallback(() => {
  return allEvents.filter(e => e.title.includes(query));
}, []); // missing allEvents and query
```

**Why This Breaks:**
1. The callback captures the value of `allEvents` at creation time — it never sees updates.
2. User gets empty results after data loads even though state updated.
3. The `exhaustive-deps` ESLint rule catches this — run `expo lint`.

**The Fix:**

```typescript
// GOOD — include all referenced state
const handleFilter = useCallback(() => {
  return allEvents.filter(e => e.title.includes(query));
}, [allEvents, query]);
```

---

## WARNING: Missing Listener Cleanup

**The Problem:**

```typescript
// BAD — subscription fires after unmount
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(handleNotification);
  // no return
}, []);
```

**Why This Breaks:**
1. Every screen mount adds a new listener without removing the old one.
2. Fast navigation creates duplicate handlers; memory grows on long sessions.
3. `setState` on unmounted components produces React warnings.

**The Fix:**

```typescript
// GOOD — cleanup pattern from notification-context.tsx
useEffect(() => {
  if (Platform.OS === 'web') return; // push notifications are native-only

  const listener = Notifications.addNotificationReceivedListener(() => refetch());
  return () => Notifications.removeNotificationSubscription(listener);
}, [refetch]);
```

Same pattern applies to `supabase.auth.onAuthStateChange`, `NetInfo.addEventListener`, and `AppState.addEventListener`.

---

## Confirmation Dialog Pattern

`Toast.tsx` exports `useConfirmation()`. Renders `Alert.alert` on native, custom `Modal` on web.

```typescript
import { useConfirmation } from '@/components/Toast';

export default function EventDetail() {
  const { showConfirmation, ConfirmationRenderer } = useConfirmation();

  const handleDelete = () => {
    showConfirmation(
      'Delete Event',
      'This cannot be undone.',
      async () => {
        await deleteEvent(id);
        router.back();
      },
      { confirmText: 'Delete', confirmStyle: 'destructive' }
    );
  };

  return (
    <View>
      {/* screen content */}
      <ConfirmationRenderer />  {/* must be in the JSX tree */}
    </View>
  );
}
```

See the **tanstack-query** skill for `useMutation` patterns that pair with these hooks.
See the **supabase** skill for service-layer error throwing that screens catch.
