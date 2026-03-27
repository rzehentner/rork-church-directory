# Engagement & Adoption Reference

## Contents
- Engagement Surfaces in EBC Connect
- Dashboard Personalization
- Feature Discovery via Quick Access
- Tag-Based "For You" Content
- Real-Time Engagement Patterns
- RSVP and Interaction Loops
- DO/DON'T Patterns
- Writing Adoption-Focused Release Notes

## Engagement Surfaces in EBC Connect

The dashboard (`app/(tabs)/dashboard.tsx`) is the primary engagement hub. It surfaces personalized content, count badges, and CTAs to drive users into feature screens. Release notes about engagement changes should reference which dashboard section is affected.

## Dashboard Personalization

The dashboard greeting is time-aware and uses the person's first name:

```typescript
// app/(tabs)/dashboard.tsx
{new Date().getHours() < 12 ? 'Good morning' :
 new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'},
 {person?.first_name || 'friend'}
```

The "Join Your Family" CTA only appears for members without a family record:

```typescript
{!family && !isPending && (
  <TouchableOpacity style={styles.joinFamilyCard}
    onPress={() => router.push('/(tabs)/family')}>
    <Text style={styles.joinFamilyTitle}>Join Your Family</Text>
    <Text style={styles.joinFamilyText}>Connect with your family in the church community</Text>
  </TouchableOpacity>
)}
```

When writing release notes for dashboard changes, describe what the user **sees**, not the conditional logic.

## Feature Discovery via Quick Access

The Quick Access grid drives navigation to all major features. Each tile shows a live count badge:

```typescript
const quickActions = [
  { id: 'events',        label: 'Events',        count: stats.upcomingEventsCount },
  { id: 'announcements', label: 'Announcements', count: stats.unreadAnnouncementsCount },
  { id: 'prayers',       label: 'Prayers',        count: stats.activePrayersCount },
  { id: 'forms',         label: 'Sign Ups',       count: stats.openFormsCount },
  { id: 'family',        label: 'My Family',      count: stats.familyMembersCount },
  { id: 'directory',     label: 'Directory',       count: stats.totalDirectoryMembers },
];
```

Admin tile appears conditionally. Release notes about new hub tiles should mention both the tile name and what the count represents.

## Tag-Based "For You" Content

Users assigned tags see personalized sections on the dashboard:

```typescript
// Announcements tagged to match the user's own tags
{taggedAnnouncements.length > 0 && (
  <View>
    <Text style={styles.sectionLabel}>For You</Text>
    {/* announcement cards */}
  </View>
)}

// Events tagged to match the user's own tags
{taggedEvents.length > 0 && (
  <View>
    <Text style={styles.sectionLabel}>Events For You</Text>
    {/* event cards */}
  </View>
)}
```

Release notes for tag-based features should explain that content is **personalized to your groups** without exposing the tag system internals.

## Real-Time Engagement Patterns

The prayers screen uses Supabase Realtime for live updates:

```typescript
// app/(tabs)/prayers.tsx — realtime subscription
const channel = supabase
  .channel('prayer-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_requests' }, fetchPrayers)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_prayed' }, fetchPrayers)
  .subscribe();
```

Events refresh on a 60-second interval while the tab is focused. Release notes for real-time features should say "see updates as they happen" rather than explaining the subscription mechanism.

## RSVP and Interaction Loops

Events support inline RSVP with optimistic updates:

```typescript
// app/(tabs)/events.tsx — inline RSVP buttons
// "Going" / "Maybe" / "Can't Go" buttons directly on the event card
// State updates immediately, rolls back on error
```

The "Pray" button on prayer requests works similarly — tap to toggle, count updates immediately.

These interaction patterns are engagement drivers. Release notes should highlight the **action** ("RSVP right from the list") not the implementation ("optimistic state update").

## DO/DON'T Patterns

### DO: Highlight new engagement touchpoints

```markdown
// GOOD — focuses on what users can now do
- See events and announcements picked for your groups on the Home screen
- Birthday celebrations: see who's celebrating this month
```

### DON'T: Describe internal data flow

```markdown
// BAD — implementation detail, not a feature
- Dashboard now fetches tagged announcements via announcements_for_me view
- Added 60-second polling interval for events refresh
```

### DO: Quantify when useful

```markdown
// GOOD — concrete benefit
- Quick Access tiles now show live counts (unread announcements, upcoming events)
```

### DON'T: Announce engagement features that only work for some roles without saying so

```markdown
// BAD — "Pray" button is hidden from pending users
- New: tap to pray for any prayer request

// GOOD
- Members can now tap to pray for any prayer request
```

## Writing Adoption-Focused Release Notes

When a release adds a new engagement surface or modifies an existing one:

1. **Name the surface** — "Home screen," "Events tab," "Prayer feed"
2. **Describe the interaction** — "tap to RSVP," "swipe to see actions"
3. **State the benefit** — "without leaving the list," "see updates instantly"
4. **Note role restrictions** if any — "for members," "admins can now..."

See the **orchestrating-feature-adoption** skill for planning how users discover these features post-release. See the **designing-inapp-guidance** skill for the copy patterns used in empty states and CTAs.

### Adoption Release Note Template

```markdown
## [Feature Name]
- [One-line user benefit]
- [How to access it: "on the Home screen" / "in the Events tab"]
- [Any prerequisite: "join a group to see personalized content"]
```
