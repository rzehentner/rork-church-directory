All 5 files have been written. Here's a summary of what was generated:

**`.claude/skills/node/SKILL.md`** — Fixed from a corrupted summary to a proper skill file with YAML frontmatter, three working code examples (service pattern, parallel queries, env var init), a key concepts table, a common patterns section with the three-layer error strategy and platform gating, a development workflow checklist with a validation loop, and links to all reference files and related skills.

**`.claude/skills/node/references/patterns.md`** — 5 patterns: async service, `Promise.all` parallel ops, `Promise.race` timeout, `mounted` flag context init, platform-aware native gating. 3 WARNINGs: `useEffect` data fetching (race conditions, memory leaks, no caching), unguarded async in `useEffect`, sequential awaits for independent queries.

**`.claude/skills/node/references/types.md`** — TypeScript strict config, env var typing with fast-fail guard, Supabase response typing for views vs table joins, UUID type guard from `utils/validation.ts`, service function signatures, derived role types from `me-context.tsx`. 2 WARNINGs: using `any` for Supabase responses, missing null checks on list results.

**`.claude/skills/node/references/modules.md`** — ESM vs CommonJS split (Metro vs Node config files), `@/` alias setup, 8-group import order convention, per-layer export patterns, Metro + Babel config examples, env vars as bundle-time constants. 3 WARNINGs: relative cross-directory imports, missing `EXPO_PUBLIC_` prefix, circular context dependencies.

**`.claude/skills/node/references/errors.md`** — Three-layer error table (services throw, contexts catch+fallback, screens alert), canonical code for each layer, Supabase `{ data, error }` destructuring, view-with-fallback resilience pattern. 3 WARNINGs: silent error swallowing, throwing inside contexts (provider tree crash), missing UUID validation.