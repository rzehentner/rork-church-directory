# Supabase Patterns Reference

## Contents
- Client Initialization
- Query Building Patterns
- RPC Function Patterns
- Storage Patterns
- Auth Patterns
- Error Handling
- Anti-Patterns

---

## Client Initialization

`lib/supabase.ts` — single client, imported everywhere.

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import type { Database } from '@/types/supabase'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
)
```

NEVER call `createClient` outside `lib/supabase.ts`. Import `supabase` directly.

---

## Query Building Patterns

### Views vs base tables

Prefer views for reads — they apply RLS and include computed fields:

```typescript
// GOOD — view returns only rows the user can see + RSVP status
const { data } = await supabase.from('events_for_me').select('*').eq('id', id)

// Only fall back to base table when the view won't have the row (e.g., past events not in the view)
const { data } = await supabase.from('events').select('*').eq('id', id)
```

Key views: `events_for_me`, `announcements_for_me`, `prayer_requests_with_counts`

### `.single()` vs `.maybeSingle()`

```typescript
// BAD — throws PostgrestError code PGRST116 when no row matches
.eq('id', id).single()

// GOOD — returns null when no row, throws only on real query errors
.eq('id', id).maybeSingle()
```

Use `.single()` only when the row is guaranteed to exist (e.g., after an insert).

### Nested / related select

```typescript
// Join via foreign key — tags!inner filters out rows with no matching tag
const { data } = await supabase
  .from('announcement_audience_tags')
  .select('tag_id, tags!inner(id, name, color)')
  .eq('announcement_id', id)
```

### Pagination

```typescript
const { data } = await supabase
  .from('announcements_for_me')
  .select('id, title, published_at, is_read')
  .order('published_at', { ascending: false })
  .range(from, from + limit - 1)  // inclusive on both ends
```

### Array-contains filter

```typescript
// Events tagged with any of these audience tags
const { data } = await supabase
  .from('events_for_me')
  .select('*')
  .contains('audience_tags', tagNames)
```

### Bulk IN filter

```typescript
// Update multiple rows at once
const { error } = await supabase
  .from('prayer_requests')
  .update({ status })
  .in('id', ids)
```

### Insert and return the new row

```typescript
const { data, error } = await supabase
  .from('events')
  .insert([payload])
  .select('*')
  .single()
if (error) throw error
return data  // fully typed row
```

### Upsert on conflict

```typescript
const { error } = await supabase
  .from('notification_endpoints')
  .upsert(
    { user_id, provider: 'expo', token, platform, is_active: true, last_seen: new Date().toISOString() },
    { onConflict: 'provider,token' }
  )
```

---

## RPC Function Patterns

All RPC params use the `p_` prefix convention (matches the database function signatures).

### Simple RPC

```typescript
const { data, error } = await supabase.rpc('mark_prayed', { p_prayer_id: id })
if (error) throw error
return !!data
```

### RPC with success/error payload

RPC functions that perform complex logic return `{ success: boolean; error?: string }`. Always validate:

```typescript
const { data, error } = await supabase.rpc('claim_potluck_item', {
  p_item_id: params.itemId,
  p_person_id: params.personId,
  p_manual_name: params.manualName ?? null,
  p_note: params.note ?? null,
})
if (error) throw error
const result = data as { success: boolean; item_name?: string; error?: string }
if (!result?.success) throw new Error(result?.error || 'Failed to claim potluck item')
return result as { success: boolean; item_name: string }
```

### RPC with array/object param

```typescript
const { data, error } = await supabase.rpc('create_signup_form', {
  p_event_id: params.eventId,
  p_fields: params.fields,  // array of objects — Supabase serializes automatically
  p_max_signups: params.maxSignups ?? null,
})
```

---

## Storage Patterns

### Get public URL (synchronous)

```typescript
export function eventImageUrl(path?: string | null): string | null {
  if (!path) return null
  const { data } = supabase.storage.from('event-images').getPublicUrl(path)
  return data?.publicUrl ?? null
}
```

`getPublicUrl` is synchronous — no `await`, no error to handle.

### Platform-aware upload

Native requires `ArrayBuffer`; web can use `Blob` directly:

```typescript
const resp = await fetch(localUri)
const blob = await resp.blob()
const contentType = blob.type || 'image/jpeg'

const uploadData = Platform.OS === 'web'
  ? blob
  : await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(blob)
    })

const { error } = await supabase.storage
  .from('event-images')
  .upload(path, uploadData, { contentType, upsert: true, cacheControl: '3600' })
if (error) throw error
```

### Clean up storage on failed DB update

```typescript
const { error: dbErr } = await supabase.from('events').update({ image_path: path }).eq('id', id)
if (dbErr) {
  await supabase.storage.from('event-images').remove([path]).catch(() => {})
  throw new Error(`Event update failed: ${dbErr.message}`)
}
```

---

## Auth Patterns

### Getting the current user in a service function

```typescript
// GOOD — getUser() re-validates the JWT server-side
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Not signed in')

// Acceptable for session checks (local cache, faster)
const { data: { session } } = await supabase.auth.getSession()
```

### Auth state listener (in context only)

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  setSession(session)
  setUser(session?.user ?? null)
  if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password' as any)
})
// Clean up on unmount
return () => subscription.unsubscribe()
```

---

## Error Handling

| Layer | Pattern |
|-------|---------|
| Services (`services/`, `lib/`) | `if (error) throw error` — let caller handle |
| Contexts (`hooks/`) | `try/catch` with `console.error`, fallback to null/empty state |
| Screens | `Alert.alert` on native, Modal on web |

Enrich errors with context when helpful:

```typescript
if (error) throw new Error(`Database error: ${error.message}${error.details ? ` (${error.details})` : ''}`)
```

---

## Anti-Patterns

### WARNING: Skipping UUID Validation

**The Problem:**
```typescript
// BAD — passes raw route param directly to query
export async function getEvent(eventId: string) {
  const { data, error } = await supabase.from('events').eq('id', eventId).single()
}
```

**Why This Breaks:**
1. Malformed IDs (empty string, `"null"`, `"undefined"`) cause cryptic Postgres errors
2. Postgres UUID type rejects invalid formats with unhelpful error messages
3. Route params from Expo Router can arrive as `undefined` cast to string

**The Fix:**
```typescript
import { isValidUUID } from '@/utils/validation'

export async function getEvent(eventId: string) {
  if (!isValidUUID(eventId)) throw new Error('Invalid event ID provided')
  // ...
}
```

Every service function that accepts an ID param must call `isValidUUID` first.

### WARNING: Creating a New Supabase Client Per Module

**The Problem:**
```typescript
// BAD — creates a second client with separate auth state
const localSupabase = createClient(url, key)
```

**Why This Breaks:**
1. Session state is not shared — the second client won't see the active session
2. Two connection pools for no reason
3. Auth listeners fire on the wrong instance

**The Fix:** Always `import { supabase } from '@/lib/supabase'`.
