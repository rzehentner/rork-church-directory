# React Query Patterns Reference

## Contents
- Query Key Conventions
- Query Patterns
- Mutation Patterns
- Optimistic Updates
- Direct Cache Manipulation
- Error Handling Patterns
- Anti-Patterns

## Query Key Conventions

Follow this structure exactly. Invalidation relies on key prefix matching — deviating breaks cache consistency.

| Pattern | Example | When |
|---------|---------|------|
| `['entity']` | `['prayers']` | Invalidate all variants |
| `['entity', filter]` | `['prayers', 'open']` | Filtered list |
| `['entity', id]` | `['prayer', prayerId]` | Single item |
| `['entity', 'active']` | `['tags', 'active']` | Status-filtered subset |
| `['entity-relation', parentId]` | `['signup-form-fields', formId]` | Child resources |
| `['composite-view', userId]` | `['announcements-for-me', profileId]` | User-scoped DB views |
| `['admin-entity']` | `['admin-tags']`, `['admin-announcements']` | Admin-only views |

Full list of keys in use: `church-settings`, `notifications`, `prayers`, `tags`, `admin-tags`, `person-with-tags`, `directory`, `admin-users`, `pending-approvals`, `admin-announcements`, `announcements-for-me`, `my-signup-forms`, `signup-form-summary`, `signup-form`, `signup-form-by-event`, `signup-form-fields`, `signup-form-responses`, `potluck-detail`, `user-tags`, `event-signup-form`, `upcoming-events`, `activity-events`.

### WARNING: Inconsistent Query Keys

**The Problem:**

```typescript
// BAD - Two screens use different keys for the same entity
queryKey: ['announcements']       // Screen A
queryKey: ['admin-announcements'] // Screen B
```

**Why This Breaks:** `invalidateQueries({ queryKey: ['announcements'] })` does NOT invalidate `['admin-announcements']`. After a mutation, the admin screen shows stale data indefinitely.

**The Fix:**

```typescript
// GOOD - Invalidate every key that displays this entity
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['announcements-for-me'] });
  queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
},
```

**When You Might Be Tempted:** Naming a new query without checking what keys already exist for that entity. Always `grep` for existing keys first.

## Query Patterns

### Standard List Query

```typescript
// app/(tabs)/prayers.tsx
const { data: prayers = [], isLoading, refetch } = useQuery({
  queryKey: ['prayers', activeTab],
  queryFn: () => listPrayers(activeTab),
  staleTime: 30 * 1000,
});
```

Default `= []` prevents undefined checks downstream. Always include filter params in the key so cache entries are separate per filter.

### Conditional Query (route param or auth dependency)

```typescript
const { data: form } = useQuery({
  queryKey: ['signup-form', formId],
  queryFn: () => getSignupForm(formId!), // non-null assertion is safe: enabled guards it
  enabled: !!formId,
});
```

### Role-Gated Query

```typescript
// app/(tabs)/admin.tsx
const { data: pendingApprovals, isLoading: approvalsLoading } = useQuery({
  queryKey: ['pending-approvals'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('pending_approvals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PendingApproval[];
  },
  enabled: profile?.role === 'admin' || profile?.role === 'leader',
  staleTime: 30000,
});
```

### Edit Form — Always Fresh

```typescript
const { data: existingAnnouncement } = useQuery({
  queryKey: ['announcement', announcementId],
  queryFn: () => getAnnouncement(announcementId!),
  enabled: isEditMode && !!announcementId,
  staleTime: 0, // MUST be 0 for edit forms — stale data overwrites user changes
});
```

### Polling Query

```typescript
// hooks/notification-context.tsx
const { data: notifications = [], isLoading, refetch } = useQuery({
  queryKey: ['notifications', user?.id],
  queryFn: fetchUserNotifications,
  enabled: !!user,
  refetchInterval: 30000,
  retry: 1,
});
```

### Church Settings — Shared via Context

`church-settings-context.tsx` wraps the `useQuery` result in a context so all screens share one cache entry. Don't add a second `useQuery` for `church-settings` in individual screens — call `useChurchSettings()` instead.

```typescript
// hooks/church-settings-context.tsx
const settingsQuery = useQuery({
  queryKey: ['church-settings'],
  queryFn: async () => { /* fetch from supabase */ },
  staleTime: 5 * 60 * 1000,
});
```

## Mutation Patterns

### Simple CRUD Mutation

```typescript
// app/create-prayer.tsx
const createMutation = useMutation({
  mutationFn: createPrayer,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prayers'] });
    router.back();
  },
  onError: (error: Error) => {
    Alert.alert('Error', error.message || 'Failed to create prayer request');
  },
});
```

### Multi-Key Invalidation

```typescript
// app/(tabs)/admin.tsx — tag create invalidates three keys
const createTagMutation = useMutation({
  mutationFn: createTag,
  onSuccess: (newTag) => {
    queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
    queryClient.invalidateQueries({ queryKey: ['tags', 'active'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    showSuccess(`Tag "${newTag.name}" created successfully`);
  },
  onError: (error) => {
    const msg = (error as Error).message;
    showError(msg.includes('duplicate key')
      ? 'A tag with this name already exists'
      : 'Failed to create tag. Please try again.'
    );
  },
});
```

### Bulk Operation Mutation

```typescript
// app/(tabs)/prayers.tsx
const bulkStatusMutation = useMutation({
  mutationFn: ({ ids, status }: { ids: string[]; status: TabStatus }) =>
    bulkUpdatePrayerStatus(ids, status),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['prayers'] });
    exitSelectMode();
  },
});
```

## Optimistic Updates

Used in `components/PersonTagPicker.tsx`. Pattern: update local state in `onMutate`, rollback in `onError`, sync cache in `onSuccess`.

```typescript
const addTagMutation = useMutation({
  mutationFn: ({ personId, tagId }: { personId: string; tagId: string }) =>
    addTagToPerson(personId, tagId),
  onMutate: async ({ tagId }) => {
    setPendingActions(prev => new Set([...prev, tagId]));
    const tagToAdd = allTags.find(tag => tag.id === tagId);
    if (tagToAdd) setLocalPersonTags(prev => [...prev, tagToAdd]); // optimistic
  },
  onSuccess: (_, { tagId }) => {
    setPendingActions(prev => { const s = new Set(prev); s.delete(tagId); return s; });
    queryClient.invalidateQueries({ queryKey: ['person-with-tags', personId] });
    queryClient.invalidateQueries({ queryKey: ['directory'] });
  },
  onError: (_, { tagId }) => {
    setPendingActions(prev => { const s = new Set(prev); s.delete(tagId); return s; });
    setLocalPersonTags(prev => prev.filter(tag => tag.id !== tagId)); // rollback
    showError('Failed to add tag. Please try again.');
  },
});
```

Note: This codebase uses local state for optimistic values rather than `queryClient.cancelQueries + setQueryData`. Simpler, but the cache and UI can briefly diverge if the component unmounts mid-flight.

## Direct Cache Manipulation

Use `setQueryData` when you have the exact new state and a network refetch would be wasteful.

```typescript
// hooks/notification-context.tsx — mark read without refetch
queryClient.setQueryData(
  ['notifications', user?.id],
  (old: UserNotification[] = []) =>
    old.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
);

// hooks/church-settings-context.tsx — update cache after save mutation
onSuccess: (data) => {
  queryClient.setQueryData(['church-settings'], data);
},
```

## Error Handling Patterns

### Alert.alert (native screens)

```typescript
onError: (error: Error) => {
  Alert.alert('Error', error.message || 'Failed to create prayer request');
},
```

### Toast with domain-specific messages

```typescript
onError: (error) => {
  const msg = (error as Error).message;
  if (msg.includes('duplicate key')) {
    showError('A tag with this name already exists');
  } else {
    showError('Failed to create tag. Please try again.');
  }
},
```

### Error state with retry button

```typescript
if (error) {
  return (
    <View style={styles.errorContainer}>
      <AlertCircle size={48} color={Colors.status.error} />
      <Text style={styles.errorTitle}>Failed to load</Text>
      <TouchableOpacity onPress={() => refetch()}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Anti-Patterns

### WARNING: Inline Supabase Queries in queryFn

**The Problem:**

```typescript
// BAD - Direct Supabase call in component
queryFn: async () => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  return data;
}
```

**Why This Breaks:**
1. Duplicates query logic — the same query scattered across multiple screens
2. Bypasses service-layer UUID validation (`isValidUUID` checks in `services/`)
3. Data mapping/transformation has to be repeated everywhere

**The Fix:** Extract to a service function. See the **supabase** skill.

```typescript
// GOOD
queryFn: () => listEvents(),
```

**When You Might Be Tempted:** One-off admin queries. Still add them to the relevant service file.

### WARNING: Missing `enabled` Guard on Param-Dependent Queries

**The Problem:**

```typescript
// BAD - fires immediately with undefined id
const { data } = useQuery({
  queryKey: ['prayer', id],
  queryFn: () => getPrayer(id), // id is undefined on first render
});
```

**Why This Breaks:**
1. Supabase receives `undefined` as the filter value, returning wrong rows or an error
2. The query fires before Expo Router resolves route params
3. You get a cache entry for `['prayer', undefined]` that never gets invalidated

**The Fix:**

```typescript
// GOOD
const { data } = useQuery({
  queryKey: ['prayer', id],
  queryFn: () => getPrayer(id!), // non-null assertion is safe: enabled guards it
  enabled: !!id,
});
```

### WARNING: useEffect for Data Fetching

NEVER add new `useEffect`-based data fetching for server state. Every problem it causes — race conditions, memory leaks, no caching, no deduplication — is already solved by `useQuery`.

```typescript
// BAD - adds to existing context anti-pattern debt
useEffect(() => {
  fetchData().then(setData);
}, [dependency]);

// GOOD - use React Query
const { data } = useQuery({
  queryKey: ['data', dependency],
  queryFn: () => fetchData(),
  enabled: !!dependency,
});
```
