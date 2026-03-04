# Expo Workflows Reference

## Contents
- Development Server
- Adding Expo Packages
- Adding a New Screen
- Platform-Specific Component Workflow
- OTA Updates vs Native Builds
- Debugging Common Issues

---

## Development Server

### Starting the dev server

```bash
# Standard start (shows QR for Expo Go or dev client)
npx expo start

# Tunnel mode (for physical devices when LAN doesn't work)
npx expo start --tunnel

# Web only
npx expo start --web
```

### Validation before starting

```bash
# Type check
npx tsc --noEmit

# Lint
expo lint
```

See the **typescript** skill for type-checking patterns.

### Copy this checklist for dev setup:
- [ ] Copy `.env.example` to `.env` and fill in Supabase credentials
- [ ] Run `bun install` to install dependencies
- [ ] Run `npx expo start` to start dev server
- [ ] Verify app loads on target platform (iOS simulator, Android emulator, or web)

---

## Adding Expo Packages

ALWAYS use `npx expo install` for Expo SDK packages. It resolves the version compatible with the current SDK (54.x).

```bash
# GOOD — Expo resolves the correct version
npx expo install expo-camera

# BAD — may install incompatible version
bun add expo-camera
```

### Workflow: Adding a package with native config

1. Install the package:
   ```bash
   npx expo install expo-camera
   ```

2. Add plugin config to `app.json` if required:
   ```jsonc
   // app.json
   "plugins": [
     ["expo-camera", {
       "cameraPermission": "Allow EBC Connect to use the camera."
     }]
   ]
   ```

3. Add platform permissions to `app.json` if needed:
   ```jsonc
   // app.json — android.permissions
   "permissions": ["CAMERA"]
   ```

4. Rebuild native app (plugin changes need a new build):
   ```bash
   eas build --profile development --platform all
   ```

5. Validate: `npx tsc --noEmit`
6. If type errors, fix and repeat step 5

### WARNING: OTA updates cannot deliver native changes

After adding or changing an Expo plugin, `eas update` will NOT work. Users must install a new native build. Plan native dependency additions carefully.

---

## Adding a New Screen

Expo Router uses file-based routing. Creating a file in `app/` creates a route.

### Workflow: Add a top-level screen

1. Create the screen file:
   ```typescript
   // app/new-feature.tsx
   import { View, Text, StyleSheet } from 'react-native';
   import { Stack } from 'expo-router';
   import { Colors } from '@/constants/colors';

   export default function NewFeatureScreen() {
     return (
       <View style={styles.container}>
         <Stack.Screen options={{ title: 'New Feature', headerShown: true }} />
         <Text>New feature content</Text>
       </View>
     );
   }

   const styles = StyleSheet.create({
     container: { flex: 1, backgroundColor: Colors.warmWhite },
   });
   ```

2. Navigate to it from another screen:
   ```typescript
   import { router } from 'expo-router';
   router.push('/new-feature');
   ```

3. For complex styles, create a separate style file:
   ```typescript
   // styles/new-feature.styles.ts
   import { StyleSheet } from 'react-native';
   import { Colors } from '@/constants/colors';

   export const styles = StyleSheet.create({
     container: { flex: 1, backgroundColor: Colors.warmWhite },
   });
   ```

See the **expo-router** skill for route groups, tabs, and typed navigation.

### Workflow: Add a tab screen

1. Create the screen in `app/(tabs)/`:
   ```typescript
   // app/(tabs)/new-tab.tsx
   export default function NewTabScreen() { /* ... */ }
   ```

2. Register in `app/(tabs)/_layout.tsx`:
   ```tsx
   <Tabs.Screen
     name="new-tab"
     options={{
       title: 'New Tab',
       tabBarIcon: ({ color, size }) => <SomeIcon color={color} size={size} />,
     }}
   />
   ```

3. To hide a tab but keep it routable (hub navigation pattern):
   ```tsx
   <Tabs.Screen
     name="new-tab"
     options={{ href: null }}  // Hidden from tab bar
   />
   ```

See the **lucide-react-native** skill for icon selection.

Copy this checklist for new screens:
- [ ] Create screen file in `app/` (kebab-case filename)
- [ ] Export default function component (PascalCase name)
- [ ] Add `<Stack.Screen options={{ ... }} />` for header config
- [ ] Create style file in `styles/` if styles are complex
- [ ] Add navigation from source screen (`router.push`)
- [ ] Run `npx tsc --noEmit` to verify types
- [ ] Test on web and native

---

## Platform-Specific Component Workflow

**When:** A component needs different implementations for web vs native.

1. Create the native implementation:
   ```typescript
   // components/MyComponent.tsx
   import { View } from 'react-native';

   interface Props {
     value: string;
     onChange: (value: string) => void;
   }

   export default function MyComponent({ value, onChange }: Props) {
     // Native-specific implementation
   }
   ```

2. Create the web implementation with identical interface:
   ```typescript
   // components/MyComponent.web.tsx
   interface Props {
     value: string;
     onChange: (value: string) => void;
   }

   export default function MyComponent({ value, onChange }: Props) {
     // Web-specific implementation using HTML elements
   }
   ```

3. Import normally — Metro resolves the correct file:
   ```typescript
   import MyComponent from '@/components/MyComponent';
   // Resolves to MyComponent.web.tsx on web, MyComponent.tsx on native
   ```

**Critical rule:** Both files MUST export the same Props interface and default export. Mismatched interfaces cause type errors on one platform but not the other.

Copy this checklist:
- [ ] Create `ComponentName.tsx` (native)
- [ ] Create `ComponentName.web.tsx` (web)
- [ ] Ensure identical Props interface in both files
- [ ] Ensure identical default export name
- [ ] Test on both web and native platforms

---

## OTA Updates vs Native Builds

| Change type | Delivery method | Command |
|-------------|----------------|---------|
| JS/TS code changes | OTA update | `npx eas update` |
| Style changes | OTA update | `npx eas update` |
| New Expo plugin | Native build | `eas build` |
| Plugin config change | Native build | `eas build` |
| app.json permission change | Native build | `eas build` |
| SDK version upgrade | Native build | `eas build` |
| Asset additions | OTA update | `npx eas update` |

See the **eas** skill for build profiles and submission workflows.

---

## Debugging Common Issues

### "Invariant Violation: Module does not exist in the Haste module map"

**Cause:** Imported a module that isn't installed or has a typo.

```bash
# Fix: install the missing package
npx expo install <package-name>
# Then restart Metro
npx expo start --clear
```

### White screen on web with no error

**Cause:** Native-only API called without Platform guard.

```typescript
// Check for unguarded native calls
// BAD
await SecureStore.getItemAsync('key');

// GOOD
if (Platform.OS !== 'web') {
  await SecureStore.getItemAsync('key');
}
```

### "Cannot find native module" after adding a package

**Cause:** Package has native code but no new native build was created.

```bash
# Fix: create a new development build
eas build --profile development --platform all
```

### Metro cache stale after env var change

**Cause:** Metro caches `EXPO_PUBLIC_` values at startup.

```bash
# Fix: clear cache and restart
npx expo start --clear
```

### Iterate-until-pass pattern for build issues:

1. Make changes to `app.json` or install packages
2. Validate: `npx tsc --noEmit`
3. If type errors exist, fix and repeat step 2
4. Test: `npx expo start` — verify app loads
5. If Metro errors, run `npx expo start --clear` and repeat step 4
6. Only proceed to `eas build` when local dev server works
