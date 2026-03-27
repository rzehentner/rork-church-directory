The `SKILL.md` has been rewritten with proper skill content. Here's what was done:

**What was fixed:** The existing `SKILL.md` contained only a meta-summary of what was previously generated — not an actual usable skill file. All six reference files were already correct and comprehensive.

**What's now in place:**

| File | Status | Content |
|------|--------|---------|
| `SKILL.md` | **Rewritten** | Proper frontmatter, quick start (PostHog install → provider → typed helper), core event taxonomy, activation funnel, cross-skill links |
| `references/activation-onboarding.md` | OK | 4-step funnel with code for each stage, approval bottleneck warning, profile skip tracking, user property setup |
| `references/engagement-adoption.md` | OK | RSVP/prayer/signup/potluck events, WAU definition, `$set_once` for first-use milestones, anti-patterns |
| `references/in-app-guidance.md` | OK | Dashboard prompt card tracking, empty state impressions, biometric prompt, `trackedAlert` wrapper |
| `references/product-analytics.md` | OK | PostHog + Supabase-native setup, typed `useTrack` hook, platform considerations, two WARNING anti-patterns |
| `references/roadmap-experiments.md` | OK | Feature flags, experiment tracking, Supabase-native flags, rollout stages, decision framework |
| `references/feedback-insights.md` | OK | Implicit signals, form abandonment, error boundary tracking, PII sanitization, consent toggle |