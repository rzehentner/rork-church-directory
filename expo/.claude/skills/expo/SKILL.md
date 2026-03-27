The `expo` skill now has all three files properly written:

**SKILL.md** — Fixed from a meta-summary into a proper skill file with:
- YAML frontmatter with `name`, `description`, `allowed-tools`, and "Use when" triggers
- Quick start commands (dev server, package install, type check)
- Key concepts table
- Two common patterns with code examples
- Links to reference files and related skills

**references/patterns.md** — Already correct, covering:
- Provider nesting order and why it matters
- Platform file resolution (`.web.tsx`) with DO/DON'T pair
- Runtime `Platform.OS` branching patterns from `auth-context.tsx` and `supabase.ts`
- Plugin configuration with permission string guidance
- Environment variable safety (never use `EXPO_PUBLIC_` for secrets)
- Two WARNING anti-patterns with full problem/why/fix structure

**references/workflows.md** — Already correct, covering:
- Dev server setup with copyable checklist
- Adding packages with native config (step-by-step + WARNING about OTA limits)
- New screen and tab screen workflows with copyable checklists
- Platform-specific component creation workflow
- OTA vs native build decision table
- Debugging common errors with iterate-until-pass pattern