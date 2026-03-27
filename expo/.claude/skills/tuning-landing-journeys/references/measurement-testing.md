# Measurement & Testing Reference

## Contents
- Funnel Events to Instrument
- Current Analytics State
- Adding Conversion Tracking
- A/B Testing Without a Dedicated Tool
- Validating Copy Changes
- Anti-Patterns

---

## Funnel Events to Instrument

The guest-to-member activation funnel has five measurable checkpoints:

| Step | Event Name | Where to Fire | Key Properties |
|------|-----------|--------------|----------------|
| 1 | `app_open_unauthenticated` | `app/index.tsx` — no session | `platform` |
| 2 | `sign_up_completed` | `hooks/auth-context.tsx` — `signUp` success | `method: 'email'\|'magic_link'` |
| 3 | `profile_saved` | `app/visitor-profile.tsx` — save success | `has_photo: boolean` |
| 4 | `profile_skipped` | `app/visitor-profile.tsx` — skip press | — |
| 5 | `dashboard_activated` | `app/index.tsx` — member routed to dashboard | `days_since_signup` |

Secondary engagement events worth tracking:
- `event_rsvp` — `services/events.ts`
- `prayer_submitted` — `services/prayer.ts`
- `push_opt_in` — `lib/notifications.ts`
- `family_joined` — `app/join-family.tsx`

---

## Current Analytics State

### WARNING: No Analytics Instrumentation

**Detected:** No analytics library (PostHog, Amplitude, Mixpanel, Segment) in `package.json`.

**Impact:** You cannot measure funnel drop-off, identify which gates leak most, or validate whether copy changes improve conversion.

**Recommended Solution:** PostHog is the best fit — open-source, React Native SDK, self-hostable, free tier covers church-scale usage.

```bash
bun add posthog-react-native
```

```typescript
// lib/analytics.ts — thin wrapper so you can swap providers later
import PostHog from 'posthog-react-native'

export const analytics = new PostHog('YOUR_POSTHOG_KEY', {
  host: 'https://app.posthog.com',
})

export function track(event: string, properties?: Record<string, unknown>) {
  analytics.capture(event, properties)
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  analytics.identify(userId, traits)
}
```

See the **mapping-conversion-events** skill for full instrumentation patterns.

---

## Adding Conversion Tracking

Instrument each gate where it fires. Don't instrument centrally — co-locate tracking with the action.

**Gate 1 — Sign-up:**

```typescript
// hooks/auth-context.tsx — inside signUp() on success
import { track } from '@/lib/analytics'

if (!error) {
  track('sign_up_completed', { method: 'email' })
}
```

**Gate 2 — Profile saved vs. skipped:**

```typescript
// app/visitor-profile.tsx
async function handleSave() {
  await saveProfile(profileData)
  track('profile_saved', { has_photo: !!photoUri })
}

function handleSkip() {
  track('profile_skipped')
  router.replace('/(tabs)/dashboard')
}
```

**Gate 3 — First dashboard activation:**

```typescript
// app/index.tsx — track when a newly approved member reaches the dashboard
// Guard with a flag so you don't double-count returning sessions
const isFirstActivation = profile?.status === 'member' && !profile.activated_at
if (isFirstActivation) {
  track('dashboard_activated')
  // Update activated_at in Supabase so this fires only once
}
```

---

## A/B Testing Without a Dedicated Tool

Without PostHog feature flags, use church settings stored in Supabase as a lightweight variant flag:

```typescript
// Supabase: add experiment column to church_settings table
// church_settings.experiments: { loginTagline: 'control' | 'benefit_focused' }
```

```typescript
// hooks/church-settings-context.tsx — expose experiment variant
const loginTaglineVariant = churchSettings?.experiments?.loginTagline ?? 'control'
```

```tsx
// app/(auth)/login.tsx — variant-aware copy
const tagline = loginTaglineVariant === 'benefit_focused'
  ? 'Everything at Edna Baptist, in one place.'
  : 'Stay connected with your church community'

<Text style={styles.tagline}>{tagline}</Text>
```

**Limitation:** Supabase-based flags are church-wide, not per-user. Every user sees the same variant. This works for sequential tests (run control for 2 weeks, run variant for 2 weeks) but not true A/B splits. For rigorous testing, use PostHog feature flags.

---

## Validating Copy Changes

When you change copy on a high-traffic screen (login, visitor-profile), establish a baseline before shipping:

**Iteration protocol:**

1. Define your success metric before changing anything (e.g., `profile_saved` / `sign_up_completed` ratio)
2. Run the current copy for 2 weeks with tracking to establish baseline
3. Ship the copy change via OTA update (`npx eas update`)
4. Run for 2 more weeks under identical conditions
5. Compare rates — a >10% lift is signal, not noise at church scale

**OTA-safe copy changes:**
- Taglines, headings, body text
- CTA labels
- Empty-state copy
- Error messages

**Require full build (not OTA):**
- Layout changes
- New native permissions
- New components with native dependencies

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No analytics library | Blind to all funnel metrics | Install PostHog, instrument gates |
| Tracking only happy paths | Skips and errors are invisible | Track `profile_skipped`, auth errors |
| A/B testing without a baseline | Nothing to compare against | 2-week baseline before any test |
| Shared variant across all users | Can't isolate treatment effect | Use PostHog per-user flags for rigorous tests |
| Shipping copy changes without measuring | No way to know if it helped | Always define metric + baseline first |
