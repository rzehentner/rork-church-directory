All 7 skill files are in place at `.claude/skills/designing-onboarding-paths/`. Here's what was generated:

**`SKILL.md`** — Rewritten with proper skill frontmatter, quick-start patterns for role-based entry routing and dashboard nudges, key concepts table, pattern for adding new onboarding steps, an 8-step implementation checklist, and cross-references to 9 related skills.

**Reference files (all already populated with codebase-grounded content):**

| File | What It Covers |
|------|----------------|
| `activation-onboarding.md` | User state machine (no auth → profile → family → member), routing in `index.tsx`, `visitor-profile.tsx` save/skip flow, family join via replace-or-token RPC, 3 anti-pattern warnings |
| `engagement-adoption.md` | Dashboard as engagement hub with time-based greeting, 6-card quick-action grid with count badges, tag-based "For You" personalization via `announcements_for_me`, progressive feature discovery table, notification polling via `useQuery` |
| `in-app-guidance.md` | Toast system (4 types, dedup, network status), `useConfirmation` for platform-aware dialogs, empty-state checklist pattern, pending banner consistency rules, proposed `useFirstRunHint` and onboarding checklist card patterns |
| `product-analytics.md` | WARNING for missing analytics library, recommended PostHog integration, activation funnel event table, engagement event list, Supabase-based funnel SQL query, 2 anti-patterns (tracking everything, analytics in useEffect) |
| `roadmap-experiments.md` | Church settings as feature flags, role hierarchy for gating, 3 concrete experiment proposals (checklist, biometric timing, QR join), OTA update workflow, full experiment lifecycle checklist |
| `feedback-insights.md` | WARNING for missing error tracking (Sentry), toast copy rules (past tense success, failed + next action), admin approval as drop-off metric, prayer engagement signals, proposed feedback form + NPS trigger via `differenceInDays`, Supabase drop-off queries |