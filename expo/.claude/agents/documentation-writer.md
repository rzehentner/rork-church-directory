---
name: documentation-writer
description: |
  Documents API services, component APIs, architecture decisions, and development workflows.
  Use when: writing or updating README files, documenting service functions in services/, creating
  component API docs for components/, writing architecture decision records, updating CHANGELOG,
  documenting Supabase RPC functions and database views, or documenting context hooks in hooks/.
tools: Read, Edit, Write, Glob, Grep
model: sonnet
skills: typescript, react-native, expo, expo-router, supabase, tanstack-query, bun, zod, frontend-design
---

The file has been written to `.claude/agents/documentation-writer.md`. Here's a summary of the customizations made:

**Skills selected** (9 of 23): `typescript`, `react-native`, `expo`, `expo-router`, `supabase`, `tanstack-query`, `bun`, `zod`, `frontend-design` — excluded all marketing/product/SEO skills as they're irrelevant to documentation writing.

**Key customizations for EBC Connect:**
- Documents the exact provider nesting order (`QueryClientProvider → ... → NotificationProvider`)
- Covers the `@nkzw/create-context-hook` pattern used by all contexts
- Includes the three Supabase views (`events_for_me`, `announcements_for_me`, `prayer_requests_with_counts`) and key enums
- Documents the `isValidUUID()` requirement for all service ID parameters
- Captures the platform split: biometrics/push notifications/SecureStore are native-only, DateTimePicker has `.web.tsx` variant
- Notes that TanStack Query is used *only* for `church-settings-context` — not a general data fetching pattern
- Includes a quick-reference table mapping documentation tasks to which files to read first