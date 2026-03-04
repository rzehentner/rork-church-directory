# Growth Engineering Reference

## Contents
- Growth Loops in EBC Connect
- Family Invite Loop
- Content-Sharing Loop
- Re-engagement Hooks
- Viral Mechanics
- Anti-Patterns

---

## Growth Loops in EBC Connect

EBC Connect has two natural growth loops built into its feature set:

**Loop 1 — Family Invite:**
```
Member creates family → shares join link → family member signs up
→ visitor-profile → pending approval → activated member → creates/joins family
```

**Loop 2 — Content Engagement:**
```
Admin posts event/announcement → member receives notification → member RSVPs/reads
→ member shares event with non-member → non-member downloads app → signs up
```

Both loops exist in code but lack strong CTAs to activate them.

---

## Family Invite Loop

The join-family flow is built (`app/join-family.tsx`) but the share trigger on the family screen needs strengthening.

```tsx
// app/(tabs)/family.tsx — strengthen the invite CTA
// CURRENT: likely in an overflow menu or secondary position
// GOOD — make it the primary empty-state action

{familyMembers.length === 0 ? (
  <TouchableOpacity
    style={styles.primaryCTA}
    onPress={handleShareFamilyLink}
  >
    <UserPlus size={20} color={Colors.white} />
    <Text style={styles.primaryCTALabel}>Invite your family</Text>
  </TouchableOpacity>
) : (
  // Family exists — show add-member as secondary CTA
  <TouchableOpacity onPress={handleShareFamilyLink}>
    <UserPlus size={16} color={Colors.navy} />
    <Text style={styles.secondaryCTA}>Add a family member</Text>
  </TouchableOpacity>
)}
```

**Share mechanism** — use the native share sheet via `expo-sharing`:

```typescript
// utils/share.ts
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import { Platform } from 'react-native'

export async function shareFamilyInvite(familyId: string) {
  const link = `https://ebcconnect.app/join-family?id=${familyId}`

  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(link)
    return 'copied'
  }

  await Sharing.shareAsync(link, {
    dialogTitle: 'Invite to your family group',
  })
  return 'shared'
}
```

---

## Content-Sharing Loop

Events and signup forms are shareable via ICS export (already implemented in `utils/calendar.ts`). Extend to shareable deep links:

```typescript
// utils/share.ts — event deep link share
export async function shareEventLink(eventId: string, eventTitle: string) {
  const link = `https://ebcconnect.app/event-detail?id=${eventId}`

  if (await Sharing.isAvailableAsync()) {
    // Native share sheet with text + link
    await Sharing.shareAsync(link, {
      dialogTitle: `Share: ${eventTitle}`,
    })
  } else {
    // Web fallback
    await Clipboard.setStringAsync(link)
  }
}
```

Surface the share CTA on event-detail:

```tsx
// app/event-detail.tsx — add share button to header
<TouchableOpacity onPress={() => shareEventLink(event.id, event.title)}>
  <Share2 size={20} color={Colors.navy} />
</TouchableOpacity>
```

---

## Re-engagement Hooks

### Push Notification Sequences

Expand beyond event reminders (currently the only scheduled notification):

```typescript
// lib/notifications.ts — prayer activity notification
export async function sendPrayerActivityNotification(
  targetUserId: string,
  prayerCount: number
) {
  // Send via Expo Push API to the user's registered token
  const message = {
    to: await getTokenForUser(targetUserId),
    title: 'People are praying for you',
    body: `${prayerCount} ${prayerCount === 1 ? 'person has' : 'people have'} prayed for your request.`,
    data: { screen: 'prayers' },
  }
  // POST to https://exp.host/--/api/v2/push/send
}
```

### In-App Re-engagement for Web

Web users have no push channel. The existing Toast system handles in-app banners:

```typescript
// Show re-engagement banner for web users on dashboard load
// hooks/toast-context.tsx — showToast is already available
if (Platform.OS === 'web' && hasUnreadAnnouncements) {
  showToast(`${unreadCount} new announcement${unreadCount > 1 ? 's' : ''}`, 'info')
}
```

---

## Viral Mechanics

The fastest organic growth path: **member-invites-member** (low friction, high trust signal).

Priority ranking by implementation effort vs. impact:

| Mechanic | Effort | Impact | Status |
|----------|--------|--------|--------|
| Family invite link | Low — infra exists | High — direct acquisition | Needs stronger CTA |
| Event share link | Low — ICS exists, add link | Medium — prospective members | Needs share CTA |
| Prayer share card | Medium | Medium — social reciprocity | Not built |
| Signup form share | Low — URL exists | High — drives specific action | Needs share CTA |

**Signup form share** is the highest-leverage quick win: a church event signup form shared externally drives downloads with clear intent.

```typescript
// app/signup-form.tsx — add share CTA for form link
async function handleShareForm(formId: string) {
  const link = `https://ebcconnect.app/signup-form?id=${formId}`
  await Clipboard.setStringAsync(link)
  showToast('Link copied — share it to invite signups', 'success')
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Share buried in overflow menu | Low discovery = low usage | Promote share to primary CTA on content screens |
| Join link requires manual copy-paste | Friction kills referral | Native share sheet via `expo-sharing` |
| No confirmation after invite | Leaves user uncertain | "Link shared!" or "Link copied!" Toast |
| Growth features role-gated | Limits viral coefficient | All members can share/invite |
| ICS-only sharing | Calendar format, not discovery | Add human-readable deep link alongside ICS |
