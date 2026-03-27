# Zod Workflows Reference

## Contents
- Adding Zod to a New Feature
- Migrating Existing Service Functions
- Form Validation Flow
- Validating Supabase RPC Responses
- Schema Testing Workflow

---

## Adding Zod to a New Feature

Copy this checklist and track progress:
- [ ] Step 1: Define schema in the service file or `utils/schemas.ts` if shared
- [ ] Step 2: Export inferred type with `z.infer`
- [ ] Step 3: Use `.safeParse()` in screen form handlers
- [ ] Step 4: Use `.parse()` in service functions
- [ ] Step 5: Run `npx tsc --noEmit` to verify types align

### Example: Adding a New Prayer Request Form

**1. Define the schema (in `services/prayer.ts`):**

```typescript
import { z } from 'zod';

export const CreatePrayerSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  details: z.string().max(2000, 'Details are too long').nullable().optional(),
  for_person_id: z.string().uuid().nullable().optional(),
  is_anonymous: z.boolean().default(false),
});

export type CreatePrayerInput = z.infer<typeof CreatePrayerSchema>;
```

**2. Use `.safeParse()` in the screen:**

```typescript
// app/create-prayer.tsx
import { CreatePrayerSchema } from '@/services/prayer';

function handleSubmit() {
  const result = CreatePrayerSchema.safeParse({
    subject,
    details: details || null,
    for_person_id: selectedPersonId || null,
    is_anonymous: isAnonymous,
  });

  if (!result.success) {
    showToast('error', result.error.errors[0]?.message ?? 'Please check your input');
    return;
  }

  createPrayerMutation.mutate(result.data);
}
```

**3. Use `.parse()` in the service:**

```typescript
export async function createPrayer(input: CreatePrayerInput) {
  const validated = CreatePrayerSchema.parse(input);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert([{ ...validated, created_by: user.id }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
```

---

## Migrating Existing Service Functions

Incremental migration — don't rewrite everything at once.

### Priority Order

1. **RPC response parsing** — highest risk of runtime shape mismatch (replace `as` casts)
2. **Service input validation** — replace manual if-checks with schemas
3. **Form validation** — replace screen-level if-checks with `.safeParse()`
4. **Stored data parsing** — AsyncStorage JSON, notification preferences

### Migration Steps for a Service Function

```
1. Read the existing function signature and manual checks
2. Write a Zod schema that captures all constraints
3. Replace manual checks with Schema.parse(input)
4. Export inferred type: type X = z.infer<typeof Schema>
5. Update callers to use the new type
6. Validate: npx tsc --noEmit
7. If validation fails, fix type mismatches and repeat step 6
8. Only proceed when validation passes
```

### Before/After: `services/tags.ts`

**Before:**

```typescript
export async function createTag(input: { name: string; color?: string }) {
  if (!input.name || input.name.length === 0) throw new Error('Tag name is required');
  if (input.name.length > 100) throw new Error('Tag name is too long (max 100 characters)');
  // ... create tag
}
```

**After:**

```typescript
const CreateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100, 'Tag name is too long (max 100 characters)'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
});

type CreateTagInput = z.infer<typeof CreateTagSchema>;

export async function createTag(input: CreateTagInput) {
  const validated = CreateTagSchema.parse(input);
  // ... create tag with validated data
}
```

---

## Form Validation Flow

### Pattern: Screen → Schema → Service

This flow replaces the current pattern where screens and services both validate independently.

```
┌─────────────────────────────────────┐
│ Screen (handleSubmit)               │
│  └─ Schema.safeParse(formState)     │
│     ├─ !success → showToast(error)  │
│     └─ success → mutation(data)     │
├─────────────────────────────────────┤
│ Service (createX)                   │
│  └─ Schema.parse(input)            │
│     └─ Defense-in-depth only        │
├─────────────────────────────────────┤
│ Supabase                            │
│  └─ Postgres constraints            │
└─────────────────────────────────────┘
```

### Displaying Multiple Errors

```typescript
const result = Schema.safeParse(formData);
if (!result.success) {
  const fieldErrors = result.error.flatten().fieldErrors;
  // fieldErrors: { title?: string[], start_at?: string[], ... }

  // Show first error per field
  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (messages?.[0]) {
      showToast('error', messages[0]);
    }
  });
  return;
}
```

### Cross-Field Validation

**When:** Validating that end date is after start date, or password confirmation matches.

```typescript
const EventDateSchema = z.object({
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
}).refine(
  (data) => new Date(data.end_at) > new Date(data.start_at),
  { message: 'End date must be after start date', path: ['end_at'] }
);

const PasswordResetSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);
```

---

## Validating Supabase RPC Responses

### WARNING: Unvalidated RPC Returns

Every `supabase.rpc()` call returns `unknown` at runtime. The current codebase casts with `as` — replace with schema parsing.

**Pattern for RPC success/error responses:**

```typescript
// Reusable RPC result factory
function rpcResultSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion('success', [
    z.object({ success: z.literal(true) }).merge(z.object({}).extend(dataSchema.shape ?? {})),
    z.object({ success: z.literal(false), error: z.string().optional() }),
  ]);
}

// Usage for signup form creation
const CreateFormResultSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), form_id: z.string().uuid() }),
  z.object({ success: z.literal(false), error: z.string().optional() }),
]);

export async function createSignupForm(params: CreateSignupFormInput) {
  const { data, error } = await supabase.rpc('create_signup_form', { /* ... */ });
  if (error) throw error;

  const result = CreateFormResultSchema.parse(data);
  if (!result.success) throw new Error(result.error ?? 'Failed to create signup form');
  return result.form_id;
}
```

See the **supabase** skill for more on RPC function patterns.

---

## Schema Testing Workflow

Validate schemas work correctly before deploying.

### Quick Validation with `npx tsc`

```
1. Define schema and inferred type
2. Run: npx tsc --noEmit
3. If type errors appear, adjust schema to match expected types
4. Repeat until clean
```

### Manual Testing in Dev

```typescript
// Temporary: add to a screen to verify schema behavior
console.log(CreateEventSchema.safeParse({
  title: '',           // should fail: min(1)
  start_at: 'invalid', // should fail: datetime()
  end_at: new Date().toISOString(),
}));
// Check .error.errors array for expected messages
```

### Common Migration Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Type 'string \| undefined' is not assignable` | Schema field is `.optional()` but caller expects `string` | Add `.default('')` or handle undefined at call site |
| `null is not assignable` | Schema uses `.optional()` but Supabase column is nullable | Use `.nullable()` instead of `.optional()` |
| ZodError in production | Using `.parse()` without try-catch in screen handler | Use `.safeParse()` in screens, `.parse()` only in services |
| Stale validation after schema change | Caller still uses old manual type | Use `z.infer<typeof Schema>` everywhere, delete manual interfaces |

### Decision: `.parse()` vs `.safeParse()`

| Context | Method | Why |
|---------|--------|-----|
| Screen form handler | `.safeParse()` | Show errors to user without throwing |
| Service function | `.parse()` | Invalid input is a programming error — let it throw |
| Parsing stored data (AsyncStorage) | `.safeParse()` | Corrupt data shouldn't crash the app |
| RPC response parsing | `.parse()` | Unexpected shapes indicate API contract violation |
