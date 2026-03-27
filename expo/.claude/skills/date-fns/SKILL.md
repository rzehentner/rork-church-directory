Done. Here's what was generated/fixed:

**`SKILL.md`** — Replaced the placeholder note with proper frontmatter and content:
- Description with specific "Use when" triggers
- Quick Start with 3 ready-to-use patterns pulled from actual codebase files
- Format string reference table (patterns from `create-bulletin.tsx`)
- `utils/dates.ts` consolidation target with exportable helpers
- Related skills linking to **react-native**, **tanstack-query**, **supabase**, and **zod**

**`references/patterns.md`** and **`references/workflows.md`** were already well-written and kept as-is. They cover:
- All 4 anti-patterns found in the codebase (duplicated formatters, manual time-ago math, mutating Date objects, inconsistent locale usage)
- 7 end-to-end workflows (Supabase timestamp → display, date input → storage, event filtering, calendar navigation, birthday matching, smart labels, web input handling)
- Debugging table for common failure modes
- Consolidation checklist for migrating the codebase to `utils/dates.ts`