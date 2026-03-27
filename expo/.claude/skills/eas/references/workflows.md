# EAS Workflows Reference

## Contents
- Full Release Workflow
- OTA Update Workflow
- Development Build Workflow
- Preview / Internal Testing Workflow
- Adding EAS Secrets
- Troubleshooting Build Failures
- Version Bump Workflow

---

## Full Release Workflow

End-to-end process from code to app stores.

Copy this checklist and track progress:
- [ ] Step 1: Validate locally — `npx tsc --noEmit`
- [ ] Step 2: Lint — `expo lint`
- [ ] Step 3: Test on dev server — `npx expo start`
- [ ] Step 4: Bump `expo.version` in `app.json` if needed
- [ ] Step 5: Commit all changes
- [ ] Step 6: Build iOS — `eas build --profile production --platform ios`
- [ ] Step 7: Build Android — `eas build --profile production --platform android`
- [ ] Step 8: Wait for builds to complete (check `eas build:list`)
- [ ] Step 9: Submit iOS — `eas submit --platform ios`
- [ ] Step 10: Submit Android — `eas submit --platform android`

```bash
# Steps 6-7 can run in parallel:
eas build --profile production --platform ios
eas build --profile production --platform android

# Or use the npm script for both:
bun run build:all

# Steps 9-10 after builds complete:
bun run submit:ios
bun run submit:android
```

### Iterate-until-pass for builds:

1. Run `eas build --profile production --platform ios`
2. If build fails, check logs: `eas build:view`
3. Fix the issue (dependency, config, or code error)
4. Repeat from step 1 until build succeeds
5. Only proceed to `eas submit` when build is green

---

## OTA Update Workflow

For JS/TS-only changes that don't touch native config.

```bash
# 1. Validate changes work locally
npx tsc --noEmit
npx expo start --web  # Quick smoke test

# 2. Publish the update
npx eas update

# 3. Verify the update was published
eas update:list
```

### WARNING: Pre-flight check before OTA

Before running `npx eas update`, verify no native changes were made:

```bash
# Check if app.json plugins or permissions changed
git diff app.json
# If plugins/permissions changed → use eas build instead
```

### OTA update with branch targeting

```bash
# Update a specific branch (matches EAS Update channel)
npx eas update --branch production --message "Fix prayer request display bug"

# Update with a specific channel
npx eas update --channel production
```

---

## Development Build Workflow

For local development with a custom dev client.

```bash
# Build dev client for simulators
eas build --profile development --platform all

# Or use the npm script
bun run build:dev
```

The `development` profile:
- Enables `developmentClient: true` (dev menu, hot reload)
- Sets `distribution: "internal"` (install via link)
- iOS builds for **simulator only** (`"simulator": true`)

After the build completes:
1. Download and install the dev client on your simulator/emulator
2. Start the dev server: `npx expo start --dev-client`
3. The app connects to your local Metro bundler

---

## Preview / Internal Testing Workflow

For distributing test builds to team members on real devices.

```bash
# Build for internal distribution
eas build --profile preview --platform all

# Or use the npm script
bun run build:preview
```

The `preview` profile:
- Sets `distribution: "internal"` (install via Expo dashboard link)
- iOS builds for **real devices** (`"simulator": false`)
- No `developmentClient` — runs the production JS bundle

After the build:
1. Share the install link from the Expo dashboard with testers
2. iOS testers need their UDID registered (managed by EAS)
3. Android testers install the APK directly

---

## Adding EAS Secrets

Environment variables for cloud builds. Required for Supabase credentials.

```bash
# List existing secrets
eas secret:list

# Create project-scoped secrets
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://rwbppxcusppltwkcjmdu.supabase.co" \
  --scope project

eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "your-anon-key-here" \
  --scope project

# Delete a secret
eas secret:delete --name SECRET_NAME
```

### WARNING: Never commit secrets

```bash
# BAD — hardcoding in app.json or source files
"supabaseUrl": "https://rwbppxcusppltwkcjmdu.supabase.co"

# GOOD — use EXPO_PUBLIC_ env vars read at build time
import Constants from 'expo-constants';
// or process.env.EXPO_PUBLIC_SUPABASE_URL
```

The `.env` file is gitignored. EAS Secrets provide values during cloud builds.

See the **supabase** skill for client initialization patterns.

---

## Troubleshooting Build Failures

### Check build status and logs

```bash
# List recent builds
eas build:list

# View a specific build's details
eas build:view

# Open build page in browser for full logs
eas build:view --json | jq '.buildDetailsPageUrl'
```

### Common failures and fixes

**"SDK version mismatch"**
```bash
# Ensure all expo-* packages match SDK 54
npx expo install --fix
```

**"Missing provisioning profile" (iOS)**
```bash
# Re-run with credentials reset
eas build --profile production --platform ios --clear-credentials
```

**"Gradle build failed" (Android)**
```bash
# Often a dependency conflict — check the full log
eas build:view
# Try clearing the build cache
eas build --profile production --platform android --clear-cache
```

**Build succeeds but app crashes on launch**
1. Check EAS Secrets are set: `eas secret:list`
2. Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist
3. Check runtime version matches: the OTA update must target the same `expo.version`

### Iterate-until-pass for troubleshooting:

1. Read the build error from `eas build:view`
2. Fix the root cause (dependency, config, credentials)
3. Validate locally: `npx tsc --noEmit && npx expo start`
4. Rebuild: `eas build --profile production --platform <platform>`
5. If build fails again, repeat from step 1

---

## Version Bump Workflow

When to bump `expo.version` in `app.json`:

| Scenario | Action |
|----------|--------|
| Bug fix, minor UI tweak | No version bump needed (OTA update) |
| New feature release | Bump minor: `1.0.0` → `1.1.0` |
| Breaking change or major rework | Bump major: `1.0.0` → `2.0.0` |
| Native dependency added | Bump minor + new build required |

```jsonc
// app.json — before a feature release
{
  "expo": {
    "version": "1.1.0"  // Bumped from 1.0.0
  }
}
```

After bumping, all subsequent OTA updates target the new version. Old builds on `1.0.0` stop receiving updates.

Copy this checklist for version bumps:
- [ ] Update `expo.version` in `app.json`
- [ ] Commit the version bump
- [ ] Run `eas build --profile production --platform all`
- [ ] After builds complete, run `eas submit` for both platforms
- [ ] Publish any pending OTA updates targeting the new version
