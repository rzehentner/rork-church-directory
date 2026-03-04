# Roadmap Experiments Prioritization

## Contents
- Current Experiment Infrastructure
- Experiment-Ready Architecture
- Low-Cost Experiment Patterns
- Rollout Strategy
- Anti-Patterns
- Checklist

## Current Experiment Infrastructure

**EBC Connect has no experiment or feature flag system.** Every feature ships to 100% of users immediately. The only runtime gating is role-based (`pending`/`member`/`leader`/`admin`).

```typescript
// The ONLY conditional rendering is role-based:
const isStaff = profile?.role === 'admin' || profile?.role === 'leader';
{isStaff && <CreateButton />}

// No feature flags, no percentage rollouts, no A/B variants.
// church_settings has contact info only — no feature toggles.
```

### What Exists for Deployment

```typescript
// EAS Update provides OTA JS bundle updates:
// app.json → "updates": { "url": "..." }
// Runtime version policy: "appVersion"
// This means JS changes can ship without app store review.
// BUT: there is no way to target updates to a subset of users.
```

## Experiment-Ready Architecture

The codebase has structural advantages for experiments even without a platform:

### Role-Based Rollout (Available Now)

```typescript
// The role hierarchy enables staged rollouts:
// admin (1-2 people) → leader (5-10) → member (50-200) → pending
//
// Pattern: Ship to admins first, then expand
const { isAdmin, isAdminOrLeader, myRole } = useMe();

// Phase 1: Admin-only preview
const showNewFeature = isAdmin;

// Phase 2: Staff preview
const showNewFeature = isAdminOrLeader;

// Phase 3: All members
const showNewFeature = myRole !== 'pending';
```

### Tag-Based Targeting (Available Now)

```typescript
// Tags already support audience segmentation:
// services/tags.ts
export async function findPeopleByTags(
  tagIds: string[],
  matchAll: boolean  // ANY vs ALL matching
): Promise<string[]>  // Returns person IDs

// Create a "beta-testers" tag, assign to willing users,
// then gate features on tag membership.
// No new infrastructure needed — just a tag query.
```

### AsyncStorage Feature Flags (Low Effort)

```typescript
// For client-side experiments without a server:
import { loadData, saveData } from '@/lib/storage';

const FEATURE_FLAGS_KEY = 'feature_flags';

async function isFeatureEnabled(flag: string): Promise<boolean> {
  const flags = await loadData(FEATURE_FLAGS_KEY);
  return flags?.[flag] ?? false;
}

// Admin screen could toggle flags for testing:
async function setFeatureFlag(flag: string, enabled: boolean) {
  const flags = (await loadData(FEATURE_FLAGS_KEY)) || {};
  flags[flag] = enabled;
  await saveData(FEATURE_FLAGS_KEY, flags);
}
```

## Low-Cost Experiment Patterns

### Pattern 1: Admin-First Dogfooding

**When:** Testing a new screen or feature before broad rollout.

```typescript
// 1. Build the feature behind a role check
export default function NewFeatureScreen() {
  const { isAdmin } = useMe();
  if (!isAdmin) return <Redirect href="/(tabs)/dashboard" />;
  // ... feature implementation
}

// 2. Add a route in app/ (it's automatically available via Expo Router)
// 3. Admin tests for a week
// 4. Remove the role check to ship to all
```

### Pattern 2: Supabase Church Settings Toggle

**When:** Need server-controlled feature flags without a third-party platform.

```sql
-- Add a JSONB column to church_settings for feature flags:
ALTER TABLE church_settings
ADD COLUMN feature_flags JSONB DEFAULT '{}'::jsonb;

-- Set flags via admin UI or direct query:
UPDATE church_settings
SET feature_flags = '{"prayer_streaks": true, "event_checkin": false}'
WHERE id = 1;
```

```typescript
// Read in church-settings-context.tsx:
interface ChurchSettings {
  // ... existing fields
  featureFlags: Record<string, boolean>;
}

// Use in screens:
const { settings } = useChurchSettings();
const showPrayerStreaks = settings?.featureFlags?.prayer_streaks ?? false;
```

### Pattern 3: OTA-Based Staged Rollout

**When:** Shipping a significant change that should be tested before full rollout.

```bash
# EAS Update supports update channels and branches:
# 1. Create a "canary" channel for beta testers
eas channel:create canary

# 2. Push update to canary first
eas update --branch canary --message "Prayer streaks experiment"

# 3. After validation, push to production
eas update --branch production --message "Prayer streaks"
```

## Scoring Experiment Investment

| Approach | Setup Effort | Targeting | Measurement | Recommend When |
|----------|-------------|-----------|-------------|----------------|
| Role gating | Zero | By role (4 tiers) | Manual observation | Always — for admin preview |
| Tag-based | Zero | By audience segment | Manual observation | When testing with specific groups |
| AsyncStorage flags | Low | Per-device only | No server data | Local dev/testing |
| Church settings JSONB | Medium | All users (global toggle) | With analytics | First real feature flag system |
| EAS channels | Medium | By update channel | With analytics | Staged rollouts |
| PostHog flags | High | Percentage, cohort, user | Built-in analytics | When analytics platform is installed |

### DO: Start with role-based gating

```typescript
// This is FREE — the infrastructure exists. Every feature
// should be admin-tested before broad rollout.
// Validation loop:
// 1. Ship behind isAdmin check
// 2. Admin uses for 3-5 days
// 3. Expand to isAdminOrLeader
// 4. Staff uses for a week
// 5. Remove gate — ship to all members
```

### DON'T: Build a full experiment platform before installing analytics

```typescript
// BAD priority order:
// 1. Build feature flag service with variants, cohorts, statistical significance
// 2. Install analytics
//
// GOOD priority order:
// 1. Install analytics (see product-analytics.md)
// 2. Use role gating for staged rollouts (free)
// 3. Add church_settings JSONB flags (low effort)
// 4. THEN consider a dedicated experiment platform
```

## Anti-Patterns

### WARNING: Shipping to Everyone Without Preview

**The Problem:** Features go from development to all users with no intermediate step.

**Why This Breaks:** Bugs affect 100% of users immediately. There's no way to catch issues with a small group first. On a church app where trust matters, a broken feature erodes confidence.

**The Fix:** Always gate new features behind `isAdmin` for at least a few days before removing the check.

### WARNING: Permanent Feature Flags

**The Problem:** Feature flags that are never cleaned up become permanent conditional branches.

**Why This Breaks:** The codebase accumulates `if (flag)` checks that are always true, increasing complexity for no reason.

**The Fix:** Every flag should have a cleanup date. When a feature is fully rolled out, remove the flag and the conditional.

## Checklist

Copy this checklist when running an experiment:
- [ ] Is the feature gated behind `isAdmin` for initial testing?
- [ ] Has admin tested for at least 3 days?
- [ ] Is there a way to measure success (even manual observation)?
- [ ] Is the rollout plan documented (admin → leader → member)?
- [ ] Will the feature flag be removed after full rollout?
- [ ] Can this ship as OTA or does it need a native build?

See the **eas** skill for deployment channel configuration. See the **instrumenting-product-metrics** skill for measuring experiment outcomes.
