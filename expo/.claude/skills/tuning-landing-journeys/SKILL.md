All 7 files are created. Here's the summary:

**`.claude/skills/tuning-landing-journeys/`**

| File | Lines | Focus |
|------|-------|-------|
| `SKILL.md` | ~80 | Quick start, key concepts, common patterns, related skills |
| `references/conversion-optimization.md` | ~120 | Three-gate funnel, skip-button leak, silent pending state, dashboard hierarchy |
| `references/content-copy.md` | ~120 | Copy inventory by screen, error message mapping, empty-state formula |
| `references/distribution.md` | ~100 | Push notification gaps, App Store surfaces, deep linking, OTA constraints |
| `references/measurement-testing.md` | ~110 | Analytics gap (PostHog recommendation), gate instrumentation, A/B testing without a tool |
| `references/growth-engineering.md` | ~110 | Family invite loop, content share loop, re-engagement hooks, viral mechanic priority table |
| `references/strategy-monetization.md` | ~110 | Admin retention problem, feature gating rules, visitor-to-member pipeline with gap annotations |

Key findings surfaced across the files:

1. **Silent pending state** — biggest churn risk; needs a dedicated holding screen and an approval push notification
2. **Skip button on visitor-profile** — "Skip for now" has no friction; replace with progress indicator + "Finish later"
3. **No analytics** — zero funnel visibility; PostHog recommended as the fit for this stack
4. **Admin has no pending-member alert** — approvals stall without a dashboard signal
5. **Share CTAs are buried** — family invite and event sharing exist in the code but lack prominent surface placement