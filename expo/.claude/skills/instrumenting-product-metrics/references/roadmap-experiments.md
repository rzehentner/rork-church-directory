# Roadmap & Experiments Metrics

## Contents
- Feature Flag Integration
- Experiment Tracking Pattern
- Rollout Measurement
- Anti-Patterns
- Decision Framework

## Feature Flag Integration

PostHog feature flags work with the React Native SDK. Use them to gate new features and measure adoption before full rollout.

### Basic Feature Flag Usage

```typescript
import { useFeatureFlag } from 'posthog-react-native';

export default function DashboardScreen() {
  const showForYouSection = useFeatureFlag('dashboard_for_you_section');

  return (
    <ScrollView>
      {/* ... existing dashboard content ... */}
      {showForYouSection && <ForYouSection />}
    </ScrollView>
  );
}
```

### Track Feature Flag Exposure

PostHog auto-tracks feature flag evaluations, but explicitly capture when a user interacts with a flagged feature:

```typescript
const showNewPrayerUI = useFeatureFlag('new_prayer_ui');

// When user interacts with the flagged feature
const handlePrayToggle = async () => {
  await markPrayed(prayerId);
  posthog.capture('prayer_prayed', {
    prayer_id: prayerId,
    variant: showNewPrayerUI ? 'new_ui' : 'control',
  });
};
```

## Experiment Tracking Pattern

When testing a hypothesis, follow this structure:

### 1. Define the Experiment

```typescript
// Define experiment in a central config or PostHog dashboard
// Example: "Does showing event RSVP counts increase RSVP rate?"

// Variant A (control): Hide RSVP counts on event cards
// Variant B (treatment): Show "12 going" badge on event cards
```

### 2. Instrument Both Variants

In `app/(tabs)/events.tsx`:

```typescript
const rsvpCountVariant = useFeatureFlag('show_rsvp_counts');

// Track impression of the experiment
useEffect(() => {
  posthog.capture('experiment_exposed', {
    experiment: 'show_rsvp_counts',
    variant: rsvpCountVariant ? 'treatment' : 'control',
  });
}, []);

// The target metric (RSVP) is already tracked — PostHog correlates
// experiment exposure with downstream event_rsvp events automatically
```

### 3. Measure Impact

The key metrics to measure for any experiment:

| Metric | Query |
|--------|-------|
| Conversion rate | `event_rsvp` count / `experiment_exposed` count, grouped by variant |
| Time to convert | Median time between `experiment_exposed` and `event_rsvp` |
| Feature interaction | Any engagement event, filtered by `variant` property |

## Supabase-Native Feature Flags

If you want feature flags without PostHog, use the existing `church_settings` table or a dedicated `feature_flags` table:

```sql
create table feature_flags (
  key text primary key,
  enabled boolean default false,
  rollout_percentage int default 0 check (rollout_percentage between 0 and 100),
  allowed_roles text[] default '{}',
  updated_at timestamptz default now()
);
```

Client-side check:

```typescript
// lib/feature-flags.ts
import { supabase } from '@/lib/supabase';

export async function isFeatureEnabled(key: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled, rollout_percentage')
    .eq('key', key)
    .single();

  if (!data?.enabled) return false;
  if (data.rollout_percentage >= 100) return true;

  // Deterministic hash for consistent assignment
  const hash = simpleHash(userId + key) % 100;
  return hash < data.rollout_percentage;
}
```

## Rollout Measurement

When rolling out a new feature (e.g., potluck coordination), measure adoption at each rollout stage:

```
10% rollout → monitor error_shown rate + potluck_claimed count
50% rollout → compare engagement metrics vs. control
100% rollout → measure WAU impact, remove flag
```

Track rollout stage as a property:

```typescript
posthog.capture('potluck_claimed', {
  item_id,
  rollout_stage: '50_percent',  // or read from flag config
});
```

## WARNING: Feature Flags Without Cleanup

**The Problem:** Feature flags accumulate and are never removed after full rollout.

**Why This Breaks:**
1. Dead code paths remain, increasing bundle size
2. New developers don't know which flags are active
3. Flag evaluation adds latency on every render

**The Fix:** Set a cleanup date for every flag:

```typescript
// In feature flag config or comment
// FLAG: show_rsvp_counts
// Created: 2026-02-23
// Cleanup by: 2026-03-23 (30 days after full rollout)
// Owner: @admin
```

After full rollout, remove the flag and keep only the winning variant's code.

## WARNING: Experimenting Without a Baseline

**The Problem:** Launching an A/B test without first measuring the current state.

**Why This Breaks:**
1. No baseline = no way to measure lift
2. Seasonal effects (e.g., holiday events) skew results
3. Cannot tell if changes are improvements or noise

**The Fix:** Instrument the current behavior FIRST, collect 2+ weeks of baseline data, THEN launch the experiment.

```
1. Add tracking to current flow (e.g., event_rsvp rate)
2. Collect baseline: 2 weeks minimum
3. Launch experiment variant
4. Compare variant vs. baseline with statistical significance
```

## Decision Framework for Experiments

| Signal | Action |
|--------|--------|
| No analytics on feature | Instrument first, experiment later |
| Feature used by <10% of WAU | Not enough traffic for A/B test — just ship and measure |
| Feature used by >30% of WAU | Safe to A/B test — enough traffic for significance |
| Experiment shows <5% lift | Likely noise — keep control |
| Experiment shows >15% lift | Statistically significant at small sample — ship it |

## Roadmap Prioritization Metrics

When deciding what to build next, use these engagement signals from instrumented events. See the **prioritizing-roadmap-bets** skill for the full framework.

| Feature Area | Key Metric | Source |
|-------------|-----------|--------|
| Events | RSVP rate per event | `event_rsvp` / `screen_viewed(events)` |
| Prayers | Daily prayer rate | Unique users with `prayer_prayed` / DAU |
| Signups | Form completion rate | `signup_submitted` / `signup_form_opened` |
| Potluck | Claim rate | `potluck_claimed` / potluck sheet opens |
| Directory | Contact tap rate | `directory_contact_tapped` / directory views |

## Experiment Instrumentation Checklist

Copy this checklist and track progress:
- [ ] Install feature flag support (PostHog or Supabase-native)
- [ ] Instrument baseline metrics for experiment target area
- [ ] Collect 2+ weeks of baseline data
- [ ] Define experiment hypothesis and success metric
- [ ] Implement feature flag with variant tracking
- [ ] Add `experiment_exposed` event with variant property
- [ ] Launch at 10% rollout, monitor for errors
- [ ] Expand to 50%, compare metrics
- [ ] Full rollout or revert based on results
- [ ] Clean up feature flag code within 30 days of full rollout

## Related Skills

- See the **prioritizing-roadmap-bets** skill for ranking feature investments
- See the **scoping-feature-work** skill for sizing experiments
- See the **orchestrating-feature-adoption** skill for post-rollout adoption
