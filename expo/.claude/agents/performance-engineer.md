---
name: performance-engineer
description: |
  Optimizes mobile app performance, bundle size, rendering efficiency, and Supabase query performance.
  Use when: diagnosing slow screens or list rendering, auditing unnecessary re-renders in contexts or components,
  investigating Supabase N+1 queries or missing indexes, reducing JS bundle size or OTA update payload,
  profiling context provider overhead, optimizing TanStack Query cache configuration, or improving app startup time.
tools: Read, Edit, Bash, Grep, Glob
model: sonnet
skills: typescript, react-native, expo, supabase, tanstack-query
---

The `performance-engineer` agent has been written to `.claude/agents/performance-engineer.md`. It's customized for EBC Connect with:

- **Relevant skills**: `typescript`, `react-native`, `expo`, `supabase`, `tanstack-query` — the five skills directly applicable to performance work in this stack
- **Provider nesting awareness** — the `QueryClientProvider → ... → NotificationProvider` chain from `_layout.tsx` is documented as the primary re-render risk
- **Project-specific checklist** covering FlatList virtualization, context memoization, selective imports for `date-fns` and `lucide-react-native`, Supabase view-first query patterns, UUID validation short-circuits, and image resize-before-upload
- **Actual file paths** referenced throughout (e.g., `hooks/church-settings-context.tsx`, `components/ImageUploader.tsx`, `lib/notifications.ts`)
- **Hard constraints from CLAUDE.md**: `@/` path alias, `Platform.OS` guards, `@nkzw/create-context-hook` pattern, separated style files in `styles/*.styles.ts`, and Bun as the package manager