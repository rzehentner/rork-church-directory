# TypeScript Patterns Reference

## Contents
- Strict Mode and Configuration
- Type Inference vs Explicit Annotation
- As Const Assertions
- Type Guards and Narrowing
- Platform-Specific Typing
- Async Patterns
- Anti-Patterns

## Strict Mode and Configuration

The project extends `expo/tsconfig.base` with strict mode and path aliases:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

Strict mode enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and all other strict family flags. Every `catch` binding is `unknown`, every nullable must be handled.

## Type Inference vs Explicit Annotation

Let TypeScript infer when the type is obvious. Annotate when inference would be ambiguous or incorrect.

```typescript
// GOOD — inferred return type from Supabase query is precise enough
export async function listUpcomingEvents(limit = 100) {
  const { data, error } = await supabase.from('events_for_me').select('*')...
  if (error) throw error;
  return data ?? [];
}

// GOOD — explicit return type documents intent when fallback logic is complex
export async function getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
  // multiple try-catch blocks with different return shapes
}

// GOOD — useState needs generic when initial value doesn't carry the full type
const [session, setSession] = useState<Session | null>(null);

// BAD — redundant annotation when inference is identical
const [isLoading, setIsLoading] = useState<boolean>(false); // just use useState(false)
```

## As Const Assertions

Use `as const` for two purposes in this codebase:

**Deep readonly objects with literal types:**

```typescript
export const Colors = {
  navy: '#2B4C7E',
  gold: '#D4A843',
  text: { primary: '#1A2744', secondary: '#6B8EBF' },
} as const;
// Colors.navy is type '#2B4C7E', not string
```

**React Native fontWeight literals:**

```typescript
// BAD — TypeScript widens '500' to string, RN rejects it
fontWeight: '500',

// GOOD — as const preserves the literal type
fontWeight: '500' as const,
```

## Type Guards and Narrowing

The `isValidUUID` function is the primary type guard in this codebase:

```typescript
export function isValidUUID(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    value !== 'null' &&
    value !== 'undefined' &&
    UUID_REGEX.test(value)
  );
}
```

The `value is string` return type is a **type predicate** — after `if (isValidUUID(id))`, TypeScript narrows `id` from `unknown` to `string`.

**Optional chaining for nullable context values:**

```typescript
// profile is Profile | null from context
const isAdmin = profile?.role === 'admin' || profile?.role === 'leader';
```

## Platform-Specific Typing

`Platform.OS` is typed as `'ios' | 'android' | 'windows' | 'macos' | 'web'`. Use equality checks for narrowing:

```typescript
// GOOD — early return pattern for platform branching
async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(key);
}
```

For platform-specific file resolution, use `.web.tsx` suffix. Both files must export the same public interface:

```typescript
// DateTimePicker.tsx (native) — imports native picker
import NativeDateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

// DateTimePicker.web.tsx (web) — declares local event interface
interface DateTimePickerEvent {
  type: string;
  nativeEvent: { timestamp: number };
}
```

See the **expo** skill for platform-specific module resolution details.

## Async Patterns

All service functions are `async` and throw on failure. Callers use try-catch:

```typescript
// Service layer — throw, don't return errors
export async function createPrayer(input: { subject: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase.from('prayer_requests').insert({...});
  if (error) throw error;
  return data;
}

// Context layer — catch, log, fallback to null
try {
  const [profileRes, personRes] = await Promise.all([...]);
  setProfile(profileRes.data);
} catch (error) {
  console.error('Error fetching user data:', error);
  setProfile(null);
} finally {
  setIsLoading(false);
}
```

## Anti-Patterns

### WARNING: Using `any` Instead of `unknown` for Catch Bindings

```typescript
// BAD — any leaks unsafe access
} catch (error: any) {
  console.log(error.message); // no type safety
}

// GOOD — unknown forces safe narrowing
} catch (error) {
  return { error: error as Error };
}
```

### WARNING: Forgetting `useState` Generic for Nullable State

```typescript
// BAD — TypeScript infers useState<null>, setter rejects Session
const [session, setSession] = useState(null);
setSession(mySession); // Type error!

// GOOD — explicit generic allows both types
const [session, setSession] = useState<Session | null>(null);
```

### WARNING: Using `as` to Silence Errors Instead of Fixing Types

```typescript
// BAD — silences a real type mismatch
const result = data as EventRSVP[];  // data might be null!

// GOOD — handle null, then the type is correct
const result = (data ?? []) as EventRSVP[];
```

`as` casts are acceptable for Supabase RPC results (which return `unknown`) and join shapes the client cannot infer. They are NOT acceptable for papering over nullable values.
