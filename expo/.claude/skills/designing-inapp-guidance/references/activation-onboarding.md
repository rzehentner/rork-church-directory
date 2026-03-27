# Activation & Onboarding Guidance

## Contents
- Entry Point Flow
- Visitor Profile Completion
- Pending Account Guidance
- Profile Completion Prompts
- WARNING: Missing Onboarding Checklist
- Activation Checklist

## Entry Point Flow

The app routes new users through `app/index.tsx` based on profile state. This is the first guidance surface users encounter.

```tsx
// app/index.tsx — routing logic (simplified)
if (!session) {
  router.replace('/(auth)/login');
} else if (profile?.role === 'pending' || profile?.role === 'visitor') {
  router.replace('/visitor-profile');
} else {
  router.replace('/(tabs)/dashboard');
}
```

**Fallback UI** after 15 seconds prevents users from staring at a blank screen:

```tsx
// app/index.tsx — timeout fallback
{showFallback && (
  <View>
    <Text>Taking longer than expected...</Text>
    <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
      <Text>Go to Login</Text>
    </TouchableOpacity>
  </View>
)}
```

### DO: Route by profile completeness, not just auth state

The current pattern correctly sends `pending`/`visitor` users to profile completion before the dashboard. This prevents empty dashboard confusion.

### DON'T: Dump new users on the dashboard with no data

Without the visitor-profile redirect, new users would see an empty dashboard with no events, no family, no prayers — a dead end that kills activation.

## Visitor Profile Completion

`app/visitor-profile.tsx` is the primary activation screen. It combines profile setup with contextual guidance.

```tsx
// app/visitor-profile.tsx — header with motivation copy
<View style={styles.header}>
  <View style={styles.iconContainer}>
    <User size={32} color="#7C3AED" />
  </View>
  <Text style={styles.title}>Complete Your Profile</Text>
  <Text style={styles.subtitle}>
    Help your church family get to know you better
  </Text>
</View>

// Avatar guidance
<Text style={styles.avatarHelp}>
  Add a photo so your church family can recognize you
</Text>
```

### DO: Explain WHY each field matters

The avatar help text ("so your church family can recognize you") gives a social reason to upload a photo, not just a generic "upload photo" instruction.

### DON'T: Make all fields required and block progress

The form allows skip — users can complete their profile later. Blocking progress on optional fields causes drop-off.

## Pending Account Guidance

Multiple screens show pending-state banners so users understand why features are restricted.

```tsx
// app/(tabs)/dashboard.tsx — pending banner
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={18} color="#D97706" />
    <Text style={styles.pendingBannerText}>
      Your account is pending approval from church leadership
    </Text>
  </View>
)}
```

```tsx
// app/(tabs)/prayers.tsx — feature gating with explanation
if (myRole === 'pending') {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        Become a member to participate in the prayer list
      </Text>
    </View>
  );
}
```

### DO: Gate features with explanation, not silence

The prayers screen tells pending users *what* they need ("become a member") rather than just hiding the feature.

### DON'T: Show an empty screen with no explanation

If a pending user navigates to a restricted screen and sees nothing, they'll think the app is broken. Always explain the restriction.

## Profile Completion Prompts

Dashboard and family screens show persistent prompts when the profile is incomplete.

```tsx
// app/(tabs)/dashboard.tsx — profile completion card
{isPending && (!person || !person.first_name || !person.last_name) && (
  <TouchableOpacity
    style={styles.profilePromptCard}
    onPress={() => router.push('/visitor-profile')}
  >
    <View style={styles.profilePromptIcon}>
      <User size={20} color="#1C2E4A" />
    </View>
    <View style={styles.profilePromptContent}>
      <Text style={styles.profilePromptTitle}>Complete Your Profile</Text>
      <Text style={styles.profilePromptText}>
        Help your church family get to know you
      </Text>
    </View>
    <ChevronRight size={18} color="#94A3B8" />
  </TouchableOpacity>
)}
```

The chevron icon signals tappability. The copy is action-oriented ("Complete Your Profile") not status-oriented ("Profile Incomplete").

## WARNING: Missing Onboarding Checklist

**The Problem:** There is no persistent checklist tracking activation milestones (profile completed, family joined, first RSVP, first prayer). Users complete individual steps but have no visibility into overall progress.

**Why This Matters:**
1. Users don't know what actions unlock value in the app
2. No motivation loop — completing one step doesn't surface the next
3. Admins can't measure activation rates by milestone

**The Fix:** Build a lightweight checklist component backed by AsyncStorage flags. See the **designing-onboarding-paths** skill for implementation patterns.

## Activation Checklist

Copy this checklist when building new activation guidance:

- [ ] Identify the activation trigger (what state change?)
- [ ] Add routing logic in `app/index.tsx` if needed
- [ ] Write motivation copy explaining WHY (not just WHAT)
- [ ] Show pending/restricted state with explanation banner
- [ ] Add profile completion prompt on dashboard if relevant
- [ ] Provide a skip/later option for non-critical steps
- [ ] Test the flow for pending, visitor, member, and admin roles
