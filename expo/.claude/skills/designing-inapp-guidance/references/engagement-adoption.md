# Engagement & Adoption Guidance

## Contents
- Dashboard as Engagement Hub
- Feature Discovery CTAs
- Badge and Indicator Patterns
- Notification-Driven Re-engagement
- WARNING: Missing Feature Adoption Tracking
- Adoption Pattern Checklist

## Dashboard as Engagement Hub

`app/(tabs)/dashboard.tsx` is the primary engagement surface. It uses time-of-day greetings, contextual cards, and quick action tiles to drive feature usage.

```tsx
// app/(tabs)/dashboard.tsx — personalized greeting
<Text style={styles.greeting}>
  {new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 18
    ? 'Good afternoon'
    : 'Good evening'}
</Text>
```

```tsx
// app/(tabs)/dashboard.tsx — birthday card (contextual engagement)
{birthdays.length > 0 && (
  <View style={styles.birthdayCard}>
    <View style={styles.birthdayHeader}>
      <Cake size={20} color="#D4A843" />
      <Text style={styles.birthdayHeaderText}>Happy Birthday!</Text>
    </View>
    {birthdays.map((person) => (
      <View key={person.id} style={styles.birthdayItem}>
        <Text style={styles.birthdayName}>
          {person.first_name} {person.last_name}
        </Text>
      </View>
    ))}
  </View>
)}
```

### DO: Surface time-sensitive, social content on the dashboard

Birthdays, upcoming events, and unread announcements give users a reason to open the app. Static dashboards don't drive return visits.

### DON'T: Overload the dashboard with every feature

Quick actions are limited to 6 tiles. Adding more creates decision paralysis. Use the **prioritizing-roadmap-bets** skill to decide which actions earn dashboard placement.

## Feature Discovery CTAs

The app uses inline cards to surface features users haven't tried yet.

```tsx
// app/(tabs)/dashboard.tsx — join family CTA
{!family && !isPending && (
  <View style={styles.sectionContainer}>
    <TouchableOpacity
      style={styles.joinFamilyCard}
      onPress={() => router.push('/(tabs)/family')}
    >
      <Heart size={24} color="#EC4899" />
      <View style={styles.joinFamilyContent}>
        <Text style={styles.joinFamilyTitle}>Join Your Family</Text>
        <Text style={styles.joinFamilyText}>
          Connect with your family in the church community
        </Text>
      </View>
      <View style={styles.joinFamilyBtn}>
        <Plus size={16} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  </View>
)}
```

This card only appears when the user has no family — it's conditional discovery, not a permanent ad. Once the user joins a family, the CTA disappears.

### DO: Show discovery CTAs based on missing data, not arbitrary schedules

Condition on `!family`, `!hasRSVP`, `!hasProfilePhoto` — concrete states that map to uncompleted actions.

### DON'T: Show feature CTAs after the user has already adopted the feature

A "Join a Family" card shown to someone who already has a family is noise. Always guard CTAs with state checks.

## Badge and Indicator Patterns

Badges communicate status without requiring user action.

```tsx
// app/(tabs)/forms.tsx — spots remaining indicator
function SpotsIndicator({ confirmed, max }: { confirmed: number; max: number | null }) {
  if (!max) return null;
  const remaining = max - confirmed;
  const pct = Math.min(confirmed / max, 1);

  return (
    <View style={styles.spotsContainer}>
      <View style={styles.spotsBarBg}>
        <View
          style={[styles.spotsBarFill, {
            width: `${pct * 100}%`,
            backgroundColor: remaining <= 0
              ? '#EF4444'
              : remaining <= 5 ? '#F59E0B' : '#10B981',
          }]}
        />
      </View>
      <Text style={[styles.spotsText, remaining <= 0 && styles.spotsTextFull]}>
        {remaining <= 0 ? 'Full — waitlist only' : `${remaining} spot${remaining !== 1 ? 's' : ''} left`}
      </Text>
    </View>
  );
}
```

```tsx
// app/(tabs)/announcements.tsx — status indicators
<View style={styles.statusIndicators}>
  {announcement.is_public && (
    <View style={styles.publicBadge}><Globe size={10} color="#10B981" /></View>
  )}
  {!announcement.is_read && <View style={styles.unreadDot} />}
  {expired && (
    <View style={styles.expiredBadge}><Clock size={10} color="#9CA3AF" /></View>
  )}
</View>
```

### DO: Use color to encode urgency (red = full, amber = almost, green = available)

The `SpotsIndicator` drives urgency through color progression. This encourages early sign-up.

### DON'T: Use badges without explaining what they mean

An unread dot is self-explanatory. But a role badge like "Leader" needs initial context. See the **designing-onboarding-paths** skill for introducing role concepts.

## Notification-Driven Re-engagement

`hooks/notification-context.tsx` polls for unread notifications every 30 seconds and shows a badge count on the dashboard bell icon.

```tsx
// hooks/notification-context.tsx — polling interval
const interval = setInterval(fetchUnreadCount, 30000);

// app/(tabs)/dashboard.tsx — notification badge
<TouchableOpacity onPress={() => router.push('/notifications')}>
  <Bell size={24} color={Colors.navy} />
  {unreadCount > 0 && (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
    </View>
  )}
</TouchableOpacity>
```

See the **tanstack-query** skill for better polling patterns with `refetchInterval`.

## WARNING: Missing Feature Adoption Tracking

**Detected:** No analytics library in dependencies. No tracking of which features users discover or engage with.

**Impact:** Cannot measure whether guidance CTAs actually drive adoption. No data on feature usage frequency, drop-off points, or which empty states users hit most.

**Recommended:** Track key adoption events in Supabase (a `user_events` table or RPC) to measure:
- Profile completion rate
- Family join rate
- First RSVP timestamp
- First prayer request timestamp

See the [product-analytics](product-analytics.md) reference for implementation patterns.

## Adoption Pattern Checklist

Copy this checklist when adding a new feature discovery flow:

- [ ] Identify the trigger condition (what user state means "hasn't adopted"?)
- [ ] Build a conditional CTA card with icon + title + subtitle + action
- [ ] Guard the CTA so it disappears after adoption
- [ ] Add a toast confirmation after the user completes the action
- [ ] Verify the CTA works for all roles (pending, member, admin)
- [ ] Test that the CTA doesn't appear for users who already completed the action
