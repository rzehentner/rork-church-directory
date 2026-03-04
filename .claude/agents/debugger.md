---
name: debugger
description: |
  Investigates bugs across platforms (iOS, Android, web) and Supabase integration issues
tools: Read, Edit, Bash, Grep, Glob
model: sonnet
skills: typescript, react-native, expo, expo-router, supabase, tanstack-query, bun, node, zod, date-fns, lucide-react-native, frontend-design, mapping-user-journeys, designing-onboarding-paths, orchestrating-feature-adoption, instrumenting-product-metrics, clarifying-market-fit, structuring-offer-ladders, crafting-page-messaging, tuning-landing-journeys, mapping-conversion-events, inspecting-search-coverage, adding-structured-signals
---

The `debugger.md` subagent has been written to `.claude/agents/debugger.md`. Key customizations for EBC Connect:

- **Skills:** `typescript`, `react-native`, `expo`, `expo-router`, `supabase`, `tanstack-query`, `zod`, `date-fns` — the full debugging-relevant stack
- **Layer-aware investigation:** bug categories mapped to the exact file hierarchy (screen → context → service → lib → Supabase), with the provider nesting order documented
- **Platform-specific guidance:** covers iOS/Android/web divergence points (DateTimePicker `.web.tsx` split, push notifications, biometrics, secure storage)
- **Supabase-specific traps:** UUID validation via `isValidUUID()`, DB view fallbacks, RLS policy checks, RPC argument shape mismatches
- **Critical rules:** no relative cross-directory imports, no bypassing UUID guards, surgical fixes only (no surrounding refactors)