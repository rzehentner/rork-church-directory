# Bun Types Reference

## Contents
- Type System Compatibility
- TypeScript Configuration
- Bun Types vs Node Types
- Type Resolution for Dependencies

---

## Type System Compatibility

### This project does NOT use Bun's type system

EBC Connect uses Bun only as a package manager. The runtime is Expo/Metro/Hermes, so TypeScript types come from `@types/react`, `@types/react-native`, and Expo's own type definitions — NOT from `bun-types`.

```jsonc
// tsconfig.json — no Bun type references
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

See the **typescript** skill for strict mode patterns and type conventions.

### WARNING: Adding `bun-types` to this project

**The Problem:**

```bash
# BAD — installing Bun runtime types in an Expo project
bun add -d bun-types
```

```jsonc
// BAD — adding to tsconfig
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

**Why This Breaks:**
1. `bun-types` overrides global types like `fetch`, `Request`, `Response` with Bun-specific versions
2. Conflicts with React Native's polyfills and Expo's type augmentations
3. Causes false type errors in components that use standard Web API types
4. The Hermes engine (React Native's JS runtime) does NOT support Bun APIs

**The Fix:**

Do not install `bun-types`. The project's type system is managed by:
- `expo/tsconfig.base` — base TypeScript config
- `.expo/types/**/*.ts` — Expo-generated type augmentations
- `expo-env.d.ts` — environment variable types
- `@types/react` — React type definitions

---

## Type Resolution for Dependencies

### How Bun resolves types during install

Bun automatically installs `@types/*` packages when they exist for a dependency. This behavior is identical to npm/yarn — the types land in `node_modules/@types/`.

```bash
# Bun installs @types/react automatically as a dev dependency
bun add -d @types/react@~19.1.10
```

### Checking installed types

```bash
# List installed type packages
ls node_modules/@types/
```

### When types are missing for a dependency

```bash
# 1. Check if @types package exists
bun add -d @types/some-lib

# 2. If no @types package, check if the lib ships its own types
# Look for "types" or "typings" field in the package's package.json

# 3. If neither exists, create a declaration file
```

```typescript
// types/some-lib.d.ts
declare module 'some-lib' {
  export function someFunction(input: string): void;
}
```

See the **typescript** skill for declaration file patterns.

---

## Bun vs Node Global Types

### Globals available in this project

Since the runtime is Hermes/Metro (NOT Bun), these globals come from React Native's polyfills:

| Global | Source | Notes |
|--------|--------|-------|
| `fetch` | React Native polyfill | NOT Bun's native fetch |
| `console` | Hermes engine | Standard console API |
| `setTimeout` | React Native | Standard timer API |
| `URL` | React Native polyfill | Partial Web API |
| `FormData` | React Native polyfill | For file uploads |
| `AsyncStorage` | `@react-native-async-storage` | NOT `localStorage` |

### WARNING: Using Bun-specific globals

**The Problem:**

```typescript
// BAD — Bun.file() does not exist in React Native
const file = Bun.file('./data.json');

// BAD — Bun.serve() does not exist in React Native
Bun.serve({ port: 3000, fetch: handler });

// BAD — Bun.env does not exist in React Native
const url = Bun.env.SUPABASE_URL;
```

**The Fix:**

```typescript
// GOOD — use Expo's environment variable pattern
import Constants from 'expo-constants';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

```typescript
// GOOD — use Expo FileSystem for file operations
import * as FileSystem from 'expo-file-system';

const content = await FileSystem.readAsStringAsync(fileUri);
```

See the **expo** skill for environment variable and file system patterns.

---

## Package.json Type Fields

### How this project declares its module type

```jsonc
// package.json — no "type" field
{
  "name": "ebc-connect",
  "main": "expo-router/entry",
  "version": "1.0.0"
}
```

The `"main": "expo-router/entry"` entry point tells Metro where to start bundling. Bun respects this field during dependency resolution but never executes it — Metro does.

### Module resolution

Bun resolves modules the same way Node does for package installation. The runtime module resolution is handled by Metro bundler, which uses its own resolver configured in `metro.config.js`.

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;
```

Path aliases (`@/*`) are resolved by Metro via `tsconfig.json` paths, not by Bun.
