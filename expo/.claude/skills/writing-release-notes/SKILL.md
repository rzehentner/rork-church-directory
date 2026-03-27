All 7 files for the **writing-release-notes** skill have been created:

**SKILL.md** (main file) — covers:
- Quick start: gathering changes via git log, categorizing by app area, writing the notes
- Key concepts: version strings, OTA updates, native builds, in-app announcements, app store notes
- Common patterns: App Store release notes, in-app announcement creation, version string updates
- Warning about version string drift across three hardcoded locations
- Full release checklist

**Reference files:**

| File | Focus |
|---|---|
| `activation-onboarding.md` | Onboarding flow routing, profile completion, pending status banners, biometric enrollment — how to write notes for onboarding changes |
| `engagement-adoption.md` | Dashboard personalization, Quick Access hub, tag-based "For You" content, RSVP loops, real-time updates — adoption-focused note writing |
| `in-app-guidance.md` | Toast system, empty states, status banners, confirmation dialogs, swipe hints — writing notes for UX guidance changes |
| `product-analytics.md` | Existing tracking via Supabase tables (reads, RSVPs, prayers), WARNING about missing analytics SDK, measuring release note reach |
| `roadmap-experiments.md` | EAS build profiles, OTA strategy, runtime version policy, role-based gating as feature flags, staged rollout via targeted announcements |
| `feedback-insights.md` | Indirect feedback signals (prayer counts, RSVP rates, approval velocity), WARNING about no feedback mechanism, feedback-informed note templates |