The EAS skill has been generated with three files:

**SKILL.md** (88 lines) — Quick overview covering build profiles, OTA vs native build decision table, npm scripts, version management, and the project's specific EAS configuration (`appVersionSource: "local"`, `autoIncrement`, `appVersion` runtime policy).

**references/patterns.md** (143 lines) — Covers:
- Build profile configuration with annotated `eas.json`
- Version management with `appVersionSource: "local"`
- Runtime version and OTA scoping (`appVersion` policy)
- Environment variables / EAS Secrets setup
- Platform-specific build config (iOS infoPlist, Android permissions)
- Anti-patterns: building without local validation, using OTA after native changes, missing EAS secrets

**references/workflows.md** (148 lines) — Covers:
- Full release workflow (validate → build → submit) with copyable checklist
- OTA update workflow with pre-flight native change check
- Development build workflow (`development` profile)
- Preview / internal testing workflow (`preview` profile)
- Adding EAS Secrets for Supabase credentials
- Troubleshooting build failures (SDK mismatch, provisioning profiles, Gradle, crash-on-launch)
- Version bump workflow with decision table

Key highlights:
- **18 code blocks** across all files
- Real configuration from this codebase (`eas.json`, `app.json`, `package.json` scripts)
- WARNING sections for OTA-after-native-changes, missing EAS secrets, skipping local validation, version bump oversight
- Copyable checklists for full release, version bumps
- Iterate-until-pass patterns for build troubleshooting
- Cross-references to **expo**, **expo-router**, **react-native**, **typescript**, **bun**, and **supabase** skills