All three skill files are now complete. Here's what was generated:

**`SKILL.md`** — Fixed (the previous version contained a summary description instead of actual content). Now includes:
- Quick-start examples for the three main use cases: service validation, form handlers, RPC response parsing
- Key concepts table (`.parse()` vs `.safeParse()`, nullable vs optional, transforms, discriminated unions)
- Common patterns for shared schemas and enum conversion
- Links to reference files and related skills

**`references/patterns.md`** — Already complete with:
- Migration from manual if-checks to schemas (mapped to actual `services/events.ts` pattern)
- Nullable vs optional design for Supabase columns
- Replacing `as` casts on RPC results with `discriminatedUnion` (from `services/signup-forms.ts`)
- Shared schemas in `utils/schemas.ts`
- Three anti-patterns with full WARNING documentation: `.parse()` in form handlers, duplicating type+schema, unvalidated `JSON.parse` in AsyncStorage

**`references/workflows.md`** — Already complete with:
- New feature checklist
- Migration priority order and iterate-until-pass loop
- Screen → Schema → Service flow diagram
- Cross-field validation (date ranges, password confirmation)
- RPC response workflow
- `.parse()` vs `.safeParse()` decision table