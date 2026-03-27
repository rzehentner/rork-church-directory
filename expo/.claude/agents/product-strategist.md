---
name: product-strategist
description: |
  Designs user onboarding, in-app feature adoption, prayer request workflows, event management UX, and community engagement
tools: Read, Edit, Write, Glob, Grep
model: sonnet
skills: typescript, react-native, expo, expo-router, supabase, tanstack-query, bun, node, zod, date-fns, lucide-react-native, frontend-design, mapping-user-journeys, designing-onboarding-paths, orchestrating-feature-adoption, instrumenting-product-metrics, clarifying-market-fit, structuring-offer-ladders, crafting-page-messaging, tuning-landing-journeys, mapping-conversion-events, inspecting-search-coverage, adding-structured-signals
---

The `product-strategist.md` agent file has been written to `.claude/agents/product-strategist.md`. Here's what was customized for EBC Connect:

**Activation funnel** mapped to actual screens — `login.tsx` → `visitor-profile.tsx` → `join-family.tsx` → first RSVP or prayer, with a callout about the pending-role churn risk.

**Engagement loops** documented for the three core community workflows: events/RSVP, prayer requests, and signup/potluck forms.

**UI pattern references** grounded in real files — Toast system from `toast-context.tsx`, Skeleton from `components/Skeleton.tsx`, role gating via `useMe()`, church settings as feature flags.

**Task template** requires every recommendation to include a surface (file path), change, pattern used, and measurement — keeping strategy tied to code.

**Project constraints enforced** — `@/` path alias, `styles/*.styles.ts` convention, `Colors` constant usage, `Platform.OS` checks, church name via `useChurchSettings()`, and no new dependencies without cause.

**Skills selected:** `mapping-user-journeys`, `designing-onboarding-paths`, `orchestrating-feature-adoption`, `instrumenting-product-metrics`, `mapping-conversion-events`, `frontend-design`, `react-native`, `expo-router` — only those relevant to in-product strategy work.