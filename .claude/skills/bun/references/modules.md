# Bun Modules Reference

## Contents
- Module Installation Patterns
- Dependency Tree Management
- Platform-Specific Packages
- Monorepo and Workspace Patterns
- EAS Build Compatibility

---

## Module Installation Patterns

### Standard dependency workflow

```bash
# Install all deps from bun.lock
bun install

# Add a production dependency
bun add @supabase/supabase-js

# Add a dev dependency
bun add -d eslint-config-expo

# Remove a dependency
bun remove unused-package
```

### Batch installation

```bash
# Multiple packages at once
bun add date-fns lucide-react-native @nkzw/create-context-hook

# Multiple Expo packages — use expo install
npx expo install expo-blur expo-clipboard expo-haptics
```

### Frozen installs (CI-like)

```bash
# Install exactly what's in bun.lock — fails if lock file is out of date
bun install --frozen-lockfile
```

Use `--frozen-lockfile` in scripts that should never modify the lock file (pre-commit hooks, validation scripts).

---

## Dependency Tree Management

### Inspecting the dependency tree

```bash
# List top-level dependencies
bun pm ls

# List all (including transitive)
bun pm ls --all

# Check why a package is installed
bun pm why react-native-svg
```

### Deduplication

Bun deduplicates automatically during install. If you suspect duplicate packages causing bundle size issues:

```bash
# Check for duplicates
bun pm ls --all | sort | uniq -d
```

### Upgrading dependencies

```bash
# Upgrade a single package to latest compatible version
bun update date-fns

# Upgrade all packages (respects version ranges in package.json)
bun update
```

**WARNING:** Never run `bun update` without reviewing changes. Expo SDK packages have strict version requirements. After upgrading, run:

```bash
npx tsc --noEmit && npx expo start
```

See the **typescript** skill for type checking, and the **expo** skill for SDK version compatibility.

---

## Platform-Specific Packages

### React Native ecosystem packages

Some packages have native modules that Bun installs but Metro/Expo handles at build time:

```bash
# These install normally via bun but have native code
bun add react-native-gesture-handler
bun add react-native-screens

# Expo-managed native packages — MUST use expo install
npx expo install @react-native-async-storage/async-storage
npx expo install @react-native-community/datetimepicker
```

### Web-only packages

```bash
# react-native-web is a production dependency for web support
bun add react-native-web react-dom
```

These packages are already in EBC Connect's `package.json`. Bun installs them alongside native packages — Metro's platform resolution (`*.web.tsx` vs `*.tsx`) handles which code runs where.

### Optional dependencies

Bun installs `optionalDependencies` by default. Some native packages declare platform-specific optional deps:

```bash
# Skip optional deps if they cause install errors on your platform
bun install --ignore-optional
```

---

## Monorepo and Workspace Patterns

### Current setup: Single workspace

EBC Connect is a single-package project — no monorepo configuration:

```jsonc
// package.json — no "workspaces" field
{
  "name": "ebc-connect",
  "private": true
}
```

### If converting to monorepo

Bun supports workspaces via `package.json`:

```jsonc
{
  "workspaces": ["apps/*", "packages/*"]
}
```

**WARNING:** Expo managed workflow has limited monorepo support. If considering a monorepo, see the **expo** skill and Expo's monorepo documentation before restructuring.

---

## EAS Build Compatibility

### How EAS Build handles dependencies

EAS Build runs in a cloud environment and uses `npm` by default — NOT Bun. This means:

1. `bun.lock` is ignored by EAS Build
2. EAS resolves dependencies from `package.json` using npm
3. Version differences between `bun.lock` and npm resolution can cause build failures

### Ensuring consistency between local and EAS

```jsonc
// eas.json — configure install command
{
  "build": {
    "base": {
      "node": "18.18.0"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### Validation checklist before EAS Build

Copy this checklist:
- [ ] Run `npx tsc --noEmit` — no type errors
- [ ] Run `npx expo start` — app starts locally
- [ ] Verify no Bun-specific APIs in source code
- [ ] Check `package.json` version ranges match what `bun.lock` resolved
- [ ] Run `npx expo-doctor` — check for known issues

See the **eas** skill for build profiles and submission workflows.

---

## WARNING: Mixing Package Managers

**The Problem:**

```bash
# Session 1: Used bun
bun add new-package

# Session 2: Accidentally used npm
npm install another-package
# Now package-lock.json exists alongside bun.lock
```

**Why This Breaks:**
1. Two lock files with potentially different dependency trees
2. `node_modules` may be in an inconsistent state
3. EAS Build uses npm — if `package-lock.json` exists, it takes precedence
4. Team members running `bun install` get different results than `npm install`

**The Fix:**

```bash
# Remove the npm lock file
rm package-lock.json

# Reinstall with bun to ensure clean state
rm -rf node_modules && bun install

# Verify only bun.lock exists
ls *.lock*
```

**When You Might Be Tempted:** Running `npx` commands that internally call `npm install`, or following tutorials that use npm commands.
