# Zod Patterns Reference

## Contents
- Replacing Manual Validation with Schemas
- Schema Design for This Codebase
- Replacing `as` Casts with `.parse()`
- Reusable Shared Schemas
- Anti-Patterns

---

## Replacing Manual Validation with Schemas

The codebase currently validates with imperative if-checks. Replace these with Zod schemas.

### WARNING: Scattered Manual Validation

**The Problem:**

```typescript
// BAD — from services/events.ts pattern
export async function createEvent(input: {
  title: string;
  start_at: string;
  end_at: string;
}) {
  if (!input.title) throw new Error('Title is required');
  if (!input.start_at || !input.end_at) throw new Error('Start/End are required');
  // ... 10 more manual checks scattered across the function
}
```

**Why This Breaks:**
1. Validation logic is duplicated between screens and services — screen checks `!title.trim()`, service checks `!input.title`
2. No structured error collection — only first failing check is reported
3. Error messages are hardcoded strings with no consistency

**The Fix:**

```typescript
// GOOD — schema as single source of truth
import { z } from 'zod';

const CreateEventSchema = z.object({
  title: z.string().min(1, 'Please enter an event title').transform(s => s.trim()),
  description: z.string().nullable().optional(),
  start_at: z.string().datetime('Invalid start date'),
  end_at: z.string().datetime('Invalid end date'),
  is_all_day: z.boolean().default(false),
  location: z.string().nullable().optional(),
  is_public: z.boolean().default(false),
  roles_allowed: z.array(z.enum(['admin', 'leader', 'member', 'visitor'])).nullable().optional(),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export async function createEvent(input: CreateEventInput) {
  const validated = CreateEventSchema.parse(input); // throws ZodError
  // ... proceed with validated data
}
```

**When You Might Be Tempted:** When adding "just one more field check" to an existing service function. Stop — define a schema instead.

---

## Schema Design for This Codebase

### Enum Schemas from Existing Types

The codebase defines enums as union types. Mirror them as Zod enums:

```typescript
// From types/signup.ts: type SignupFormType = 'event' | 'general' | 'potluck'
const SignupFormTypeSchema = z.enum(['event', 'general', 'potluck']);

// From types/signup.ts: type SignupFieldType = 'text' | 'email' | 'phone' | ...
const SignupFieldTypeSchema = z.enum([
  'text', 'email', 'phone', 'boolean', 'select', 'textarea', 'date', 'number',
]);

// From services/events.ts: type RSVP = 'going' | 'maybe' | 'declined'
const RSVPSchema = z.enum(['going', 'maybe', 'declined']);

// From services/prayer.ts
const PrayerStatusSchema = z.enum(['open', 'answered', 'archived']);
```

### Nullable vs Optional

Match the Supabase column constraints. In this codebase, most optional fields are **nullable** (Postgres `NULL`), not undefined:

```typescript
// DO — matches Supabase column that allows NULL
z.string().nullable()  // string | null

// DON'T — undefined doesn't round-trip through Supabase
z.string().optional()  // string | undefined

// When a field might be omitted from the input AND stored as null:
z.string().nullable().optional()  // string | null | undefined → stored as null
```

### Date Strings

This codebase passes dates as ISO strings (not Date objects) to Supabase:

```typescript
// DO — validate ISO format
const DateTimeField = z.string().datetime({ message: 'Must be an ISO date string' });

// DON'T — Supabase expects strings, not Date objects
const DateTimeField = z.date(); // wrong for this codebase
```

---

## Replacing `as` Casts with `.parse()`

### WARNING: Unsafe Type Assertions on RPC Results

**The Problem:**

```typescript
// BAD — from services/signup-forms.ts
const result = data as { success: boolean; form_id?: string; error?: string };
if (!result?.success) throw new Error(result?.error || 'Failed to create signup form');
return result as { success: boolean; form_id: string };
```

**Why This Breaks:**
1. `as` is erased at runtime — no actual validation occurs
2. If the RPC function changes its return shape, TypeScript won't catch it
3. The double-cast (`as X` then `as Y`) hides the fact that `form_id` might be undefined

**The Fix:**

```typescript
// GOOD — runtime validation of RPC response
const RpcSuccessSchema = z.object({
  success: z.literal(true),
  form_id: z.string().uuid(),
});

const RpcErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().optional(),
});

const RpcResultSchema = z.discriminatedUnion('success', [RpcSuccessSchema, RpcErrorSchema]);

const result = RpcResultSchema.parse(data);
if (!result.success) throw new Error(result.error ?? 'Failed to create signup form');
return result; // TypeScript knows form_id exists here
```

---

## Reusable Shared Schemas

Place shared schemas in `utils/schemas.ts` following the existing `utils/validation.ts` pattern:

```typescript
// utils/schemas.ts
import { z } from 'zod';

// Replace isValidUUID() with a schema
export const UUIDSchema = z.string().uuid('Invalid ID format');

// Common field schemas
export const EmailSchema = z.string().email('Invalid email address').transform(s => s.toLowerCase().trim());
export const PhoneSchema = z.string().regex(/^\+?[\d\s()-]{7,}$/, 'Invalid phone number');
export const RequiredStringSchema = z.string().min(1, 'This field is required').transform(s => s.trim());

// Supabase role enum — matches user_role enum in database
export const UserRoleSchema = z.enum(['admin', 'leader', 'member', 'visitor']);
```

Then import in services. See the **supabase** skill for service function patterns.

---

## Anti-Patterns

### WARNING: Using `.parse()` in Form Handlers Without `.safeParse()`

**The Problem:**

```typescript
// BAD — .parse() throws, crashing the form handler
function handleSubmit() {
  try {
    const data = Schema.parse(formState);
    await createEvent(data);
  } catch (e) {
    // ZodError mixed with network errors — hard to distinguish
    Alert.alert('Error', e.message);
  }
}
```

**Why This Breaks:**
1. ZodError `.message` is a JSON array string, not a user-friendly message
2. Mixing validation errors with API errors in the same catch block

**The Fix:**

```typescript
// GOOD — .safeParse() for forms, .parse() for services
function handleSubmit() {
  const result = Schema.safeParse(formState);
  if (!result.success) {
    const firstError = result.error.errors[0]?.message ?? 'Validation failed';
    showToast('error', firstError);
    return;
  }
  try {
    await createEvent(result.data);
  } catch (e) {
    // Only network/API errors reach here
    showToast('error', e instanceof Error ? e.message : 'Something went wrong');
  }
}
```

### WARNING: Duplicating Types and Schemas

**The Problem:**

```typescript
// BAD — schema and interface defined separately, will drift apart
interface PrayerInput {
  subject: string;
  details?: string | null;
  is_anonymous?: boolean;
}

const PrayerSchema = z.object({
  subject: z.string().min(1),
  details: z.string().nullable(),  // missing .optional() — already drifted!
  is_anonymous: z.boolean(),       // missing .optional() — already drifted!
});
```

**The Fix:**

```typescript
// GOOD — schema is the source of truth, type is derived
const PrayerSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  details: z.string().nullable().optional(),
  is_anonymous: z.boolean().optional().default(false),
});

type PrayerInput = z.infer<typeof PrayerSchema>;
// PrayerInput = { subject: string; details?: string | null; is_anonymous?: boolean }
```

See the **typescript** skill for more on type inference patterns.

### WARNING: Validating AsyncStorage/JSON.parse Without Schemas

**The Problem:**

```typescript
// BAD — from lib/notification-preferences.ts pattern
const stored = JSON.parse(value);
return {
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  ...stored,
  announcements: { ...DEFAULT_NOTIFICATION_PREFERENCES.announcements, ...stored.announcements },
};
```

**Why This Breaks:**
1. If `value` is malformed JSON, `JSON.parse` throws — but no schema validates the shape
2. Shallow spread misses nested properties if stored data has unexpected structure
3. `stored.announcements` could be a string, number, or anything — no type safety

**The Fix:**

```typescript
// GOOD — parse stored JSON through a schema with defaults
const NotificationPrefsSchema = z.object({
  announcements: z.object({
    enabled: z.boolean().default(true),
    tagPreferences: z.record(z.string(), z.boolean()).default({}),
  }).default({}),
  events: z.object({
    enabled: z.boolean().default(true),
    newEvents: z.boolean().default(true),
    eventUpdates: z.boolean().default(true),
    rsvpReminders: z.boolean().default(true),
    eventCancellations: z.boolean().default(true),
    tagPreferences: z.record(z.string(), z.boolean()).default({}),
  }).default({}),
  general: z.object({
    enabled: z.boolean().default(true),
  }).default({}),
});

// Safe parsing with automatic defaults for missing/corrupt fields
const stored = NotificationPrefsSchema.safeParse(JSON.parse(value));
return stored.success ? stored.data : NotificationPrefsSchema.parse({});
```
