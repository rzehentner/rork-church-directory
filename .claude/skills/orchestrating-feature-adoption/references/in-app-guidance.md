# In-App Guidance Reference

## Contents
- Guidance Surfaces in EBC Connect
- Empty State Pattern
- Conditional CTA Cards
- Blocked State Pattern
- Status Indicator Patterns
- Skeleton Loading States
- WARNING: No Tooltip or Coachmark System
- Guidance Copy Guidelines

## Guidance Surfaces in EBC Connect

The app uses five guidance mechanisms: empty states, conditional CTA cards, blocked states, status indicators, and toast messages. There are no tooltips, coachmarks, or "what's new" modals.

| Mechanism | Purpose | Example |
|-----------|---------|---------|
| Empty state | Explain what goes here + how to fill it | Prayers tab: "No active prayers. Tap 'New' to add" |
| CTA card | Nudge toward a specific action | Dashboard: "Complete Your Profile" card |
| Blocked state | Explain why access is restricted | Prayers: "Become a member to participate" |
| Status indicator | Show current state at a glance | Orange "Pending" badge, unread dot |
| Toast | Confirm actions, report errors | "RSVP confirmed!" after tapping Going |

## Empty State Pattern

Every list screen follows this structure: large icon (48-64px, gray `#E5E7EB`), title, subtitle with actionable hint.

```tsx
// Consistent empty state — used in events, prayers, announcements, forms, notifications
<View style={styles.emptyState}>
  <Calendar size={48} color="#E5E7EB" />
  <Text style={styles.emptyTitle}>No upcoming events</Text>
  <Text style={styles.emptySubtitle}>Check back later for new events</Text>
</View>
```

```tsx
// DO — Make subtitles actionable when the user can fix the empty state
// app/(tabs)/prayers.tsx line ~456
<Text style={styles.emptySubtitle}>Tap 'New' to add a prayer request</Text>

// DO — Make subtitles contextual when filters are active
// app/(tabs)/announcements.tsx line ~590
<Text style={styles.emptySubtitle}>
  {searchQuery ? 'No matching announcements' : 'Check back later for updates'}
</Text>

// DON'T — Use generic "Nothing here" messages
// They tell the user nothing about what to do next
<Text>Nothing to see here</Text>  // BAD: no guidance
```

**Empty state styling constants:**

```typescript
// Consistent across all screens
emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
```

## Conditional CTA Cards

Dashboard CTA cards appear based on user state. They follow a card layout: icon container + text block + chevron.

```tsx
// Profile completion CTA — app/(tabs)/dashboard.tsx line ~390-401
{isPending && (!person?.first_name || !person?.last_name) && (
  <TouchableOpacity style={styles.profilePrompt} onPress={() => router.push('/visitor-profile')}>
    <View style={styles.promptIconContainer}>
      <User size={24} color={Colors.navy} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.promptTitle}>Complete Your Profile</Text>
      <Text style={styles.promptSubtitle}>Help your church family get to know you</Text>
    </View>
    <ChevronRight size={20} color={Colors.text.secondary} />
  </TouchableOpacity>
)}
```

**CTA card rules:**

```tsx
// DO — Gate on specific conditions that dismiss the card after action
// The profile card disappears after first/last name are set

// DON'T — Show persistent cards that can't be dismissed
// If a CTA can't be acted on or dismissed, it becomes noise

// DO — Route to the exact screen that resolves the CTA
// Profile card → /visitor-profile (not settings, not a modal)

// DON'T — Use vague routes or show a card that leads to more choices
// Every CTA tap should feel like progress
```

## Blocked State Pattern

When a feature is restricted by role, show an explanatory blocked state instead of hiding the feature.

```tsx
// app/(tabs)/prayers.tsx lines 315-329 — pending user block
<View style={styles.pendingContainer}>
  <AlertCircle size={32} color={Colors.status.warning} />
  <Text style={styles.pendingTitle}>Become a member to participate in the prayer list</Text>
  <Text style={styles.pendingBody}>Your account is pending admin approval</Text>
</View>
```

```tsx
// app/(tabs)/family.tsx lines 425-432 — pending with partial access
<View style={styles.pendingBanner}>
  <AlertCircle size={16} color={Colors.status.warning} />
  <Text style={styles.pendingBannerText}>
    Your account is pending approval. You can create or join a family while waiting.
  </Text>
</View>
```

```tsx
// DO — Differentiate "fully blocked" from "partially available"
// Prayers: fully blocked for pending users (can't create/view)
// Family: partially available (can create/join while pending)

// DON'T — Use the same blocked message everywhere
// Context matters: "pending approval" is the shared reason,
// but the impact differs per feature
```

## Status Indicator Patterns

Status indicators provide at-a-glance state without requiring user action.

```tsx
// Unread notification badge — dashboard.tsx + settings.tsx
{unreadCount > 0 && (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{unreadCount}</Text>
  </View>
)}

// Pending role badge — dashboard.tsx line ~356
{isPending && (
  <View style={styles.pendingTag}>
    <Text style={styles.pendingTagText}>Pending</Text>
  </View>
)}

// Unread announcement dot — announcements.tsx lines 957-962
{!item.is_read && <View style={styles.unreadDot} />}

// RSVP status badge — event-detail.tsx
<View style={[styles.rsvpBadge, { backgroundColor: rsvpColor }]}>
  <Text style={styles.rsvpText}>{rsvpStatus}</Text>
</View>
```

## Skeleton Loading States

Use `Skeleton` component from `components/Skeleton.tsx` for content placeholders during data fetches.

```tsx
// components/Skeleton.tsx — animated pulse (opacity 0.3 → 1, 2s loop)
import Skeleton, { PersonCardSkeleton, TagSkeleton } from '@/components/Skeleton';

// Dashboard quick actions skeleton — dashboard.tsx line ~327
{isLoading && (
  <View style={styles.skeletonGrid}>
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} width={100} height={80} radius={12} />
    ))}
  </View>
)}
```

```tsx
// DO — Show skeletons that match the shape of the loaded content
// Quick Access cards → 6 rectangular skeletons in a grid
// Person cards → PersonCardSkeleton (circle + lines)

// DON'T — Use a centered spinner for content-heavy screens
// Spinners provide no spatial context about what's loading
// Skeletons maintain layout stability and reduce perceived load time
```

## WARNING: No Tooltip or Coachmark System

**Detected:** No tooltip, coachmark, or "what's new" infrastructure.

**Impact:**
- New features appear without introduction
- Users must discover features organically
- No way to highlight new additions after an OTA update
- "For You" sections are unexplained to first-time users

**Recommended pattern** (lightweight, no new dependencies):

```tsx
// A simple first-visit banner using AsyncStorage
const SEEN_KEY = 'seen_for_you_explainer';

const [hasSeen, setHasSeen] = useState(true); // default hidden
useEffect(() => {
  AsyncStorage.getItem(SEEN_KEY).then(val => setHasSeen(val === 'true'));
}, []);

const handleDismiss = async () => {
  await AsyncStorage.setItem(SEEN_KEY, 'true');
  setHasSeen(true);
};

{!hasSeen && (
  <View style={styles.explainer}>
    <Text style={styles.explainerText}>
      Content here is matched to your tags. Add tags in Settings to see more.
    </Text>
    <TouchableOpacity onPress={handleDismiss}>
      <X size={16} color={Colors.text.secondary} />
    </TouchableOpacity>
  </View>
)}
```

See the **designing-inapp-guidance** skill for a more comprehensive coachmark system.

## Guidance Copy Guidelines

EBC Connect uses a church-family tone. Follow these patterns:

| Context | Pattern | Example |
|---------|---------|---------|
| Empty state title | State the absence plainly | "No active prayers" |
| Empty state subtitle | Suggest the next action | "Tap 'New' to add a prayer request" |
| CTA card title | Action-oriented, 3-5 words | "Complete Your Profile" |
| CTA card subtitle | Explain the benefit | "Help your church family get to know you" |
| Blocked state | Explain the restriction + path forward | "Become a member to participate" |
| Toast success | Confirm what happened | "RSVP confirmed!" |
| Toast error | State what failed + suggest retry | "Could not submit. Please try again." |
