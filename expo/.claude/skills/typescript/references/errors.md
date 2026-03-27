# TypeScript Error Handling Reference

## Contents
- Error Handling by Layer
- Service Layer: Throw Pattern
- Context Layer: Catch and Fallback
- Screen Layer: User-Facing Errors
- UUID Validation Guards
- Supabase Error Handling
- Common Type Errors and Fixes
- Anti-Patterns

## Error Handling by Layer

| Layer | Strategy | Example |
|-------|----------|---------|
| Services | Throw on failure | `if (error) throw error` |
| Contexts | Try-catch, log, fallback to null | `catch (e) { console.error(e); setData(null) }` |
| Screens | `Alert.alert` (native) / Modal (web) | `Alert.alert('Error', message)` |

## Service Layer: Throw Pattern

Every service function validates inputs, then throws on Supabase errors. Callers handle with try-catch:

```typescript
export async function getPrayer(id: string) {
  if (!isValidUUID(id)) throw new Error('Invalid prayer request ID');

  const { data, error } = await supabase
    .from('prayer_requests_with_counts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;  // rethrow Supabase PostgrestError
  return data;
}
```

For auth-gated operations, check the user first:

```typescript
export async function createPrayer(input: { subject: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  // ... proceed with insert
}
```

## Context Layer: Catch and Fallback

Contexts catch errors, log them, and reset state to safe defaults:

```typescript
try {
  const [profileRes, personRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('persons').select('*').eq('user_id', userId).single(),
  ]);
  setProfile(profileRes.data);
  setPerson(personRes.data);
} catch (error) {
  console.error('Error fetching user data:', error);
  setProfile(null);
  setPerson(null);
  setFamily(null);
  setFamilyMembers([]);
} finally {
  setIsLoading(false);  // always clear loading state
}
```

For non-critical operations, use `console.warn`:

```typescript
initBiometrics().catch(error => {
  console.warn('Biometric setup failed (non-critical):', error);
});
```

## Screen Layer: User-Facing Errors

Use `Platform.OS` to branch between native `Alert.alert` and web modals:

```typescript
if (Platform.OS === 'web') {
  // Show a modal or toast
  showError('Failed to save event');
} else {
  Alert.alert('Error', 'Failed to save event');
}
```

The `ConfirmationDialog` component in `components/Toast.tsx` handles this pattern:

```typescript
export function ConfirmationDialog({ visible, title, message, onConfirm, onCancel }: Props) {
  React.useEffect(() => {
    if (Platform.OS !== 'web' && visible) {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Confirm', style: 'destructive', onPress: onConfirm },
      ]);
    }
  }, [visible]);

  if (Platform.OS !== 'web') return null;  // native handled above
  return <Modal>{/* web UI */}</Modal>;
}
```

## UUID Validation Guards

Every service function that accepts an ID parameter validates it first:

```typescript
import { isValidUUID } from '@/utils/validation';

export async function getEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');
  // ... proceed with query
}
```

The type guard narrows `unknown` to `string`:

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

This prevents malformed IDs from reaching Supabase, which would return confusing Postgres errors.

## Supabase Error Handling

Supabase queries return `{ data, error }`. Handle both paths:

```typescript
// .single() — throws PostgrestError if no row found
const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
if (error) throw error;

// .maybeSingle() — returns null without error if no row found
const { data, error } = await supabase.from('church_settings').select('*').maybeSingle();
if (error) throw error;
// data is T | null — no error when missing
```

For fallback queries (e.g., trying a view, then falling back to a base table):

```typescript
export async function getEventRSVPs(eventId: string): Promise<EventRSVP[]> {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID');

  try {
    const { data, error } = await supabase.from('event_rsvps').select('...');
    if (!error && data) return data;
  } catch {}  // silent catch — fall through to fallback

  try {
    const { data, error } = await supabase.from('event_attendees').select('...');
    if (error) return [];  // final fallback: empty array
    return (data ?? []).map(transformRow);
  } catch {
    return [];
  }
}
```

## Common Type Errors and Fixes

### `Type 'null' is not assignable to type 'T'`

```typescript
// Problem: useState infers wrong type from initial value
const [session, setSession] = useState(null);

// Fix: provide explicit generic
const [session, setSession] = useState<Session | null>(null);
```

### `Property 'x' does not exist on type 'unknown'`

```typescript
// Problem: catch binding is unknown in strict mode
} catch (error) {
  console.log(error.message);  // Error!
}

// Fix: cast to Error
} catch (error) {
  console.log((error as Error).message);
}
```

### `Type 'string' is not assignable to type fontWeight`

```typescript
// Problem: string literal widened by TypeScript
fontWeight: '500',  // inferred as string, not '500'

// Fix: as const preserves the literal
fontWeight: '500' as const,
```

### `Argument of type 'X | null' is not assignable to parameter of type 'X'`

```typescript
// Problem: nullable Supabase result passed to non-nullable parameter
const { data } = await supabase.from('events').select('*').single();
processEvent(data);  // data is T | null

// Fix: guard or assert
if (data) processEvent(data);
// or
const { data } = await supabase.from('events').select('*').single();
if (!data) throw new Error('Event not found');
processEvent(data);  // narrowed to T
```

## Anti-Patterns

### WARNING: Empty Catch Blocks Without Intent

```typescript
// BAD — swallows errors silently, debugging nightmare
try { await riskyOperation(); } catch {}

// ACCEPTABLE — only when used as a fallback pattern with a comment
try {
  return await primaryQuery();
} catch {} // intentional: fall through to fallback query below
return await fallbackQuery();
```

Empty catches are only acceptable when the code explicitly falls through to an alternative path. Always add a comment explaining why the error is ignored.

### WARNING: Returning `{ data, error }` from Services

```typescript
// BAD — forces every caller to check error, easy to forget
export async function getEvent(id: string) {
  const { data, error } = await supabase.from('events').select('*').single();
  return { data, error };  // caller might ignore error
}

// GOOD — throw forces callers to handle errors via try-catch
export async function getEvent(id: string) {
  const { data, error } = await supabase.from('events').select('*').single();
  if (error) throw error;
  return data;
}
```

### WARNING: Missing `finally` for Loading State

```typescript
// BAD — loading stays true if an error is thrown
setIsLoading(true);
try {
  const data = await fetchData();
  setData(data);
  setIsLoading(false);
} catch (error) {
  console.error(error);
  // forgot setIsLoading(false)!
}

// GOOD — finally always runs
setIsLoading(true);
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  console.error(error);
  setData(null);
} finally {
  setIsLoading(false);
}
```
