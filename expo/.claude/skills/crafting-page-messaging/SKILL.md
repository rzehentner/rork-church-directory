The `crafting-page-messaging` skill files already exist and are complete. Here's a summary of what's in place:

**`crafting-page-messaging/SKILL.md`** — 111 lines covering:
- App-specific overview (community framing principle, inline copy model)
- 3 quick-start code examples from real screens
- Key concepts table (5 rules with examples)
- 3 common pattern blocks (toasts, membership gates, biometric opt-in)
- Messaging audit checklist (8 items)
- Links to all 6 reference files + 8 related skills

**`references/` — 6 topic files:**

| File | Focus |
|------|-------|
| `conversion-optimization.md` | 5 conversion surfaces (login → profile → family), progressive disclosure, empty state anti-patterns, audit workflow |
| `content-copy.md` | Community voice rules, role-aware copy, placeholder/error/confirmation patterns, tone anti-patterns |
| `distribution.md` | Push notification copy via `expo-notifications`, deep link copy, app store description, OTA update messaging |
| `measurement-testing.md` | How to A/B test copy with `AsyncStorage` flags, what to measure, copy experiment checklist |
| `growth-engineering.md` | Referral/share copy, family invite token UX, prayer + event social triggers |
| `strategy-monetization.md` | Role tier messaging (pending → member → leader → admin), feature gate copy ladder, upgrade prompts |

All files are grounded in actual screen files (`app/(auth)/login.tsx`, `app/(tabs)/dashboard.tsx`, etc.) with real code examples. No placeholders.