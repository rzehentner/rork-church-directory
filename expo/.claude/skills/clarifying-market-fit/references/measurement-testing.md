# Measurement & Testing Reference

## Contents
- Current Instrumentation State
- Critical Metrics for Market Fit
- Measuring Positioning Effectiveness
- Copy Testing Without A/B Infrastructure
- Funnel Measurement
- Validation Loop

## Current Instrumentation State

### WARNING: Zero Analytics Instrumentation

**Detected:** No analytics SDK in `package.json`. No PostHog, Amplitude, Mixpanel, Segment, or Firebase Analytics.

**Impact:** There is no way to measure whether positioning changes improve engagement, activation, or retention. The 150+ `console.log` calls across the codebase are the only visibility into user behavior.

**Recommended Solution:**

```bash
bun add posthog-react-native
```

```tsx
// app/_layout.tsx — initialize in the root layout
import { PostHogProvider } from 'posthog-react-native';

<PostHogProvider
  apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY}
  options={{ host: 'https://us.i.posthog.com' }}
>
  {/* existing providers */}
</PostHogProvider>
```

See the **instrumenting-product-metrics** skill for the full event taxonomy and implementation guide.

## Critical Metrics for Market Fit

For a church community app, market fit is measured by **community adoption**, not revenue.

| Metric | Definition | Target |
|--------|-----------|--------|
| Activation rate | % of sign-ups who complete profile + join family | >70% |
| Weekly active rate | % of approved members who open app weekly | >40% |
| Feature breadth | Avg features used per weekly active | >2 |
| Content creation rate | Prayer requests + event RSVPs per week | Trending up |
| Pending-to-member time | Days from sign-up to admin approval | <2 days |

### Measuring Activation Without Analytics

Query Supabase directly to measure funnel state:

```sql
-- Activation funnel snapshot
SELECT
  COUNT(*) FILTER (WHERE role IS NOT NULL) as signed_up,
  COUNT(*) FILTER (WHERE p.first_name IS NOT NULL) as profile_complete,
  COUNT(*) FILTER (WHERE p.family_id IS NOT NULL) as family_joined,
  COUNT(*) FILTER (WHERE role NOT IN ('pending', 'visitor')) as approved
FROM profiles pr
LEFT JOIN persons p ON p.user_id = pr.id;
```

## Measuring Positioning Effectiveness

Without analytics, use these proxy signals to evaluate positioning changes:

### 1. Profile Completion Rate

```sql
-- Are visitors completing profiles after seeing the value prop?
SELECT
  COUNT(*) FILTER (WHERE first_name IS NOT NULL AND last_name IS NOT NULL) * 100.0
  / NULLIF(COUNT(*), 0) as completion_pct
FROM persons
WHERE created_at > NOW() - INTERVAL '30 days';
```

### 2. Skip Rate on Visitor Profile

```tsx
// Add console.log to measure skip vs. complete
const handleSkip = () => {
  console.log('[positioning] visitor_profile_skipped');
  // future: posthog.capture('visitor_profile_skipped')
};

const handleSave = async () => {
  console.log('[positioning] visitor_profile_completed');
  // future: posthog.capture('visitor_profile_completed')
};
```

### 3. Time-to-Family-Join

```sql
-- How quickly do new members join a family after profile completion?
SELECT AVG(f_join.created_at - p.created_at) as avg_time_to_family
FROM persons p
JOIN persons f_join ON f_join.user_id = p.user_id AND f_join.family_id IS NOT NULL
WHERE p.created_at > NOW() - INTERVAL '30 days';
```

## Copy Testing Without A/B Infrastructure

### WARNING: No Feature Flag or A/B Testing System

**Detected:** No LaunchDarkly, Statsig, or feature flag infrastructure. All users see identical copy.

**Lightweight Alternative:** Use the `church_settings` Supabase table (already cached via React Query in `hooks/church-settings-context.tsx`) to store copy variants:

```tsx
// 1. Add a copy_variants JSONB column to church_settings
// 2. Read variants in the component
const { settings } = useChurchSettings();
const tagline = settings?.copy_variants?.login_tagline
  ?? 'Connecting our church family';
```

### Manual Copy Testing Process

```
1. Document current copy and baseline metrics (SQL queries above)
2. Deploy copy change via OTA update (npx eas update)
3. Wait 2 weeks for sufficient usage data
4. Compare metrics for the 2-week period before vs. after
5. If metrics improve, keep the change; if not, revert via another OTA update
```

## Funnel Measurement

### DO: Measure Each Funnel Step Independently

```tsx
// Track where users drop off in the activation funnel
// app/index.tsx — routing decision point
if (!user) {
  console.log('[funnel] redirect_to_login');
} else if (needsProfile) {
  console.log('[funnel] redirect_to_visitor_profile');
} else {
  console.log('[funnel] redirect_to_dashboard');
}
```

### DON'T: Measure Only End-State Outcomes

```tsx
// BAD — tells you nothing about WHERE users drop off
console.log('[metric] user_active');

// GOOD — track each step to identify the bottleneck
console.log('[funnel] step_1_signup_complete');
console.log('[funnel] step_2_profile_complete');
console.log('[funnel] step_3_family_joined');
console.log('[funnel] step_4_first_interaction');
```

## Validation Loop

When testing positioning changes:

1. Make the copy change in the source file
2. Verify copy renders correctly: `npx expo start --web`
3. Check no other screens use conflicting terminology: `grep -rn "old text" app/ components/`
4. If conflicting copy is found, fix all instances and repeat step 3
5. Only proceed when grep returns no matches
6. Deploy via OTA: `npx eas update`
7. Measure impact after 2 weeks using the SQL queries above
