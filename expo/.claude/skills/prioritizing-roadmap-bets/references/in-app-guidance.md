# In-App Guidance Prioritization

## Contents
- Current Guidance Infrastructure
- Guidance Gaps to Prioritize
- Toast System Capabilities
- Empty State Patterns
- Anti-Patterns
- Checklist

## Current Guidance Infrastructure

EBC Connect has two in-app communication channels: toasts and empty states. There are no tooltips, coachmarks, feature tours, or contextual help.

### Toast System (toast-context.tsx)

```typescript
// Four toast types available via useToast():
showSuccess(message, options?)   // Green, 4s duration
showError(message, options?)     // Red, 6s duration (longer)
showWarning(message, options?)   // Amber
showInfo(message, options?)      // Blue

// Toasts support an action button:
showInfo('New feature available', {
  actionText: 'Try it',
  onAction: () => router.push('/new-feature'),
});

// Network status toast fires automatically on native:
// Uses @react-native-community/netinfo to detect offline
showOfflineError()  // Pre-built "You appear to be offline" message
```

### Confirmation Dialog (components/Toast.tsx)

```typescript
// Platform-aware confirmation for destructive actions:
const { confirm } = useConfirmation();
const confirmed = await confirm({
  title: 'Delete Prayer?',
  message: 'This cannot be undone.',
  destructive: true,  // Red confirm button
});
// Native: Alert.alert() | Web: Custom Modal overlay
```

## Guidance Gaps to Prioritize

| Gap | Impact | Effort | Notes |
|-----|--------|--------|-------|
| No first-use guidance on any screen | Every new member | Low — toast or card per screen | Highest activation impact |
| No feature discovery for hidden tabs | All users | Low — hub screen improvements | 6 tabs are hidden from tab bar |
| No contextual help for admin actions | Leaders/admins | Low — info icons + tooltips | Tag creation, approval flow |
| No "what's new" after OTA updates | All users | Medium — version tracking + modal | EAS Update happens silently |
| Empty states don't guide next action | All users | Low — improve existing copy | Most empty states are passive |

## Empty State Patterns

The codebase has two quality tiers of empty states. Prioritize upgrading Tier 2 to Tier 1.

### Tier 1: Actionable Empty States (Good)

```tsx
// announcements.tsx — role-aware CTA in empty state
{isAdminOrLeader && !searchQuery && !selectedTagFilter && (
  <TouchableOpacity style={styles.emptyCreateButton} onPress={handleCreateAnnouncement}>
    <Plus size={16} color="#7C3AED" />
    <Text>Create Announcement</Text>
  </TouchableOpacity>
)}

// family.tsx — dual CTA when no family exists
{!hasFamily && (
  <View>
    <TouchableOpacity onPress={() => setShowFamilyOptions(true)}>
      <Plus size={20} color="#FFFFFF" />
      <Text>Create Family</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => router.push('/join-family')}>
      <Link2 size={20} color="#7C3AED" />
      <Text>Join Family</Text>
    </TouchableOpacity>
  </View>
)}
```

### Tier 2: Passive Empty States (Needs Improvement)

```tsx
// events.tsx — tells user to "check back later" (no action)
<Text style={styles.emptyText}>No upcoming events</Text>
<Text style={styles.emptySubtext}>Check back later for new events</Text>

// forms.tsx — purely informational
<Text style={styles.emptyTitle}>No Signup Forms</Text>
<Text style={styles.emptySubtitle}>
  When events have signup forms available, they'll appear here.
</Text>

// prayers.tsx — partial guidance (only for 'open' tab)
<Text style={styles.emptyTitle}>
  {activeTab === 'open' ? 'No active prayers' : `No ${activeTab} prayers`}
</Text>
<Text style={styles.emptyText}>
  {activeTab === 'open' ? 'Tap "New" to add a prayer request' : ''}
</Text>
```

## Scoring Guidance Initiatives

### DO: Upgrade empty states that affect all members

```tsx
// HIGH priority: Events empty state affects every member
// Current: "Check back later" (passive)
// Better: Role-aware with CTA

// For leaders/admins:
<TouchableOpacity onPress={() => router.push('/create-event')}>
  <Text>Create your first event</Text>
</TouchableOpacity>

// For members:
<Text>No upcoming events yet. You'll see events here when they're posted.</Text>
// Optional: Link to calendar subscription
```

### DO: Use the existing toast system for feature discovery

```typescript
// The toast system already supports action buttons.
// Use info toasts for first-time feature hints:
const hasSeenPrayerHint = await loadData('hint_prayer_shown');
if (!hasSeenPrayerHint) {
  showInfo('Tap the heart to mark that you prayed', {
    actionText: 'Got it',
    onAction: () => saveData('hint_prayer_shown', true),
  });
}
```

### DON'T: Build a tooltip/coachmark system from scratch

```typescript
// BAD — building a full tooltip system for a few hints
// This requires: overlay management, positioning logic,
// scroll-aware anchoring, accessibility handling.
// Effort is HIGH for marginal gain.

// GOOD — use toasts for guidance, upgrade empty states for context
// Both systems already exist and are tested cross-platform.
```

## Anti-Patterns

### WARNING: Hidden Features Behind Hub Navigation

**The Problem:** 6 of 10 tab screens are hidden (`href: null`) and only accessible via `router.push` from the dashboard quick actions. Users who miss the dashboard cards may never discover events, prayers, announcements, forms, family, or admin.

**Why This Breaks:** Feature adoption depends on discoverability. Hidden navigation means hidden features. New users who scroll past the quick actions grid will assume the app only has 4 features (Home, Activity, Directory, Settings).

**The Fix:** Prioritize making hidden features discoverable without adding more tabs:

```tsx
// Option 1: Dashboard quick actions should be prominent, not scrollable
// Option 2: Activity tab could serve as a hub for all content types
// Option 3: Add search/command palette for feature discovery
```

### WARNING: Silent OTA Updates

**The Problem:** `expo-updates` pushes JS bundle updates silently. Users get new features or behavior changes with no explanation.

**Why This Breaks:** Users notice UI changes but don't understand them. This is confusing and erodes trust. New features go unnoticed because there's no "what's new" moment.

**The Fix:** Track app version in AsyncStorage and show a "What's New" modal on version change:

```typescript
import { loadData, saveData } from '@/lib/storage';
import Constants from 'expo-constants';

const currentVersion = Constants.expoConfig?.version;
const lastSeenVersion = await loadData('last_seen_version');
if (currentVersion !== lastSeenVersion) {
  // Show what's new modal
  await saveData('last_seen_version', currentVersion);
}
```

## Checklist

Copy this checklist when prioritizing guidance work:
- [ ] Does every empty state provide a next action (not just "check back later")?
- [ ] Are empty states role-aware (different CTA for admin vs member)?
- [ ] Can users discover all 10 tab screens from the visible navigation?
- [ ] Do OTA updates include a "what's new" moment?
- [ ] Are first-use hints implemented for key engagement actions?

See the **designing-inapp-guidance** skill for implementation patterns. See the **writing-release-notes** skill for "what's new" content.
