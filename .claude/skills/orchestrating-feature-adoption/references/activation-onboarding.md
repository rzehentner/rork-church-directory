# Activation & Onboarding Reference

## Contents
- Activation Funnel in EBC Connect
- Onboarding Gate Pattern
- Profile Completion Flow
- Family Formation Nudge
- Pending User Experience
- WARNING: No Activation Tracking
- Onboarding Checklist

## Activation Funnel in EBC Connect

The current activation path: **Sign Up -> Profile Completion -> Admin Approval -> Family Join -> First Engagement Action**

```
Login ──→ Pending/Visitor check ──→ visitor-profile (if incomplete)
                                 ──→ dashboard (if complete)
Dashboard ──→ "Complete Profile" card ──→ visitor-profile ──→ family tab
Dashboard ──→ "Join Family" card ──→ join-family / create-family
```

Entry point logic in `app/index.tsx` lines 29-34:

```tsx
if (user) {
  if ((profile.role === 'pending' || profile.role === 'visitor') &&
      (!person?.first_name || !person?.last_name)) {
    router.replace('/visitor-profile');
  } else {
    router.replace('/(tabs)/dashboard');
  }
}
```

## Onboarding Gate Pattern

The app gates features by role, not by onboarding step. This means users can access most features while still pending.

```tsx
// DO — Gate by role using useMe() from hooks/me-context.tsx
const { isAdmin, isAdminOrLeader, myRole } = useMe();

// DO — Show explanatory blocked state for pending users
// app/(tabs)/prayers.tsx lines 315-329
if (myRole === 'pending') {
  return (
    <View style={styles.pendingContainer}>
      <AlertCircle size={32} color={Colors.status.warning} />
      <Text style={styles.pendingTitle}>Become a member to participate</Text>
      <Text style={styles.pendingBody}>Your account is pending admin approval</Text>
    </View>
  );
}
```

```tsx
// DON'T — Silently hide features without explanation
// Users get confused when tabs/buttons disappear without context
if (myRole === 'pending') return null; // BAD: no feedback
```

**Why this matters:** Silent gating creates confusion. Users don't know if a feature exists, is broken, or is restricted. Always show a blocked state with an explanation.

## Profile Completion Flow

`app/visitor-profile.tsx` is the primary onboarding screen. It collects first/last name (required), email, phone, DOB, and photo.

```tsx
// visitor-profile.tsx lines 330-354 — action buttons with skip option
<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
  <Text style={styles.saveButtonText}>Save Profile</Text>
  <ArrowRight size={20} color="#FFFFFF" />
</TouchableOpacity>
<TouchableOpacity onPress={() => router.replace('/(tabs)/dashboard')}>
  <Text style={styles.skipText}>Skip for now</Text>
</TouchableOpacity>
```

```tsx
// DO — Allow skip for non-critical fields
// Required: first_name, last_name (gate navigation on these)
// Optional: phone, dob, photo (let users complete later)

// DON'T — Force all fields before proceeding
// Church apps need low friction — members range from tech-savvy to elderly
```

**Post-completion routing:** After save, the app alerts success and navigates to the family tab:
```tsx
Alert.alert('Profile Saved', 'Your profile has been saved! You can now create or join a family.');
router.replace('/(tabs)/family');
```

## Family Formation Nudge

The dashboard shows a family CTA only when the user has no family and is not pending:

```tsx
// app/(tabs)/dashboard.tsx line ~593-606
{!family && !isPending && (
  <TouchableOpacity style={styles.familyCard} onPress={() => router.push('/(tabs)/family')}>
    <Heart size={24} color={Colors.status.error} />
    <View>
      <Text style={styles.familyCardTitle}>Join Your Family</Text>
      <Text style={styles.familyCardSubtitle}>
        Connect with your family in the church community
      </Text>
    </View>
    <ChevronRight size={20} color={Colors.text.secondary} />
  </TouchableOpacity>
)}
```

**Why conditional rendering matters:** Showing a "Join Family" card to someone already in a family is noise. Showing it to a pending user who can't fully participate yet creates frustration.

## Pending User Experience

Pending users see three coordinated signals:

1. **Orange "Pending" badge** next to their name on dashboard (line ~356)
2. **Yellow warning banner**: "Your account is pending approval" (line ~383-388)
3. **Role badge in settings**: Orange "PENDING" label with "Waiting for admin approval" text

```tsx
// DO — Coordinate status signals across multiple surfaces
// Dashboard banner + settings badge + prayer tab gate = consistent messaging

// DON'T — Show "pending" in one place but allow full access elsewhere
// Inconsistency erodes trust in the approval process
```

## WARNING: No Activation Tracking

**The Problem:** There is no way to measure how many users complete each onboarding step.

**Impact:**
- Cannot measure profile completion rate
- Cannot identify where users drop off in the activation funnel
- Cannot measure time-to-first-engagement (first RSVP, first prayer, first form)
- Cannot identify which nudges are effective

**The Fix:** Create a lightweight activation tracker using existing Supabase data:

```sql
-- Query activation funnel from existing tables (no new tables needed)
SELECT
  p.id,
  p.created_at AS signup_date,
  per.first_name IS NOT NULL AS profile_complete,
  per.family_id IS NOT NULL AS has_family,
  EXISTS(SELECT 1 FROM event_attendees ea WHERE ea.person_id = per.id) AS has_rsvp,
  EXISTS(SELECT 1 FROM prayer_prayed pp WHERE pp.user_id = p.id) AS has_prayed
FROM profiles p
LEFT JOIN persons per ON p.person_id = per.id;
```

See the **instrumenting-product-metrics** skill for building a proper analytics layer.

## Onboarding Checklist

Copy this when designing a new onboarding step:

- [ ] Define the trigger condition (role, missing data, first visit)
- [ ] Choose the surface (redirect gate, dashboard card, in-context prompt)
- [ ] Write the CTA copy (action-oriented, church-family tone)
- [ ] Add skip/dismiss option for non-critical steps
- [ ] Define post-completion routing (where does the user go next?)
- [ ] Add blocked state messaging for role-gated features
- [ ] Coordinate status signals across dashboard, settings, and affected tabs
- [ ] Verify pending-user path works end-to-end
