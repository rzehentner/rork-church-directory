All three skill files are written. Here's a summary of what was generated:

---

**`.claude/skills/supabase/SKILL.md`** (~100 lines)
- Quick-start examples for the three most common operations: view query, RPC call, storage upload
- Key concepts table covering views, RPC, `maybeSingle()`, UUID guards, upsert, platform storage
- Two common patterns: diff-based tag sync and RPC payload validation
- Cross-references to **react-native**, **tanstack-query**, **zod**, and **expo-router** skills

**`.claude/skills/supabase/references/patterns.md`** (~150 lines)
- Client initialization with platform-aware `AsyncStorage` config
- Query patterns: views vs base tables, `.maybeSingle()` vs `.single()`, nested selects, pagination, array `contains`, bulk `in()`, insert-and-return
- RPC patterns: simple, success/error payload validation, array params
- Storage patterns: synchronous `getPublicUrl`, platform-aware blob→ArrayBuffer upload, cleanup on DB failure
- Auth: `getUser()` vs `getSession()` guidance, auth state listener teardown
- Error handling table by layer (services throw, contexts catch, screens alert)
- Two anti-patterns with WARNING headers: skipping UUID validation and creating duplicate clients

**`.claude/skills/supabase/references/workflows.md`** (~150 lines)
- Copyable checklists for: new service function, new RPC call, new storage upload
- Full CRUD template, RPC template, and upload template
- View-with-fallback pattern for queries that need a base table safety net
- Type regeneration workflow with iterate-until-pass loop
- Auth-gated operations: `getUser()` vs `getSession()` and why to trust RLS over frontend role checks