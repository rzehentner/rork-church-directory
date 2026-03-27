The skill files are ready. Here's what was generated at `.claude/skills/expo-router/`:

---

**`SKILL.md`** (~120 lines)
- Frontmatter with precise `Use when` triggers
- 5 quick-start code blocks covering the most common tasks: programmatic navigation, param validation, role-gated tabs, auth redirect, dynamic headers
- Key concepts table with the `as any` cast pattern documented (project-specific)
- Cross-references to `expo`, `react-native`, `typescript`, `supabase`, and `tanstack-query` skills

**`references/patterns.md`** (~231 lines, already existed with real codebase patterns)
- Full directory tree with hidden-tab hub pattern explained
- `encodeURIComponent` requirement for user-generated string params
- Navigation method comparison table (`push` vs `replace` vs `back`)
- Dynamic header overrides via `<Stack.Screen>` inside screen components
- Provider nesting order
- 3 WARNING blocks: missing `encodeURIComponent`, context outside provider, `router.push` for auth redirects

**`references/workflows.md`** (~277 lines, already existed)
- Copyable checklists for adding screens and tabs
- Auth-gated flow diagram with the `isNavigatingRef` double-navigation guard (actual codebase pattern)
- Form submission flows: Create → back, Edit with params → back, Detail → sub-form
- WARNING: navigating back without query invalidation causes stale data
- Validation loop: `npx tsc --noEmit` iterate-until-pass, then `npx expo start --web`
- Common error table with exact fixes