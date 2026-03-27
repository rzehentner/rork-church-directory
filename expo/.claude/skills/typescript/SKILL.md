All 5 skill files are complete. Here's what was generated for the **typescript** skill:

**`.claude/skills/typescript/SKILL.md`** — Quick start with Supabase row types, context pattern, type guards, `as const` usage, key concepts table, common patterns, and a TypeScript check workflow.

**`references/patterns.md`** — Strict mode config, type inference vs annotation decisions, `as const` for Colors and `fontWeight`, type predicates, platform-specific typing with `.web.tsx`, async throw/catch pattern, and three anti-patterns.

**`references/types.md`** — Auto-generated Supabase types (never duplicate manually), manual domain types in `types/signup.ts`, `interface` vs `type` alias conventions, `Partial`/`Record`/intersection utility types, component prop typing, and context state interface shape.

**`references/modules.md`** — Module organization by layer, named exports for services, `createContextHook` tuple pattern, import order with `@/` alias, the Supabase typed singleton, context dependency chain diagram, and platform-specific `.web.tsx` module resolution.

**`references/errors.md`** — Error handling by layer (services throw, contexts catch+fallback, screens `Alert.alert`), UUID validation guard usage, `.single()` vs `.maybeSingle()` error semantics, fallback query patterns, common type errors with fixes, and three anti-patterns including missing `finally` blocks.