# Bun Patterns Reference

## Contents
- Package Management Workflow
- Lock File Handling
- Dependency Categories
- Script Execution
- Anti-Patterns

---

## Package Management Workflow

### Adding dependencies to EBC Connect

This project has two categories of packages with different install commands:

```bash
# Expo SDK packages — ALWAYS use expo install
npx expo install expo-image expo-haptics expo-clipboard

# Third-party packages — use bun add
bun add date-fns@^4.1.0
bun add -d @types/react@~19.1.10
```

See the **expo** skill for why `npx expo install` matters for SDK packages.

### Version pinning strategy

The project uses mixed version constraints in `package.json`:

```jsonc
{
  "dependencies": {
    // Tilde (~) for Expo-managed packages — minor patches only
    "expo-blur": "~15.0.8",
    "expo-calendar": "~15.0.7",

    // Caret (^) for third-party packages — minor updates allowed
    "@supabase/supabase-js": "^2.57.4",
    "@tanstack/react-query": "^5.83.0",
    "date-fns": "^4.1.0",

    // Exact for React Native core
    "react": "19.1.0",
    "react-native": "0.81.5"
  }
}
```

**Rule:** Never change Expo-managed version constraints from tilde to caret. Expo pins these for SDK compatibility.

### Overrides

The project uses `overrides` in `package.json` to force specific transitive dependency versions:

```jsonc
{
  "overrides": {
    "expo-location": "~19.0.8"
  }
}
```

Use overrides when a transitive dependency pulls an incompatible version. Prefer `npx expo install` first — only use overrides as a last resort.

---

## Lock File Handling

### bun.lock is the source of truth

```gitignore
# From .gitignore — only bun.lock is committed
package-lock.json
```

**NEVER** run `npm install` in this project. It generates `package-lock.json` which conflicts with `bun.lock` and may resolve different versions.

### Resolving lock file conflicts after merge

```bash
# After git merge/rebase with bun.lock conflicts
git checkout --theirs bun.lock
bun install
git add bun.lock
```

This regenerates `bun.lock` from `package.json` with the merged dependency set.

### WARNING: Committing both lock files

**The Problem:**

```bash
# BAD — running npm alongside bun creates dual lock files
npm install some-package
# Now both package-lock.json AND bun.lock exist
```

**Why This Breaks:**
1. CI/CD and EAS Build may pick the wrong lock file
2. Different dependency resolution between npm and bun causes "works on my machine" bugs
3. Two sources of truth for the dependency tree

**The Fix:**

```bash
# GOOD — always use bun for package operations
bun add some-package
# Verify package-lock.json doesn't exist
ls package-lock.json 2>/dev/null && echo "DELETE THIS FILE"
```

---

## Dependency Categories

### Production vs dev dependencies

```bash
# Production — ships in the bundle
bun add zod

# Dev — build tools, types, linting only
bun add -d @types/react eslint typescript
```

**Rule:** Expo SDK packages, React Native core, and Supabase client are always production dependencies. Type packages (`@types/*`) and build tools are always dev dependencies.

### Peer dependency handling

Bun auto-installs peer dependencies by default. If a peer dep warning appears:

```bash
# Check what peers are expected
bun pm ls --peer

# If a peer is wrong version, use npx expo install for RN ecosystem packages
npx expo install react-native-svg
```

---

## Script Execution

### bun run vs npx

This project uses `npx` for Expo and EAS CLI tools because they need the Expo CLI resolution chain. Use `bun run` for package.json scripts:

```bash
# Package.json scripts
bun run lint          # → expo lint
bun run start         # → npx expo start
bun run build:ios     # → eas build --profile production --platform ios

# Direct CLI tools
npx expo start        # Expo dev server
npx tsc --noEmit      # TypeScript check (see **typescript** skill)
npx eas update        # OTA update (see **eas** skill)
```

### WARNING: Using `bunx` for Expo CLI

**The Problem:**

```bash
# BAD — bunx may resolve a different expo CLI version
bunx expo start
```

**Why This Breaks:**
1. `bunx` downloads and caches its own copy of the CLI
2. Version mismatch with locally installed `expo` package
3. Inconsistent behavior between team members

**The Fix:**

```bash
# GOOD — uses the project's installed expo
npx expo start
```

---

## Anti-Patterns

### WARNING: Running `bun add` for Expo SDK packages

**The Problem:**

```bash
# BAD
bun add expo-camera expo-location expo-notifications
```

**Why This Breaks:**
1. Bun resolves the latest version, which may be incompatible with Expo SDK 54
2. Expo SDK packages have strict peer dependency requirements on specific React Native versions
3. Results in runtime crashes or build failures that are hard to diagnose

**The Fix:**

```bash
# GOOD
npx expo install expo-camera expo-location expo-notifications
```

**When You Might Be Tempted:** Adding multiple Expo packages at once — it feels faster to `bun add` them all, but `npx expo install` accepts multiple packages too.

### WARNING: Deleting bun.lock to "fix" issues

**The Problem:**

```bash
# BAD — nuking the lock file
rm bun.lock && bun install
```

**Why This Breaks:**
1. Generates a completely new dependency tree — versions may shift
2. May introduce breaking changes from minor version bumps
3. Other team members' `bun install` will produce different results until they also regenerate

**The Fix:**

```bash
# GOOD — clean node_modules but keep lock file
rm -rf node_modules && bun install
```

This reinstalls from the existing lock file, preserving exact versions.
