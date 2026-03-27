# Growth Engineering Reference

## Contents
- Growth Loops in EBC Connect
- Family Network Effects
- Feature Adoption by Tier
- WARNING: No Referral Mechanism
- Engagement Hooks
- Growth Checklist

## Growth Loops in EBC Connect

Community apps grow through network effects, not paid acquisition. EBC Connect has two natural growth loops:

```
Loop 1: Family Invitation
  Member joins → creates family → shares join token → family members sign up

Loop 2: Content Engagement
  Leader creates event → members RSVP → push notification → return visit
```

### Family Join Token — The Primary Growth Mechanism

```tsx
// app/(tabs)/family.tsx — join token sharing
<Text style={styles.tokenLabel}>Family Join Token</Text>
<View style={styles.tokenContainer}>
  <Text style={styles.tokenText}>{family.join_token}</Text>
  <TouchableOpacity onPress={handleCopyToken}>
    <Copy size={20} color={Colors.navy} />
  </TouchableOpacity>
</View>
<Text style={styles.tokenHelper}>
  Share this token with family members to let them join
</Text>
```

### DO: Make Token Sharing Frictionless

```tsx
// GOOD — copy to clipboard with haptic feedback
const handleCopyToken = async () => {
  await Clipboard.setStringAsync(family.join_token);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  showToast('success', 'Token copied to clipboard');
};
```

### DON'T: Require Manual Token Entry Without Alternatives

```tsx
// BAD — only way to join is typing a token manually
<TextInput
  placeholder="Enter family token"
  value={token}
  onChangeText={setToken}
/>
// What if the token is long or hard to type?
```

**Why this breaks:** Token-based sharing works for in-person interactions but fails for remote family members. Consider adding a share sheet or QR code for easier distribution.

## Family Network Effects

The family system is the core viral loop. Each family member who joins brings their household.

### Current Join Flow

```tsx
// app/join-family.tsx — search and join
// 1. Search family directory
const { data } = await supabase
  .from('family_directory_display')
  .select('*')
  .ilike('family_name', `%${searchQuery}%`);

// 2. Replace existing person record (if matching)
// Only persons with user_id = null can be claimed
// 3. Or join with token as new member
await supabase.rpc('join_family_with_token', { p_token: token });
```

### DO: Pre-populate Family Records

```tsx
// GOOD — admin creates person records before users sign up
// When the user joins, they "claim" their existing record
// This means the directory already knows about them
```

### DON'T: Require All Users to Create Records From Scratch

```tsx
// BAD — user signs up with no existing record, no family connection
// They see an empty family screen with no context
```

## Feature Adoption by Tier

Track which features each tier actually uses to identify value gaps:

| Feature | Expected Tier | Adoption Signal |
|---------|--------------|-----------------|
| RSVP to events | Member | Core engagement |
| Submit prayer request | Member | Community trust |
| Create announcement | Leader | Content creation |
| Manage prayers (bulk) | Leader | Moderation activity |
| Create bulletin | Admin | Administrative tool |
| Approve users | Admin | Growth enablement |

### DO: Surface Features at the Right Moment

```tsx
// GOOD — dashboard shows contextual feature discovery
// "For You" section surfaces tag-matched content
// Quick actions show counts to signal active content
{upcomingEventsCount > 0 && (
  <QuickActionCard
    label="Events"
    count={upcomingEventsCount}
    icon={CalendarDays}
  />
)}
```

### DON'T: Hide Features Behind Navigation Depth

```tsx
// BAD — burying the prayer feature 3 taps deep
// Dashboard → Settings → More Features → Prayers
// Users never find it
```

## WARNING: No Referral Mechanism

**The Problem:** The family join token is the only sharing mechanism. There is no way to:
- Share the app via a link
- Invite non-family church members
- Track who invited whom

**Impact:** Growth is limited to family-unit adoption. Individual members (singles, new attendees) have no invitation path.

**Recommended Fix:**

```tsx
// Add a general invite share action
import * as Sharing from 'expo-sharing';

const handleInvite = async () => {
  await Sharing.shareAsync('', {
    dialogTitle: 'Invite to EBC Connect',
    mimeType: 'text/plain',
    UTI: 'public.plain-text',
  });
};
// Or use expo-clipboard to copy a download link
```

## Engagement Hooks

### Current Engagement Patterns

```tsx
// 1. Birthday card on dashboard (monthly birthdays)
// 2. "For You" personalized content via tag matching
// 3. Pull-to-refresh on all feed screens
// 4. Push notification badges (red dot with count)
// 5. Unread announcement indicators (blue dot + left border)
```

### DO: Use Personalization to Drive Return Visits

```tsx
// GOOD — tag-based content matching
// Events and announcements use audience_tags to match user interests
// Dashboard "For You" section surfaces tag-matched content first
```

### DON'T: Show the Same Content to Everyone

```tsx
// BAD — no personalization, chronological-only feed
const { data } = await supabase
  .from('events')
  .select('*')
  .order('start_date', { ascending: true });
// Users see irrelevant events and stop checking
```

## Growth Checklist

Copy this when planning a growth feature:

- [ ] Identify the growth loop (who benefits from more users?)
- [ ] Reduce friction in the invitation/sharing flow
- [ ] Track the viral coefficient (invites sent per user)
- [ ] Ensure new users see value before requiring approval
- [ ] Surface personalized content early in the user journey
- [ ] Test the full signup-to-engagement flow end-to-end

See the **improving-activation-flow** skill for onboarding optimization.
See the **designing-onboarding-paths** skill for first-experience design.
