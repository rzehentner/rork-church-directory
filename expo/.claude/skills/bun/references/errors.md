# Bun Errors Reference

## Contents
- Installation Errors
- Lock File Errors
- Platform-Specific Errors
- Compatibility Errors
- Debugging Workflow

---

## Installation Errors

### `error: package not found`

```
error: package "some-package@^2.0.0" not found
```

**Cause:** Package name is misspelled, or the version range doesn't match any published version.

**Fix:**

```bash
# Verify the package exists and check available versions
bun pm info some-package

# Install with a specific version
bun add some-package@2.0.0
```

### `error: could not resolve`

```
error: could not resolve "react-native-svg" — peer dependency conflict
```

**Cause:** A transitive dependency requires a different version of a peer dependency than what's installed.

**Fix:**

```bash
# For React Native ecosystem packages, let Expo resolve
npx expo install react-native-svg

# If still failing, check what version Expo expects
npx expo-doctor
```

### `EACCES: permission denied`

```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Cause:** Bun is trying to write to a system directory (rare on Windows, common on macOS/Linux).

**Fix:**

```bash
# On macOS/Linux — ensure bun is installed in user directory
# Bun installs to ~/.bun by default, which shouldn't need sudo
# If it does, reinstall bun:
curl -fsSL https://bun.sh/install | bash
```

**WARNING:** NEVER use `sudo bun install`. It creates root-owned files in `node_modules` that break subsequent installs.

---

## Lock File Errors

### `error: lockfile is out of date`

```
error: lockfile "bun.lock" is out of date
```

**Cause:** `package.json` was modified (manually or by `npx expo install`) without running `bun install`.

**Fix:**

```bash
# Regenerate lock file from package.json
bun install
```

### Lock file merge conflicts

```
<<<<<<< HEAD
  "date-fns": ["date-fns@4.1.0", ...],
=======
  "date-fns": ["date-fns@4.2.0", ...],
>>>>>>> feature-branch
```

**Fix:**

```bash
# Accept either side, then regenerate
git checkout --theirs bun.lock
bun install
git add bun.lock
```

The regenerated lock file will resolve the correct versions from the merged `package.json`.

### Iterate-until-pass for lock file issues

1. Run `bun install`
2. If errors, check `package.json` for conflicting version ranges
3. Fix version ranges or add overrides
4. Run `bun install` again
5. Repeat until clean install with no warnings

---

## Platform-Specific Errors

### Windows: `EPERM` or `EBUSY` on node_modules

```
EPERM: operation not permitted, unlink 'node_modules/.cache/...'
```

**Cause:** Another process (Metro, VS Code, antivirus) has a file lock on `node_modules`.

**Fix:**

```bash
# 1. Stop Metro dev server (Ctrl+C)
# 2. Close VS Code or other editors that watch node_modules
# 3. Retry
bun install

# If still failing, force clean
rm -rf node_modules && bun install
```

### Windows: Long path errors

```
ENAMETOOLONG: name too long
```

**Cause:** Windows has a 260-character path limit. Deep `node_modules` nesting can exceed this.

**Fix:**

Enable long paths in Windows (one-time, requires admin):

```powershell
# Run in PowerShell as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

Or configure Git to handle long paths:

```bash
git config --system core.longpaths true
```

### macOS: `gyp ERR!` for native modules

```
gyp ERR! build error
```

**Cause:** A native module requires compilation (node-gyp) and Xcode Command Line Tools are missing.

**Fix:**

```bash
xcode-select --install
bun install
```

---

## Compatibility Errors

### `Module not found` at runtime (Metro)

```
Unable to resolve module 'some-module' from 'src/file.ts'
```

**Cause:** Package is installed in `node_modules` (bun sees it) but Metro's resolver can't find it. Common with packages that use Node.js-specific module resolution.

**Fix:**

```bash
# 1. Clear Metro cache
npx expo start --clear

# 2. If still failing, check if package supports React Native
# Look for "react-native" field in the package's package.json
```

### `TypeError: X is not a function` at runtime

**Cause:** Bun installed a version with a different API than expected. Common when `bun.lock` is stale.

**Fix:**

```bash
# Clean install from lock file
rm -rf node_modules && bun install

# If the wrong version is in bun.lock
bun add package-name@correct-version
```

### WARNING: Bun-installed package works locally but fails on EAS Build

**The Problem:**

```bash
# Local dev works fine — bun resolved exact versions
bun install
npx expo start  # works!

# EAS Build fails — npm resolves different versions
eas build --profile preview --platform ios  # fails!
```

**Why This Breaks:**
1. EAS Build uses npm, which reads `package.json` version ranges — not `bun.lock`
2. npm may resolve a newer minor version that has breaking changes
3. Transitive dependency versions differ between bun and npm resolution

**The Fix:**

```bash
# Pin exact versions for critical packages in package.json
# Change "^2.57.4" to "2.57.4" for packages that cause issues

# Or add overrides to force specific versions
```

```jsonc
{
  "overrides": {
    "problematic-package": "1.2.3"
  }
}
```

See the **eas** skill for build configuration and troubleshooting.

---

## Debugging Workflow

### Systematic dependency troubleshooting

Copy this checklist:
- [ ] Run `bun install` — check for errors
- [ ] Run `npx tsc --noEmit` — check for type errors
- [ ] Run `npx expo start --clear` — clear Metro cache and start
- [ ] If runtime error, check `bun pm why <package>` for version info
- [ ] If EAS Build fails, compare local versions with `bun pm ls` against npm resolution

### Quick diagnostics

```bash
# Check bun version
bun --version

# Check installed package version
bun pm ls | grep package-name

# Check why a package is installed (dependency chain)
bun pm why react-native-svg

# Verify no stale lock file
bun install --frozen-lockfile
```
