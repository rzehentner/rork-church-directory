All three files are written. Here's a summary of what was generated:

---

**`.claude/skills/tanstack-query/SKILL.md`** — Quick-reference overview with the actual `QueryClient` config from `app/_layout.tsx`, six working code patterns (list query, mutation+invalidation, role-gated query, optimistic cache write, polling, realtime bridge), a key concepts table, and links to the reference files.

**`references/patterns.md`** — Deep reference covering:
- Complete query key inventory (all 20+ keys in use across the codebase)
- 5 `useQuery` patterns (list, conditional, role-gated, edit form, polling)
- 3 `useMutation` patterns (simple CRUD, multi-key invalidation for tags, bulk operations)
- Optimistic update pattern from `PersonTagPicker.tsx` with rollback
- `setQueryData` patterns from notification and church settings contexts
- 3 error handling patterns (Alert, toast with domain messages, error UI with retry)
- 3 anti-patterns with WARNING headers: inline Supabase queries, missing `enabled` guard, `useEffect` for data fetching

**`references/workflows.md`** — Step-by-step operational reference covering:
- Checklists for adding queries and mutations
- `staleTime` decision guide (5 tiers with rationale)
- Invalidation strategy map for tags, announcements, signup forms, and person tags
- Pull-to-refresh integration pattern
- Dependent query chaining from `signup-form.tsx`
- Realtime subscription → `refetch()` bridge from prayers
- `useEffect` → React Query migration guide with before/after
- Debugging checklist (stale data, query not firing, infinite loop, missing `useQueryClient`)