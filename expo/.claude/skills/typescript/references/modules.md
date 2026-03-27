# TypeScript Modules Reference

## Contents
- Module Organization
- Export Patterns by Layer
- Import Order and Path Aliases
- Supabase Client as Typed Singleton
- Context Module Pattern
- Platform-Specific Modules
- Anti-Patterns

## Module Organization

The codebase follows a layered module structure. Each layer has a consistent export pattern:

| Layer | Directory | Export Style | Example |
|-------|-----------|-------------|---------|
| Screens | `app/` | `export default function` | `export default function EventDetail()` |
| Components | `components/` | `export default function` + named types | `export default function Toast()` |
| Contexts | `hooks/` | Named tuple export | `export const [AuthProvider, useAuth]` |
| Services | `services/` | Named async functions | `export async function fetchEvents()` |
| Types | `types/` | Named type/interface exports | `export type SignupFormType = ...` |
| Constants | `constants/` | Named const export | `export const Colors = { ... } as const` |
| Lib | `lib/` | Named exports (client, helpers) | `export const supabase = createClient<Database>(...)` |

## Export Patterns by Layer

### Services — named function exports only

```typescript
// services/events.ts — every export is a named async function or type
export type RSVP = 'going' | 'maybe' | 'declined';

export async function listUpcomingEvents(limit = 100) { ... }
export async function getEvent(eventId: string) { ... }
export async function createEvent(input: { title: string; ... }) { ... }
export async function updateEvent(id: string, patch: Partial<{...}>) { ... }
export async function deleteEvent(id: string) { ... }
```

NEVER use default exports in service files. Named exports enable tree-shaking and explicit imports.

### Contexts — `createContextHook` tuple pattern

```typescript
// hooks/auth-context.tsx
export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  // hook body
  return { session, user, isLoading, signIn, signOut };
});
```

Every context file exports exactly one `[Provider, useHook]` tuple via `@nkzw/create-context-hook`. The generic parameter constrains the return type.

### Components — default export + named satellite exports

```typescript
// components/Toast.tsx
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export function ConfirmationDialog({ ... }: ConfirmationDialogProps) { ... }
export default function Toast({ ... }: ToastProps) { ... }
```

The primary component is the default export. Related types and secondary components are named exports from the same file.

## Import Order and Path Aliases

All cross-directory imports use the `@/` path alias. NEVER use relative paths like `../../services/events`:

```typescript
// GOOD — @/ alias
import { fetchEvents } from '@/services/events';
import type { Database } from '@/types/supabase';
import { Colors } from '@/constants/colors';

// BAD — relative paths
import { fetchEvents } from '../../services/events';
```

Import order (enforced by convention, not linting):

1. React / React Native core
2. Expo packages
3. Third-party libraries
4. Internal hooks (`@/hooks/`)
5. Internal services/lib (`@/services/`, `@/lib/`)
6. Internal types (`@/types/`)
7. Internal components (`@/components/`)
8. Internal constants/utils (`@/constants/`, `@/utils/`)

Use `import type` for type-only imports — they are erased at compile time:

```typescript
import type { Database } from '@/types/supabase';
import type { Session, User } from '@supabase/supabase-js';
```

## Supabase Client as Typed Singleton

`lib/supabase.ts` creates a single typed client instance shared across all services:

```typescript
import type { Database } from '@/types/supabase';

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { storage: Platform.OS === 'web' ? undefined : AsyncStorage } }
);
```

The `Database` generic threads schema types through every `.from()`, `.select()`, `.rpc()` call. See the **supabase** skill for query patterns.

## Context Module Pattern

Contexts follow a strict dependency chain. Provider nesting order in `app/_layout.tsx`:

```
QueryClientProvider → ToastProvider → AuthProvider → UserProvider
  → MeProvider → ChurchSettingsProvider → NotificationProvider
```

Each context can only consume contexts above it in the chain:

```typescript
// hooks/me-context.tsx — depends on useAuth and useUser
export const [MeProvider, useMe] = createContextHook<MeState>(() => {
  const { user } = useAuth();        // from AuthProvider above
  const { profile } = useUser();     // from UserProvider above
  const isAdmin = profile?.role === 'admin';
  return { isAuthenticated: !!user, isAdmin, displayName };
});
```

## Platform-Specific Modules

Expo/Metro resolves `.web.tsx` over `.tsx` when bundling for web. Both files must export the same public API:

```typescript
// components/DateTimePicker.tsx — used on iOS/Android
export default function DateTimePicker(props: Props) { ... }

// components/DateTimePicker.web.tsx — used on web
export default function DateTimePicker(props: Props) { ... }
```

The `Props` interface must be structurally identical in both files to avoid type errors for consumers.

## Anti-Patterns

### WARNING: Default Exports in Service Files

```typescript
// BAD — hides the module's API surface, breaks tree-shaking
export default { listEvents, getEvent, createEvent };

// GOOD — named exports are explicit and individually importable
export async function listEvents() { ... }
export async function getEvent(id: string) { ... }
```

### WARNING: Circular Dependencies Between Contexts

```typescript
// BAD — MeProvider uses useAuth, AuthProvider uses useMe → circular
// hooks/auth-context.tsx
import { useMe } from '@/hooks/me-context';  // CYCLE!

// GOOD — respect the provider chain: Auth → User → Me
// Auth never imports from User or Me
```

Circular imports cause `undefined` at runtime. The provider nesting order in `_layout.tsx` defines the dependency direction.

### WARNING: Relative Imports Across Directories

```typescript
// BAD — fragile, breaks on file moves
import { Colors } from '../../constants/colors';

// GOOD — stable path alias
import { Colors } from '@/constants/colors';
```
