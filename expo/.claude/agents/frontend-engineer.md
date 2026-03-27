---
name: frontend-engineer
description: |
  React Native/Expo specialist for building cross-platform UI components, screens, navigation flows, and handling platform-specific code (web vs native)
tools: Read, Edit, Write, Glob, Grep, Bash
model: sonnet
skills: typescript, react-native, expo, expo-router, supabase, tanstack-query, bun, node, zod, date-fns, lucide-react-native, frontend-design, mapping-user-journeys, designing-onboarding-paths, orchestrating-feature-adoption, instrumenting-product-metrics, clarifying-market-fit, structuring-offer-ladders, crafting-page-messaging, tuning-landing-journeys, mapping-conversion-events, inspecting-search-coverage, adding-structured-signals
---

The `frontend-engineer.md` subagent file has been written to `.claude/agents/frontend-engineer.md`. Here's what was included:

**Skills:** `typescript`, `react-native`, `expo`, `expo-router`, `supabase`, `tanstack-query`, `zod`, `date-fns`, `lucide-react-native`, `frontend-design`

**Key project-specific customizations:**
- Full annotated directory structure matching the actual codebase layout
- Provider nesting order from `app/_layout.tsx` enforced as a hard constraint
- 8-tier import order convention with `@/` alias requirement
- Platform-aware code patterns (`Platform.OS` checks, `.web.tsx` file split)
- Context consumption pattern via `@nkzw/create-context-hook`
- Styling rules: separate `*.styles.ts` files per screen, `Colors.*` tokens only
- Role-based UI via `useMe()` from `me-context`
- Error handling split: `Alert.alert` on native, Modal on web
- UUID validation guard requirement before any service calls
- CRITICAL rules list covering the most common pitfalls (relative imports, direct Supabase queries, hardcoded colors, etc.)