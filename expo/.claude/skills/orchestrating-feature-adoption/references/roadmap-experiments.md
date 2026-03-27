# Roadmap & Experiments Reference

## Contents
- Current Rollout Infrastructure
- Feature Gating via Roles
- Church Settings as Feature Config
- WARNING: No Feature Flag System
- OTA Update Strategy
- Experiment Design Without A/B Testing
- Rollout Checklist

## Current Rollout Infrastructure

EBC Connect uses **EAS Update for OTA JS bundle updates** and **role-based gating** for feature visibility. There is no feature flag system, no A/B testing, and no gradual rollout mechanism beyond manual role assignment.

| Mechanism | What It Controls | Granularity |
|-----------|-----------------|-------------|
| User role (`profiles.role`) | Tab visibility, create permissions, admin access | Per-user |
| Church settings (`church_settings`) | Church metadata, service times | Global |
| OTA updates (`eas update`) | JS bundle (all screens, logic, styles) | All users simultaneously |
| Native builds (`eas build`) | Native modules, app version | App Store review cycle |

## Feature Gating via Roles

Roles are the only per-user gating mechanism. They're checked via `useMe()` from `hooks/me-context.tsx`.

```tsx
// hooks/me-context.tsx — derived role checks
const isAdmin = profile?.role === 'admin';
const isLeader = profile?.role === 'leader';
const isAdminOrLeader = isAdmin || isLeader;

// app/(tabs)/_layout.tsx — tab visibility
{(profile?.role === 'admin' || profile?.role === 'leader') && (
  <Tabs.Screen name="admin" />
)}
```

```tsx
// DO — Use useMe() for role checks in screens
const { isAdminOrLeader } = useMe();
if (!isAdminOrLeader) return <UnauthorizedView />;

// DON'T — Check roles directly from user context
// useMe() centralizes role logic and derived state
const { profile } = useUser();
if (profile?.role !== 'admin') return null; // BAD: bypasses centralized checks
```

**Role hierarchy:** `admin` > `leader` > `member` > `pending` > `visitor`

Available roles in the `user_role` enum: admin, leader, member, pending, visitor.

## Church Settings as Feature Config

`hooks/church-settings-context.tsx` manages global church configuration via TanStack React Query with 5-minute stale time. These settings are admin-editable but not per-user.

```tsx
// hooks/church-settings-context.tsx — query setup
const { data: settings } = useQuery({
  queryKey: ['church-settings'],
  queryFn: fetchChurchSettings,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Currently stores: church name, pastor, address, phone, email, website, service times
// Could be extended with feature toggles:
// settings.features.potluck_enabled, settings.features.prayer_anonymous_allowed
```

```tsx
// DO — Extend church_settings for global feature toggles
// This leverages existing infrastructure without new tables

// DON'T — Add per-user feature flags to church_settings
// Church settings are global. Per-user flags need a separate table.
```

## WARNING: No Feature Flag System

**Detected:** No LaunchDarkly, Statsig, Firebase Remote Config, or custom feature flag table.

**Impact:**
- Cannot gradually roll out features to subsets of users
- Cannot A/B test different UX approaches
- Cannot quickly disable a broken feature without a code deploy
- All OTA updates go to all users simultaneously

**Recommended approach** (matching the Supabase-first architecture):

```sql
-- Lightweight feature flags in Supabase
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  rollout_pct INTEGER DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  allowed_roles TEXT[] DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO feature_flags (key, enabled, rollout_pct, allowed_roles, description) VALUES
  ('potluck_v2', true, 100, '{admin,leader}', 'New potluck UI'),
  ('prayer_streaks', false, 0, '{}', 'Prayer streak counter');
```

```typescript
// hooks/feature-flags-context.tsx — fetch flags with React Query
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useFeatureFlag(key: string): boolean {
  const { myRole, userId } = useMe();
  const { data: flags } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data } = await supabase.from('feature_flags').select('*').eq('enabled', true);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const flag = flags?.find(f => f.key === key);
  if (!flag) return false;
  if (flag.allowed_roles.length > 0 && !flag.allowed_roles.includes(myRole)) return false;
  if (flag.rollout_pct < 100) {
    // Deterministic hash for consistent experience
    const hash = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
    return hash < flag.rollout_pct;
  }
  return true;
}
```

See the **supabase** skill for table creation and the **tanstack-query** skill for caching patterns.

## OTA Update Strategy

EAS Update pushes JS bundle changes to all published builds. The runtime version policy is `appVersion`.

```bash
# Push OTA update to all users on the current app version
npx eas update --branch production --message "Add prayer streaks feature"

# Preview channel for internal testing before production
npx eas update --branch preview --message "Test prayer streaks"
```

```
// DO — Use preview branch for testing before production rollout
// 1. Merge to main
// 2. eas update --branch preview
// 3. Test on preview build
// 4. eas update --branch production

// DON'T — Push directly to production without preview testing
// OTA updates reach all users. A broken update means all users are affected.
```

**Rollback:** Push a new OTA update with the fix. There is no automatic rollback mechanism.

## Experiment Design Without A/B Testing

Without feature flags, use role-based "experiments" by granting features to leaders first:

```tsx
// Step 1: Gate new feature behind admin/leader role
const { isAdminOrLeader } = useMe();
{isAdminOrLeader && <NewFeatureCard />}

// Step 2: Measure engagement via Supabase queries
// Compare leader engagement with the feature vs member baseline

// Step 3: Remove role gate to release to all members
{<NewFeatureCard />}  // Now visible to everyone
```

**Limitations:**
- Leaders are not representative of the full user base
- Sample size is small (church leadership team)
- No statistical rigor — this is qualitative validation only

## Rollout Checklist

Copy this when releasing a new feature:

- [ ] Implement feature behind role gate (`isAdminOrLeader` check)
- [ ] Deploy via `eas update --branch preview` for internal testing
- [ ] Verify on iOS and Android preview builds
- [ ] Test empty states, error states, and loading states
- [ ] Verify pending-user path (blocked state or partial access)
- [ ] Push to production: `eas update --branch production`
- [ ] Monitor Supabase engagement tables for adoption signals
- [ ] After validation, remove role gate to release to all members
- [ ] Update admin panel if feature has admin-configurable settings

### Validate-and-Iterate Loop

1. Deploy feature to preview branch
2. Test on physical devices (iOS + Android)
3. If bugs found, fix and re-deploy to preview
4. Only push to production when preview testing passes
5. Monitor engagement queries for 1 week post-release
6. If adoption is low, investigate empty states and discovery surfaces

See the **prioritizing-roadmap-bets** skill for deciding which features to build and the **eas** skill for build/deploy commands.
