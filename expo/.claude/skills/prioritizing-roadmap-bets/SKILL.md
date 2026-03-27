All 7 skill files have been generated. Here's a summary of what was created:

**`.claude/skills/prioritizing-roadmap-bets/`**

| File | Lines | Focus |
|------|-------|-------|
| `SKILL.md` | ~130 | ICE scoring framework, codebase readiness checks, decision checklist |
| `references/activation-onboarding.md` | ~130 | Pending user flow, activation gaps (P0-P2), silent empty personalization |
| `references/engagement-adoption.md` | ~130 | 3-tier engagement model, broken notification deep-links, prayer streaks opportunity |
| `references/in-app-guidance.md` | ~135 | Toast system capabilities, empty state audit (actionable vs passive), hidden feature discovery |
| `references/product-analytics.md` | ~130 | Zero-analytics warning, 3-tier instrumentation plan, proxy signals from existing DB |
| `references/roadmap-experiments.md` | ~140 | Role-based rollout (free), tag-based targeting, church_settings JSONB flags, EAS channels |
| `references/feedback-insights.md` | ~140 | Missing crash reporting warning, proxy feedback signals, review prompt timing |

Key findings grounded in the codebase:
- **Zero analytics** — no tracking events anywhere; prioritization is blind
- **Broken notification deep-links** — taps mark read but don't navigate (highest-leverage fix)
- **Unused data** — `read_count`/`total_recipients` fields exist but aren't displayed
- **Silent personalization** — "For You" sections render empty with no explanation
- **Role-based rollout is free** — the 4-role hierarchy enables staged launches today