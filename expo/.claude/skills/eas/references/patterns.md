# EAS Patterns Reference

## Contents
- Build Profile Configuration
- Version Management
- Runtime Version and OTA Scoping
- Environment Variables in Builds
- Platform-Specific Build Config
- Anti-Patterns

---

## Build Profile Configuration

This project's `eas.json` defines three profiles with distinct purposes:

```jsonc
// eas.json
{
  "cli": {
    "version": ">= 15.0.0",
    "appVersionSource": "local"  // app.json controls version, not EAS dashboard
  },
  "build": {
    "development": {
      "developmentClient": true,     // Enables dev menu, hot reload
      "distribution": "internal",    // Install via QR/link, not stores
      "ios": { "simulator": true }   // Simulator-only for dev
    },
    "preview": {
      "distribution": "internal",    // Install on real devices via link
      "ios": { "simulator": false }  // Real device builds
    },
    "production": {
      "autoIncrement": true          // Auto-bump buildNumber/versionCode
    }
  },
  "submit": {
    "production": {}  // Uses default App Store Connect / Google Play config
  }
}
```

### Profile selection guide

| Goal | Profile | Platform flag |
|------|---------|--------------|
| Local dev with dev client | `development` | `--platform all` |
| Internal testing on real devices | `preview` | `--platform all` |
| App Store / Google Play release | `production` | `--platform ios` or `--platform android` |

---

## Version Management

**`appVersionSource: "local"`** means the version in `app.json` is the canonical source:

```jsonc
// app.json
{
  "expo": {
    "version": "1.0.0"  // This is the marketing version (CFBundleShortVersionString / versionName)
  }
}
```

### WARNING: Forgetting to bump `expo.version`

**The Problem:** Shipping a major feature update without incrementing `expo.version`.

**Why This Breaks:**
1. Runtime version is derived from `appVersion` policy — OTA updates target builds with matching version
2. Users on old builds receive updates intended for new builds, potentially crashing
3. App Store / Google Play may reject submissions with unchanged version strings

**The Fix:**

```jsonc
// GOOD — bump version before production builds with breaking changes
{
  "expo": {
    "version": "1.1.0"  // Bumped for new feature release
  }
}
```

Build numbers (`buildNumber` / `versionCode`) auto-increment in production profile, so you only manage the marketing version manually.

---

## Runtime Version and OTA Scoping

```jsonc
// app.json
{
  "expo": {
    "runtimeVersion": {
      "policy": "appVersion"  // Runtime version = expo.version value
    },
    "updates": {
      "url": "https://u.expo.dev/9a4cd3a2-058f-4e51-8680-365b3e37e030"
    }
  }
}
```

With `appVersion` policy, the runtime version equals `expo.version` (`"1.0.0"`). An OTA update published when version is `"1.0.0"` only reaches builds compiled with that same version.

**Consequence:** If you bump `expo.version` to `"1.1.0"` and publish a production build, OTA updates must also target `"1.1.0"`. Old `"1.0.0"` builds stop receiving updates.

---

## Environment Variables in Builds

EAS Build uses environment variables from multiple sources:

```bash
# Local development — .env file (gitignored)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# EAS Build — set via EAS Secrets (dashboard or CLI)
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..." --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --scope project
```

### WARNING: Missing EAS Secrets

**The Problem:** Build succeeds but app crashes at launch with undefined Supabase client.

**Why This Breaks:** EAS Build runs in the cloud without access to your local `.env` file. `EXPO_PUBLIC_*` variables must be set as EAS Secrets.

**The Fix:** Set both required variables before your first cloud build:

```bash
eas secret:list  # Verify secrets are configured
```

---

## Platform-Specific Build Config

iOS and Android have distinct configuration in `app.json`:

```jsonc
// app.json — iOS-specific
"ios": {
  "bundleIdentifier": "com.ebcconnect.app",
  "supportsTablet": true,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false  // Skips export compliance questionnaire
  }
}

// app.json — Android-specific
"android": {
  "package": "com.ebcconnect.app",
  "permissions": [
    "android.permission.CAMERA",
    "android.permission.USE_BIOMETRIC",
    "android.permission.READ_CALENDAR",
    "android.permission.WRITE_CALENDAR"
    // ... 10+ permissions declared
  ]
}
```

Android permissions are explicit in `app.json`. iOS permissions are declared via plugin `infoPlist` strings.

---

## Anti-Patterns

### WARNING: Running `eas build` without local validation

**The Problem:**

```bash
# BAD — pushing to cloud build without checking locally
eas build --profile production --platform ios
```

**Why This Breaks:**
1. Cloud builds cost time (10-30 min) and quota
2. TypeScript errors or missing imports surface late
3. EAS build logs are harder to debug than local errors

**The Fix:**

```bash
# GOOD — validate locally first
npx tsc --noEmit && npx expo start --web
# Only after local validation passes:
eas build --profile production --platform ios
```

### WARNING: Using `eas update` after native changes

**The Problem:**

```bash
# Added expo-camera plugin to app.json, then:
npx eas update  # BAD — native changes need a full build
```

**Why This Breaks:** The plugin's native code is compiled into the binary at build time. OTA updates only replace the JS bundle. The app will crash or silently fail when calling the new native module.

**The Fix:** After any change to plugins, permissions, or native dependencies:

```bash
eas build --profile production --platform all
# Then users must install the new build
```

See the **expo** skill for the full OTA vs native build decision table.
