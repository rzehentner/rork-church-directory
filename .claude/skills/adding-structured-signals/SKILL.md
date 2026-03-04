All 7 files have been created at `.claude/skills/adding-structured-signals/`:

**`SKILL.md`** — Quick start patterns: `expo-router/head` injection, Platform guard, null-safe schema objects, links to all references.

**`references/technical.md`** — How to inject JSON-LD via `expo-router/head`, platform guard pattern consistent with existing `app/_layout.tsx:15` usage, `useMemo` for serialization, WARNING on null field anti-pattern, validation workflow checklist.

**`references/on-page.md`** — Priority ranking of which screens need schema (`event-detail` first), exact placement in `event-detail.tsx` and `signup-form.tsx` using the `EventDetail` type from the codebase, global org schema in `_layout.tsx`, WARNING against adding schema to auth-gated screens.

**`references/content.md`** — What Google renders from each field, required vs. recommended fields for Event rich cards, `eventImageUrl()` helper usage for the image field, all-day event handling, `MobileApplication` description copy.

**`references/programmatic.md`** — `buildEventSchema()` builder pattern for `utils/schema.ts`, TanStack Query integration with null guard, `useMemo` vs `useEffect` WARNING, `ItemList` schema for the events list screen, iterate-until-pass validation loop.

**`references/schema.md`** — Full typed schema objects for `Event`, `Church`, `MobileApplication`, and `BreadcrumbList` — all wired to actual Supabase field names (`start_at`, `end_at`, `is_all_day`, `image_path`). Field validation rules table.

**`references/competitive.md`** — Realistic expectations for a church member app, Open Graph + JSON-LD pairing, `is_public` guard before exposing event schema, WARNING on React Native Web crawlability, full implementation checklist.