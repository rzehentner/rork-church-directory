# Strategy & Monetization Reference

## Contents
- Business Model Context
- Value Delivery by Role
- The Admin Retention Problem
- Feature Gating Strategy
- Visitor-to-Member Pipeline
- Anti-Patterns

---

## Business Model Context

EBC Connect is a community app for a single church — not SaaS. There is no revenue model. The success metric is **active member engagement**, not conversion to paid tier.

However, the app mirrors SaaS product patterns and the same optimization techniques apply:

| SaaS Concept | EBC Connect Equivalent |
|-------------|------------------------|
| Free → paid conversion | Visitor (pending) → member activation |
| Churn | Members uninstalling or going inactive |
| Power users | Admins / leaders posting content |
| Feature adoption | Members using events, prayers, directory |
| Admin console | Admin panel (`app/(tabs)/admin.tsx`) |

Apply conversion optimization with this lens: "conversion" = engagement depth, not payment.

---

## Value Delivery by Role

```typescript
// hooks/me-context.tsx — role checks used throughout the app
const { isAdmin, isLeader, isAdminOrLeader } = useMe()
```

| Role | Core Value Proposition | Key Screens |
|------|----------------------|-------------|
| `visitor` (pending) | "Your account is being set up" | `app/visitor-profile.tsx` |
| `member` | Community connection and participation | Dashboard, Events, Prayers, Directory |
| `leader` | Enhanced participation + some moderation | All member screens + partial admin |
| `admin` | Church management and content creation | Admin panel, all creation screens |

**Strategic principle:** Every hour a user spends in `pending` state is a churn risk. The pending-to-member conversion is the most important funnel step to optimize.

---

## The Admin Retention Problem

Admin retention is existential. If admins stop posting content, members have nothing to engage with, and the entire community goes dark.

**Admin value loop:**
```
Admin posts event → Members RSVP → Admin sees RSVPs → Admin feels impact → Admin posts again
```

The feedback loop is broken if admins don't see engagement data. Closing it:

```tsx
// app/(tabs)/dashboard.tsx — surface engagement data to admins
{isAdmin && (
  <View style={styles.adminStats}>
    <Text style={styles.adminStatLabel}>This week</Text>
    <View style={styles.adminStatRow}>
      <Text style={styles.adminStatValue}>{weeklyRSVPs}</Text>
      <Text style={styles.adminStatDescription}>RSVPs on your events</Text>
    </View>
    <View style={styles.adminStatRow}>
      <Text style={styles.adminStatValue}>{weeklyPrayers}</Text>
      <Text style={styles.adminStatDescription}>Prayer requests submitted</Text>
    </View>
  </View>
)}
```

**Pending member alert on dashboard** — admins need to know when visitors are waiting:

```tsx
// app/(tabs)/dashboard.tsx — admin alert strip
{isAdmin && pendingCount > 0 && (
  <TouchableOpacity
    style={styles.pendingAlert}
    onPress={() => router.push('/(tabs)/admin')}
  >
    <Text style={styles.pendingAlertText}>
      {pendingCount} member{pendingCount > 1 ? 's' : ''} awaiting approval →
    </Text>
  </TouchableOpacity>
)}
```

---

## Feature Gating Strategy

The admin tab is correctly role-gated in `app/(tabs)/_layout.tsx`:

```tsx
// app/(tabs)/_layout.tsx — admin tab visibility
{isAdminOrLeader && (
  <Tabs.Screen
    name="admin"
    options={{ tabBarLabel: 'Admin', ... }}
  />
)}
```

**DO:** Gate content creation (post event, post announcement, manage members) behind admin/leader.

**DON'T:** Gate content consumption (view events, view directory, read announcements) behind role. Pending visitors who can't see any content have zero reason to wait for approval.

**Current gap:** Pending members land on the dashboard but may see empty states if most content is audience-targeted to members only. Consider allowing read-only access to public events for `visitor` status users.

```typescript
// services/events.ts — consider a public events query for pending users
export async function fetchPublicEvents() {
  // Query events with audience = 'all' regardless of user status
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('audience', 'all')
    .order('start_time', { ascending: true })
  return data
}
```

---

## Visitor-to-Member Pipeline

The full pipeline with current gaps annotated:

```
1. Visitor downloads app / opens web
   → [GAP: No App Store copy optimization — see distribution.md]

2. Visitor creates account (app/(auth)/login.tsx)
   → [GAP: No social proof on sign-up screen]

3. Visitor completes profile (app/visitor-profile.tsx)
   → [GAP: Skip button — 'Skip for now' has no cost]
   → [GAP: No progress indicator]

4. Visitor waits for approval
   → [GAP: Silent dead-end — no pending screen, no timeline]
   → [GAP: No push notification when approved]

5. Admin approves via admin panel
   → [GAP: No alert to admin that pending members exist]

6. Member opens dashboard
   → [GAP: No welcome/activation moment on first login as member]
```

The two highest-impact gaps to close first:
1. **Pending-approval notification** (step 4 → step 6): implement Supabase trigger
2. **Admin pending-member alert** (step 5): dashboard strip surfacing pending count

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| No approval notification | Members abandon during pending wait | Supabase trigger → push on status change |
| Admins don't see engagement data | Feedback loop broken → admins churn | Surface RSVP/prayer counts on dashboard |
| Gating public events from pending visitors | No value → no reason to wait for approval | Read-only events for `visitor` status |
| No welcome moment on first member login | Missed activation hook | First-login banner: "You're in! Welcome to Edna Baptist" |
| Single admin bottleneck for approvals | One unavailable admin = frozen pipeline | Allow leaders to approve members |

See the **orchestrating-feature-adoption** skill for role-specific feature surfacing patterns.
