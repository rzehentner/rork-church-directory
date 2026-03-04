All 7 files generated. Here's what was created:

```
.claude/skills/mapping-conversion-events/
├── SKILL.md
└── references/
    ├── conversion-optimization.md
    ├── content-copy.md
    ├── distribution.md
    ├── measurement-testing.md
    ├── growth-engineering.md
    └── strategy-monetization.md
```

**Key decisions baked into the skill:**

- **PostHog is the recommended analytics SDK** (`bun add posthog-react-native`) — the codebase has zero instrumentation, 150+ console.logs, and no analytics package. PostHog works natively with Expo and has a free tier.

- **Funnel events fire at screen callbacks, never inside services** — `services/events.ts` is called from tests and admin scripts; tracking there would inflate counts and lose UI context.

- **Four concrete funnel stages** mapped to exact files: `app/(auth)/login.tsx` → `app/visitor-profile.tsx` → `app/(tabs)/family.tsx` → first RSVP/prayer/form.

- **Admin approval lag** is called out as the highest-risk churn point — pending users who wait >48 hours are likely lost.

- **Strategy framing** avoids vanity metrics (DAU, opens) and reframes success in terms leadership will trust: event RSVPs, prayer submissions, form completions, family connections.