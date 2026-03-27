# Roadmap & Experiments for Guidance

## Contents
- Current Experimentation State
- Guidance Features to Build
- Feature Flag Pattern
- A/B Testing Guidance Copy
- Rollout Checklist
- Iteration Pattern

## Current Experimentation State

EBC Connect has **no feature flag system** and **no A/B testing infrastructure**. All features ship to all users simultaneously via EAS Update OTA pushes. The only gating mechanism is role-based access (`admin`, `leader`, `member`, `pending`, `visitor`).

This means guidance changes — new empty states, CTA copy, banner wording — go live immediately. There's no way to test whether new guidance copy improves activation without shipping it to everyone.

## Guidance Features to Build

Prioritized by impact on activation and adoption. See the **prioritizing-roadmap-bets** skill for the evaluation framework.

| Feature | Impact | Effort | Status |
|---------|--------|--------|--------|
| Onboarding checklist (dashboard) | High | Medium | Not started |
| Tooltip component | Medium | Low | Not started |
| "What's new" modal after OTA update | Medium | Low | Not started |
| Help/FAQ screen | Low | Medium | Not started |
| Contextual field-level help icons | Medium | Low | Not started |
| Feature tour (first-time tab navigation) | High | High | Not started |

### Onboarding Checklist

The highest-impact guidance addition. Shows activation progress on the dashboard.

```tsx
// Proposed: components/OnboardingChecklist.tsx
interface ChecklistItem {
  key: string;
  label: string;
  isComplete: boolean;
  route: string;
  icon: React.ComponentType;
}

function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  const completed = items.filter(i => i.isComplete).length;
  const progress = completed / items.length;

  return (
    <View style={styles.checklistCard}>
      <Text style={styles.checklistTitle}>Get Started</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{completed} of {items.length} complete</Text>
      {items.filter(i => !i.isComplete).map(item => (
        <TouchableOpacity
          key={item.key}
          style={styles.checklistRow}
          onPress={() => router.push(item.route)}
        >
          <View style={styles.checkCircle} />
          <Text style={styles.checklistLabel}>{item.label}</Text>
          <ChevronRight size={14} color="#94A3B8" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

### "What's New" Modal

Surface after OTA updates to highlight new features.

```tsx
// Proposed pattern using expo-updates
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkForWhatsNew() {
  const currentVersion = Updates.updateId ?? 'initial';
  const lastSeen = await AsyncStorage.getItem('lastSeenUpdateId');

  if (lastSeen !== currentVersion) {
    setShowWhatsNew(true);
    await AsyncStorage.setItem('lastSeenUpdateId', currentVersion);
  }
}
```

## Feature Flag Pattern

Without a dedicated feature flag service, use a church_settings column or AsyncStorage flag.

```tsx
// Using church settings (already has React Query caching)
// See the tanstack-query skill for the existing pattern
const { settings } = useChurchSettings();
const isFeatureEnabled = settings?.feature_flags?.onboarding_checklist ?? false;

// Or: simple AsyncStorage flag for client-only experiments
const [showNewGuidance, setShowNewGuidance] = useState(false);
useEffect(() => {
  AsyncStorage.getItem('experiment_new_empty_states').then(val => {
    setShowNewGuidance(val === 'true');
  });
}, []);
```

### DO: Use church_settings for server-controlled flags

This lets admins toggle features without an app update. The settings are already cached via React Query.

### DON'T: Build a custom feature flag service

The app doesn't need LaunchDarkly. A JSONB column on `church_settings` with React Query caching is sufficient for this scale.

## A/B Testing Guidance Copy

Without a proper experimentation platform, use deterministic bucketing by user ID.

```tsx
// Simple A/B test for guidance copy
function getVariant(userId: string, experimentKey: string): 'A' | 'B' {
  const hash = userId.charCodeAt(0) + experimentKey.length;
  return hash % 2 === 0 ? 'A' : 'B';
}

// Usage in empty state
const variant = getVariant(userId, 'empty_events_copy');
const emptyText = variant === 'A'
  ? 'No upcoming events — check back later'
  : 'Your calendar is clear! Browse past events for ideas';
```

### WARNING: This is NOT statistically rigorous

This pattern is fine for comparing two copy variants in a small community app. It is NOT suitable for product decisions at scale. For real experimentation, add PostHog or Statsig.

## Rollout Checklist

Copy this checklist when shipping new guidance features:

- [ ] Define success metric (what behavior should increase?)
- [ ] Implement guidance component with feature flag guard
- [ ] Test with all user roles (admin, leader, member, pending, visitor)
- [ ] Test on iOS, Android, and web
- [ ] Ship behind flag (disabled by default)
- [ ] Enable for admin accounts first
- [ ] Monitor for 1 week, check success metric
- [ ] If positive, enable for all users
- [ ] Remove feature flag guard after full rollout

## Iteration Pattern

For guidance that needs refinement:

1. Ship initial copy and measure interaction rate
2. If interaction rate < 10%, revise copy and visual treatment
3. Validate: check Supabase for increased adoption of target action
4. If adoption unchanged after 2 iterations, reconsider whether the guidance is solving the right problem
5. Only proceed to next guidance feature when current one is validated

See the **mapping-user-journeys** skill for identifying where users actually get stuck, rather than guessing.
