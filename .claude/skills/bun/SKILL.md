The reference files are already well-written and complete. Here's a summary of what was done:

---

**SKILL.md** — Fixed (was showing a generation summary instead of actual skill content). Now contains:
- Frontmatter with name, description, and `Use when` triggers
- Clear framing: Bun = package manager only, NOT the runtime
- Decision table for `bun add` vs `npx expo install`
- Key concepts table (lock file, runtime, EAS Build, `bun-types`, version constraints)
- Common patterns with code blocks
- Links to all reference files and related skills

**Reference files** (already correct, no changes needed):

- **references/patterns.md** — Package workflow, version pinning strategy (`~` for Expo, `^` for third-party, exact for RN core), lock file handling, `bun run` vs `npx`, and two WARNING anti-patterns (`bun add` for Expo packages, deleting `bun.lock`)
- **references/types.md** — Why `bun-types` must never be installed, how Bun resolves `@types/*`, Bun globals vs React Native polyfill globals (`fetch`, `AsyncStorage`, etc.), and Metro path alias resolution
- **references/modules.md** — Install patterns, frozen lockfile for CI, dependency tree inspection, upgrade workflow, platform-specific packages, and the WARNING on mixing package managers
- **errors.md** — Installation errors (`ENOENT`, peer conflicts, `EACCES`), lock file conflicts with iterate-until-pass loop, Windows-specific errors (EPERM, long paths), Metro resolution failures, and EAS Build divergence with diagnostic checklist