# Roadmap & Experiments Reference

## Contents
- Current Feature Flag Infrastructure
- Church Settings as Config
- Role-Based Feature Gating
- Proposing New Onboarding Experiments
- OTA Updates for Rapid Iteration
- Anti-Patterns

## Current Feature Flag Infrastructure

EBC Connect has **no feature flag system**. Feature visibility is controlled by two mechanisms:

1. **Role-based gating** via `useMe()` — admin/leader features are hidden from members
2. **Church settings** via React Query — organization-level config stored in Supabase

There is no LaunchDarkly, Statsig, PostHog feature flags, or equivalent. To run experiments, you must ship code behind role checks or church settings toggles.

## Church Settings as Config

The `church-settings-context.tsx` provides organization-level configuration cached with React Query (5-minute stale time). See the **tanstack-query** skill for caching patterns.

```typescript
// hooks/church-settings-context.tsx
export interface ChurchSettings {
  churchName: string;
  pastorName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  serviceTimes: ServiceTime[];
}
```

**Extending for feature flags:** Add a `features` field to ChurchSettings in Supabase:

```typescript
// Proposed extension — not yet in codebase
interface ChurchSettings {
  // ... existing fields ...
  features?: {
    onboardingChecklist?: boolean;
    prayerAnonymousDefault?: boolean;
    familyQrJoin?: boolean;
  };
}

// Usage in screens
const { settings } = useChurchSettings();
{settings?.features?.onboardingChecklist && <OnboardingChecklist />}
```

This approach uses the existing admin panel to toggle features without deploying code.

## Role-Based Feature Gating

The `useMe()` hook provides role checks used throughout the app:

```typescript
const { isAdmin, isAdminOrLeader, myRole, isPending } = useMe();

// Admin-only features
{isAdmin && <QuickAction id="admin" label="Admin" icon={<Shield />} />}

// Leader+ features (admin or leader)
{isAdminOrLeader && <CreateAnnouncementButton />}

// Pending user restrictions
{!isPending && <RSVPButton />}
```

**Roles hierarchy:** `admin` > `leader` > `member` > `visitor` > `pending`

To experiment with a feature for leaders before general rollout, gate it with `isAdminOrLeader` first, then remove the gate when promoting to all users.

## Proposing New Onboarding Experiments

### Experiment: Onboarding Checklist Card

**Hypothesis:** Showing a progress checklist on the dashboard increases profile completion and family join rates.

**Implementation plan:**

1. Add completion tracking (derived from existing context state — no new DB fields):
```typescript
const onboardingSteps = [
  { key: 'account', label: 'Create account', done: !!user },
  { key: 'profile', label: 'Complete profile', done: !!person?.first_name },
  { key: 'family', label: 'Join a family', done: !!family },
  { key: 'notifications', label: 'Enable notifications', done: notificationsEnabled },
];
```

2. Add a dismissible card component on the dashboard
3. Gate behind church settings toggle: `features.onboardingChecklist`
4. Measure: profile completion rate before/after (via Supabase query)

### Experiment: Biometric Prompt Timing

**Hypothesis:** Prompting for biometric auth during onboarding (not after first login) increases adoption.

**Current behavior:** Biometric prompt appears after first successful sign-in in `login.tsx`.

**Proposed change:** Move the prompt to `visitor-profile.tsx` after profile save, when the user has committed to the app.

### Experiment: Family QR Join

**Hypothesis:** QR code scanning for family join reduces friction vs. token-based join.

**Implementation:**
- Add `expo-barcode-scanner` for QR reading
- Generate QR code from family join token in family settings
- Scan flow: Camera → decode token → `join_family_with_token` RPC

## OTA Updates for Rapid Iteration

EAS Update enables shipping experiments without app store review. See the **eas** skill for deployment patterns.

```bash
# Ship an experiment to all users immediately
npx eas update --branch production --message "Add onboarding checklist experiment"

# Ship to preview channel for internal testing first
npx eas update --branch preview --message "Test onboarding checklist"
```

**Iteration workflow:**

1. Implement experiment behind church settings toggle
2. Deploy via OTA update
3. Admin enables feature in church settings
4. Measure impact via Supabase queries
5. If successful, remove toggle and make default
6. If unsuccessful, admin disables feature

## Anti-Patterns

### WARNING: Shipping Experiments Without a Kill Switch

**The Problem:**

```typescript
// BAD — hardcoded experiment, requires code deploy to disable
<OnboardingChecklist /> // Always rendered, no toggle
```

**Why This Breaks:**
1. If the experiment causes issues, you need an app store update to revert
2. No way to A/B test — it's all-or-nothing
3. Admin cannot control the experience

**The Fix:**

Gate experiments behind church settings or role checks. Use OTA updates for rapid deployment and church settings for runtime control.

### WARNING: Branching Onboarding Logic Without Cleanup

**The Problem:**

```typescript
// BAD — experiment branches accumulate over time
if (experiment === 'v1') { /* old flow */ }
else if (experiment === 'v2') { /* newer flow */ }
else if (experiment === 'v3') { /* newest flow */ }
```

**Why This Breaks:**
1. Code becomes unreadable with stale experiment branches
2. Testing burden multiplies with each variant
3. Bugs hide in unused code paths

**The Fix:**

When an experiment concludes, immediately remove the losing variant. Keep only the winning path. Use the **scoping-feature-work** skill to plan cleanup as part of the experiment lifecycle.

### Experiment Lifecycle Checklist

Copy this checklist when running an onboarding experiment:

- [ ] Define hypothesis and success metric
- [ ] Implement behind church settings toggle
- [ ] Add Supabase query for measurement (or client analytics event)
- [ ] Deploy via OTA update to preview channel
- [ ] Internal team tests on preview
- [ ] Deploy to production via OTA
- [ ] Admin enables feature in church settings
- [ ] Measure for 2+ weeks
- [ ] Decision: keep (remove toggle) or kill (remove code)
- [ ] Clean up: remove losing variant and toggle
