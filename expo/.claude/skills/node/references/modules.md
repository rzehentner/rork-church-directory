# Node.js Modules Reference

## Contents
- Module System Overview
- Path Alias Configuration
- Import Order Convention
- Export Patterns by Layer
- Build Tooling: Metro + Babel
- Environment Variables as Module Config
- WARNING: Relative Cross-Directory Imports
- WARNING: Missing EXPO_PUBLIC Prefix
- WARNING: Circular Dependencies Between Contexts

---

## Module System Overview

All app code uses ESM (`import`/`export`). TypeScript is compiled by Babel + the Metro
bundler. Node.js-level config files (`babel.config.js`, `metro.config.js`,
`eslint.config.js`) use CommonJS because they run directly in Node, not through Metro.

```javascript
// babel.config.js — CommonJS (runs in Node directly)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
```

```typescript
// services/events.ts — ESM (processed by Metro)
import { supabase } from '@/lib/supabase';
import { isValidUUID } from '@/utils/validation';

export async function listUpcomingEvents(limit = 100) { /* ... */ }
```

**Rule:** Never use `require()` in app code. Never use `import` in Metro/Babel config files.

---

## Path Alias Configuration

The `@/` alias maps to the project root. Configured in `tsconfig.json` and resolved by
Metro via the Babel config.

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  }
}
```

Every internal import across directories uses this alias:

```typescript
// GOOD — @/ alias for all cross-directory imports
import { supabase }      from '@/lib/supabase';
import { Colors }        from '@/constants/colors';
import { isValidUUID }   from '@/utils/validation';
import { useAuth }       from '@/hooks/auth-context';
import { listEvents }    from '@/services/events';
import type { Database } from '@/types/supabase';
```

**Exception:** Sibling file imports in the same directory may use relative paths:
`import styles from './events.styles'`.

---

## Import Order Convention

Enforce this exact order in every file. ESLint (via `eslint-config-expo`) flags violations.

```typescript
// 1. React / React Native core
import React, { useState, useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

// 2. Expo packages
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// 3. Third-party libraries
import { Calendar } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

// 4. Internal hooks (contexts)
import { useAuth } from '@/hooks/auth-context';
import { useMe }   from '@/hooks/me-context';

// 5. Internal services / lib
import { listUpcomingEvents } from '@/services/events';
import { supabase }           from '@/lib/supabase';

// 6. Internal types
import type { Database } from '@/types/supabase';

// 7. Internal components
import { Toast }    from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';

// 8. Internal constants / utils
import { Colors }       from '@/constants/colors';
import { isValidUUID }  from '@/utils/validation';
```

---

## Export Patterns by Layer

Each layer enforces a consistent export style:

```typescript
// Screens — default export, PascalCase function name
export default function CreateEventScreen() { /* ... */ }

// Components — default export, PascalCase function name
export default function DateTimePicker(props: Props) { /* ... */ }

// Contexts — named pair via createContextHook
export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  // return state object
});

// Services — named async function exports (no default exports)
export async function listUpcomingEvents(limit = 100) { /* ... */ }
export async function createEvent(input: EventInput) { /* ... */ }

// Constants — named const, as const for exhaustive type inference
export const Colors = { navy: '#1B2E4B', /* ... */ } as const;

// Types — named type/interface exports
export type PrayerStatus = 'open' | 'answered' | 'closed';
export interface PrayerRequest { id: string; subject: string; /* ... */ }
```

---

## Build Tooling: Metro + Babel

Metro is the JavaScript bundler (replaces webpack in React Native). Babel handles
TypeScript and JSX transforms. Both configs are CommonJS files at the project root.

```javascript
// metro.config.js — Extends Expo defaults, adds Rork toolkit
const { getDefaultConfig } = require('expo/metro-config');
const { withRorkMetro }    = require('@rork-ai/toolkit-sdk/metro');

const config = getDefaultConfig(__dirname);
module.exports = withRorkMetro(config);
```

```javascript
// eslint.config.js — ESLint 9 flat config
const { defineConfig } = require('eslint/config');
const expoConfig       = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
]);
```

See the **expo** skill for Metro configuration details and the **bun** skill for package
management commands.

---

## Environment Variables as Module Config

`EXPO_PUBLIC_*` vars are evaluated at Metro bundle time — they are static strings baked
into the JS bundle, not server-side environment lookups.

```typescript
// lib/supabase.ts — Module-level initialization with fast-fail guard
const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase env vars. Copy .env.example to .env');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
```

---

## WARNING: Relative Cross-Directory Imports

**The Problem:**

```typescript
// BAD — Relative path that crosses directory boundaries
import { supabase } from '../../lib/supabase';
import { Colors }   from '../../../constants/colors';
```

**Why This Breaks:**
1. **Fragile** — moving the importing file breaks all relative paths silently
2. **Inconsistent** — mixing `@/` and `../..` makes the codebase harder to navigate
3. **Cognitive load** — counting `../` levels is error-prone and wastes review time

**The Fix:**

```typescript
// GOOD — Always use @/ for cross-directory imports
import { supabase } from '@/lib/supabase';
import { Colors }   from '@/constants/colors';
```

---

## WARNING: Missing EXPO_PUBLIC Prefix

**The Problem:**

```typescript
// BAD — Missing prefix; variable is undefined at runtime
const apiUrl = process.env.SUPABASE_URL;
supabase.createClient(apiUrl!, key!); // apiUrl is undefined → crash
```

**Why This Breaks:**
1. **Silent undefined** — Metro strips env vars without the `EXPO_PUBLIC_` prefix
2. **Security by design** — Expo requires the prefix to prevent accidental secret leakage into the bundle
3. **No build error** — TypeScript resolves `process.env.X` to `string | undefined` regardless; the failure is runtime

**The Fix:**

```typescript
// GOOD — EXPO_PUBLIC_ prefix required for Metro to include the value
const apiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
```

NEVER put secrets (service role keys, private API keys) in `EXPO_PUBLIC_*` variables.
They are embedded in the client bundle and visible to anyone who decompiles the app.

---

## WARNING: Circular Dependencies Between Contexts

**The Problem:**

```typescript
// BAD — auth-context imports user-context which imports auth-context
// hooks/auth-context.tsx
import { useUser } from '@/hooks/user-context'; // user-context depends on auth!

// hooks/user-context.tsx
import { useAuth } from '@/hooks/auth-context';
```

**Why This Breaks:**
1. **Module initialization order** — one module receives `undefined` during the circular init phase
2. **Runtime crashes** — a hook called before its provider is mounted throws
3. **Hard to diagnose** — the error doesn't point at the circular import; it surfaces elsewhere

**The Fix:**

The provider chain has a strict top-down order enforced in `app/_layout.tsx`:

```
QueryClientProvider → ToastProvider → AuthProvider → UserProvider
  → MeProvider → ChurchSettingsProvider → NotificationProvider
```

Each context may only import hooks from providers above it in the chain — never below.

```typescript
// GOOD — UserContext consumes AuthContext (parent layer)
// hooks/user-context.tsx
import { useAuth } from '@/hooks/auth-context'; // Auth wraps User in _layout.tsx ✓

// NEVER — AuthContext importing from UserContext (child layer)
// hooks/auth-context.tsx
import { useUser } from '@/hooks/user-context'; // ✗ circular dependency
```
