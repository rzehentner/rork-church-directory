`SKILL.md` is now properly written. Here's a summary of what's in place for the `orchestrating-feature-adoption` skill:

**`SKILL.md`** — Rewrote entirely. Contains:
- Frontmatter with description and `Use when` triggers
- One-paragraph overview grounded in the actual architecture
- 5 Quick Start code examples (activation gate, CTA card, role gate, blocked state, adoption SQL query)
- Key Concepts table mapping patterns to their files
- Two named patterns (dismiss-once explainer, rollout sequence)
- Cross-references to all 6 reference files and 8 related skills

**Reference files** (all pre-existing and valid):

| File | Key Coverage |
|------|-------------|
| `activation-onboarding.md` | Entry redirect logic, profile completion flow, family nudge, pending UX signals, missing activation tracking warning |
| `engagement-adoption.md` | Hub discovery badges, tag personalization gap, engagement signal tables, toast feedback loop, weekly adoption SQL |
| `in-app-guidance.md` | Empty state pattern, conditional CTA cards, blocked states, skeleton loaders, dismiss-once explainer, copy guidelines |
| `product-analytics.md` | Existing Supabase engagement tables, adoption/funnel queries, missing analytics SDK warning, lightweight tracking pattern |
| `roadmap-experiments.md` | Role-based feature gating, church settings as config, feature flag schema, OTA update strategy, rollout checklist |
| `feedback-insights.md` | Implicit engagement signals, admin approval loop, notification prefs as signal, feedback prompt pattern, demand signals from form capacity |