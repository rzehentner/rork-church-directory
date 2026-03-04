# Supabase Workflows Reference

## Contents
- Adding a New Service Function
- Adding a New RPC Call
- Adding a Storage Upload
- Querying a Database View (with Fallback)
- Regenerating Types After Schema Changes
- Auth-Gated Operations

---

## Adding a New Service Function

Copy this checklist and track progress:

- [ ] Step 1: Identify which table or view to query
- [ ] Step 2: Add UUID validation for all ID params
- [ ] Step 3: Write the query with `if (error) throw error`
- [ ] Step 4: Return typed data (not raw `any`)
- [ ] Step 5: Export as a named function from the service file
- [ ] Step 6: Run `npx tsc --noEmit` — fix all type errors before continuing

**CRUD template:**

```typescript
// services/example.ts
import { supabase } from '@/lib/supabase'
import { isValidUUID } from '@/utils/validation'
import type { Database } from '@/types/supabase'

type ExampleRow = Database['public']['Tables']['examples']['Row']

export async function getExample(id: string): Promise<ExampleRow> {
  if (!isValidUUID(id)) throw new Error('Invalid example ID')

  const { data, error } = await supabase
    .from('examples')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Example not found')
  return data
}

export async function createExample(input: { title: string; created_by: string }): Promise<ExampleRow> {
  const { data, error } = await supabase
    .from('examples')
    .insert([input])
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateExample(id: string, patch: Partial<ExampleRow>): Promise<ExampleRow> {
  if (!isValidUUID(id)) throw new Error('Invalid example ID')
  const { data, error } = await supabase
    .from('examples')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteExample(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('Invalid example ID')
  const { error } = await supabase.from('examples').delete().eq('id', id)
  if (error) throw error
}
```

---

## Adding a New RPC Call

Copy this checklist and track progress:

- [ ] Step 1: Confirm the RPC function name and param signatures in Supabase dashboard
- [ ] Step 2: Validate all ID params with `isValidUUID`
- [ ] Step 3: Call `supabase.rpc(name, params)` with `p_` prefixed params
- [ ] Step 4: If RPC returns `{ success, error }`, validate the payload explicitly
- [ ] Step 5: Cast `data` to a typed interface — never leave it as `unknown`
- [ ] Step 6: Run `npx tsc --noEmit`

**Template:**

```typescript
export async function callMyRpc(params: { itemId: string; note?: string | null }) {
  if (!isValidUUID(params.itemId)) throw new Error('Invalid item ID')

  const { data, error } = await supabase.rpc('my_rpc_function', {
    p_item_id: params.itemId,
    p_note: params.note ?? null,
  })

  if (error) throw error

  // When RPC returns a success/error shape:
  const result = data as { success: boolean; result_id?: string; error?: string }
  if (!result?.success) throw new Error(result?.error || 'RPC call failed')
  return result as { success: boolean; result_id: string }
}
```

---

## Adding a Storage Upload

Copy this checklist and track progress:

- [ ] Step 1: Confirm the bucket name in Supabase Storage dashboard
- [ ] Step 2: Build the storage path (e.g., `${recordId}/cover.jpg`)
- [ ] Step 3: Authenticate — call `supabase.auth.getSession()` and throw if no session
- [ ] Step 4: Handle `Platform.OS` — native needs `ArrayBuffer`, web uses `Blob`
- [ ] Step 5: Upload with `{ upsert: true }` to allow re-uploads
- [ ] Step 6: Update the database record with the path
- [ ] Step 7: On DB update failure, remove the uploaded file and rethrow

**Decision table — public vs signed URL:**

| Use Case | Method |
|----------|--------|
| Public event images | `getPublicUrl(path)` — synchronous, no expiry |
| Private/member-only files | `createSignedUrl(path, expiresIn)` — async, expires |

**Template:**

```typescript
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

const BUCKET = 'event-images'

export async function uploadCoverImage(localUri: string, recordId: string) {
  const { data: sess } = await supabase.auth.getSession()
  if (!sess?.session) throw new Error('Not authenticated')

  const resp = await fetch(localUri)
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`)
  const blob = await resp.blob()
  const contentType = blob.type || 'image/jpeg'

  const uploadData: ArrayBuffer | Blob =
    Platform.OS === 'web'
      ? blob
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        })

  const path = `${recordId}/cover.jpg`
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadData, { contentType, upsert: true, cacheControl: '3600' })
  if (uploadErr) throw uploadErr

  const { error: dbErr } = await supabase.from('events').update({ image_path: path }).eq('id', recordId)
  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    throw new Error(`DB update failed: ${dbErr.message}`)
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return pub.publicUrl
}
```

---

## Querying a Database View (with Fallback)

When a view applies audience/role filtering, some valid records may not appear in the view (e.g., an admin viewing another user's content). Fall back to the base table with a null computed field:

```typescript
export async function getEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID')

  // 1. Try view first (includes rsvp status, computed fields)
  const { data, error } = await supabase
    .from('events_for_me')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  // 2. Fallback to base table
  const { data: base, error: baseErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()
  if (baseErr) throw baseErr
  if (!base) throw new Error('Event not found')

  return { ...base, my_rsvp: null }  // pad missing view columns with null
}
```

---

## Regenerating Types After Schema Changes

Run this after any Supabase schema migration:

```bash
npx supabase gen types typescript --project-id rwbppxcusppltwkcjmdu > types/supabase.ts
```

Then validate the whole codebase compiles:

1. Regenerate: `npx supabase gen types typescript --project-id rwbppxcusppltwkcjmdu > types/supabase.ts`
2. Type-check: `npx tsc --noEmit`
3. If errors, fix mismatched field names / types in service files
4. Repeat step 2 until no errors

NEVER hand-edit `types/supabase.ts` — it is fully auto-generated.

---

## Auth-Gated Operations

When a service function must run as the authenticated user:

```typescript
// GOOD — re-validates JWT server-side, use when mutation requires the user's identity
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Not signed in')

// Acceptable — reads local session cache, use for lightweight auth checks
const { data: { session } } = await supabase.auth.getSession()
if (!session) throw new Error('Not signed in')
```

For admin-only operations, trust RLS + the RPC function's own role check. Do not implement role checks in the service layer — that duplicates the database policy and can drift out of sync.

```typescript
// GOOD — RPC enforces admin check internally
const { data, error } = await supabase.rpc('admin_list_users', { p_roles: roles ?? null })
if (error) throw error

// BAD — frontend role check is not authoritative
const { isAdmin } = useMe()
if (!isAdmin) throw new Error('Not authorized')  // RLS will catch this anyway
```
