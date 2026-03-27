# TypeScript Types Reference

## Contents
- Auto-Generated Supabase Types
- Manual Domain Types
- Interface vs Type Alias
- Utility Types in Practice
- Component Prop Types
- Context State Interfaces
- Anti-Patterns

## Auto-Generated Supabase Types

`types/supabase.ts` is generated via `npx supabase gen types typescript`. It exports a `Database` type with three variants per table:

```typescript
Tables: {
  profiles: {
    Row: { id: string; role: string; ... }       // SELECT — all fields required
    Insert: { id: string; role?: string; ... }    // INSERT — optional fields have ?
    Update: { id?: string; role?: string; ... }   // UPDATE — all fields optional
  }
}
```

Extract row types via indexed access — NEVER duplicate them manually:

```typescript
// GOOD — always in sync with schema
type Profile = Database['public']['Tables']['profiles']['Row'];

// BAD — will drift from schema on next generation
interface Profile { id: string; role: string; ... }
```

## Manual Domain Types

Types for RPC results, views with custom shapes, or cross-service contracts live in `types/signup.ts`:

```typescript
// String literal unions for constrained sets
export type SignupFormType = 'event' | 'general' | 'potluck';
export type SignupFieldType = 'text' | 'email' | 'phone' | 'boolean' | 'select' | 'textarea' | 'date' | 'number';

// Interface with nullable fields matching Supabase conventions
export interface SignupFormField {
  field_type: SignupFieldType;
  options: string[] | null;     // nullable = T | null, NEVER T | undefined
  is_required: boolean;
  sort_order: number;
}

// Record utility type for dynamic key-value maps
export interface SignupResponseDetail {
  custom_fields: Record<string, string> | null;
}
```

## Interface vs Type Alias

This codebase uses **interfaces for object shapes** and **type aliases for unions/primitives**:

```typescript
// Type alias — unions, primitives, extracted DB types
export type RSVP = 'going' | 'maybe' | 'declined';
type Profile = Database['public']['Tables']['profiles']['Row'];

// Interface — object shapes with named fields
export interface EventRSVP {
  person_id: string;
  first_name: string;
  status: RSVP;
  responded_at: string;
}

// Interface — component props
interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}
```

## Utility Types in Practice

| Utility | Usage | Example |
|---------|-------|---------|
| `Partial<T>` | Update payloads | `patch: Partial<{ title: string; description: string \| null }>` |
| `Record<K, V>` | Dynamic dictionaries | `fieldValues: Record<string, string>` |
| `T & U` (intersection) | Extend without modifying base | `ChurchSettings & { _id: string }` |
| `T \| null` | Nullable values | `description: string \| null` |

**Partial for update operations:**

```typescript
export async function updateEvent(id: string, patch: Partial<{
  title: string;
  description: string | null;
  start_at: string;
  image_path: string | null;
}>) {
  const { error } = await supabase.from('events').update(patch).eq('id', id);
  if (error) throw error;
}
```

**Intersection to extend a type:**

```typescript
function mapDbToSettings(row: DbChurchSettings): ChurchSettings & { _id: string } {
  return { ...mapped, _id: row.id };
}
```

## Component Prop Types

Standard patterns for component props:

```typescript
// String literal union for constrained options
interface TagPillProps {
  tag: Tag;
  size?: 'small' | 'medium';
  onRemove?: () => void;
  showRemove?: boolean;
}

// number | string for flexible dimensions (mirrors React Native's DimensionValue)
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;    // pragmatic escape hatch for StyleSheet composition
}

// Defaults via destructuring, NOT defaultProps
export default function TagPill({
  tag,
  size = 'small',
  showRemove = false,
}: TagPillProps) { ... }
```

## Context State Interfaces

Context interfaces define the shape exposed to consumers. Method signatures use inline function types:

```typescript
interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isBiometricAvailable: boolean;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  // ... implementation
  return { session, user, isLoading, signIn, signOut, isBiometricAvailable };
});
```

The generic `createContextHook<AuthState>` enforces that the factory function returns exactly the declared shape.

## Anti-Patterns

### WARNING: Duplicating Supabase Row Types Manually

**The Problem:**

```typescript
// BAD — will drift from the auto-generated schema
interface Profile {
  id: string;
  first_name: string;
  role: 'admin' | 'member';
}
```

**Why This Breaks:** When columns are added, renamed, or made nullable in the database, `npx supabase gen types` regenerates `types/supabase.ts`. Manual interfaces won't update, causing silent type mismatches.

**The Fix:**

```typescript
type Profile = Database['public']['Tables']['profiles']['Row'];
```

### WARNING: Using `undefined` for Nullable Database Fields

```typescript
// BAD — Supabase returns null, not undefined
description?: string;

// GOOD — matches Supabase null semantics
description: string | null;
```

Supabase nullable columns return `null` at runtime. Using `undefined` causes `=== null` checks to fail silently.

### WARNING: Inline Object Types That Should Be Named

```typescript
// BAD — same shape repeated in 3 service functions
export async function fn1(input: { person_id: string; first_name: string; status: RSVP }) { ... }
export async function fn2(input: { person_id: string; first_name: string; status: RSVP }) { ... }

// GOOD — extract after 3+ duplications
export interface EventRSVP {
  person_id: string;
  first_name: string;
  status: RSVP;
}
```

Inline types are fine for one-off function parameters. Extract when you see duplication.
