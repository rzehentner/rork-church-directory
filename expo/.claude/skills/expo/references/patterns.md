# Expo Patterns Reference

## Contents
- Provider Nesting Order
- Platform-Specific File Resolution
- Platform Runtime Branching
- Plugin Configuration
- Environment Variable Safety
- Anti-Patterns

---

## Provider Nesting Order

The root layout (`app/_layout.tsx`) nests providers in dependency order. Getting this wrong causes `undefined` context errors.

```tsx
// app/_layout.tsx — correct nesting order
<QueryClientProvider client={queryClient}>
  <ToastProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserProvider>
          <MeProvider>
            <ChurchSettingsProvider>
              <NotificationProvider>
                <Stack />
              </NotificationProvider>
            </ChurchSettingsProvider>
          </MeProvider>
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  </ToastProvider>
</QueryClientProvider>
```

**Why this order matters:**
- `AuthProvider` needs `QueryClientProvider` (for cache invalidation on logout)
- `UserProvider` needs `AuthProvider` (fetches profile after auth)
- `MeProvider` needs `UserProvider` (derives role checks from profile)
- `ChurchSettingsProvider` needs `MeProvider` (settings may vary by role)
- `NotificationProvider` needs auth + user (registers push token for user)

See the **tanstack-query** skill for QueryClient configuration.

---

## Platform-Specific File Resolution

Metro bundler resolves platform-specific files by extension priority:

| Platform | Resolution order |
|----------|-----------------|
| iOS | `.ios.tsx` → `.native.tsx` → `.tsx` |
| Android | `.android.tsx` → `.native.tsx` → `.tsx` |
| Web | `.web.tsx` → `.tsx` |

### DO: Use `.web.tsx` for divergent implementations

```typescript
// components/DateTimePicker.tsx — native (uses native picker)
import NativeDateTimePicker from '@react-native-community/datetimepicker';

export default function DateTimePicker({ value, mode, onChange, ...rest }: Props) {
  return <NativeDateTimePicker value={value} mode={mode} onChange={onChange} {...rest} />;
}

// components/DateTimePicker.web.tsx — web (uses HTML input)
export default function DateTimePicker({ value, mode = 'date', onChange }: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    onChange?.({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
  };
  return <input type={mode === 'datetime' ? 'datetime-local' : mode} onChange={handleChange} />;
}
```

### DON'T: Mix platform files with runtime checks

```typescript
// BAD — defeats the purpose of platform files
// components/DateTimePicker.tsx
import { Platform } from 'react-native';
export default function DateTimePicker(props: Props) {
  if (Platform.OS === 'web') {
    return <input type="date" />;  // Web-only API in shared file
  }
  return <NativeDateTimePicker {...props} />;
}
```

**Why this breaks:** Web-only APIs (`<input>`) and native-only imports (`NativeDateTimePicker`) in the same file cause bundler errors on the opposite platform. Platform files let Metro tree-shake the unused implementation.

---

## Platform Runtime Branching

Use `Platform.OS` for minor behavioral differences within shared code.

### Pattern: Feature gating by platform

```typescript
// hooks/auth-context.tsx — biometrics only on native
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

async function authenticateWithBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to continue',
  });
  return result.success;
}
```

### Pattern: Storage adapter selection

```typescript
// lib/supabase.ts — AsyncStorage on native, browser storage on web
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
```

**Rule of thumb:** If the branching exceeds ~10 lines per platform, use a `.web.tsx` file instead.

---

## Plugin Configuration

Expo plugins modify native project config at build time without ejecting.

### Pattern: Permission-granting plugins

```jsonc
// app.json — plugins array
"plugins": [
  ["expo-image-picker", {
    "photosPermission": "The app accesses your photos for event images and profile pictures."
  }],
  ["expo-local-authentication", {
    "faceIDPermission": "Allow EBC Connect to use Face ID for quick login."
  }],
  "expo-calendar",
  "expo-notifications",
  ["expo-media-library", {
    "photosPermission": "Allow EBC Connect to access your photos.",
    "savePhotosPermission": "Allow EBC Connect to save photos."
  }]
]
```

**Why permission strings matter:** iOS App Store reviewers reject apps with generic permission messages. Always explain WHY the app needs the permission in user-facing language.

### WARNING: Adding plugins requires a new native build

Plugins modify native code. After adding or changing a plugin:
1. Run `eas build` to create a new native build
2. OTA updates (`eas update`) will NOT pick up plugin changes
3. Users on old builds will crash if JS code references new native modules

---

## Environment Variable Safety

### DO: Prefix client variables with `EXPO_PUBLIC_`

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://rwbppxcusppltwkcjmdu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### DON'T: Expose secrets via `EXPO_PUBLIC_`

```bash
# BAD — this gets bundled into the JS and is visible to anyone
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
EXPO_PUBLIC_STRIPE_SECRET_KEY=sk_live_...
```

**Why this breaks:** `EXPO_PUBLIC_` variables are inlined into the JavaScript bundle at build time. Anyone can extract them from the app binary. Use Supabase Edge Functions or a backend proxy for secret-dependent operations.

### WARNING: Env var changes require restart

After modifying `.env`, you must restart the Expo dev server. Metro caches env vars at startup — hot reload will NOT pick up changes.

---

## Anti-Patterns

### WARNING: Importing native modules on web without guards

**The Problem:**

```typescript
// BAD — crashes on web because expo-secure-store has no web implementation
import * as SecureStore from 'expo-secure-store';

export async function getToken() {
  return await SecureStore.getItemAsync('token');  // Runtime crash on web
}
```

**Why This Breaks:**
1. Many Expo packages have no web implementation (SecureStore, LocalAuthentication, Haptics)
2. The import succeeds but method calls throw at runtime
3. Web users see a white screen with no useful error

**The Fix:**

```typescript
// GOOD — guard with Platform.OS before calling native-only APIs
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return await SecureStore.getItemAsync('token');
}
```

### WARNING: Using `expo install` instead of `bun add` then version-checking

This project uses Bun as its package manager. Use `npx expo install` (not `bun add`) when adding Expo SDK packages — it resolves the correct version for the current SDK.

```bash
# GOOD — resolves compatible version for Expo 54
npx expo install expo-camera

# BAD — may install incompatible version
bun add expo-camera
```

See the **bun** skill for package management details.
