# Activation & Onboarding Reference

## Contents
- User State Machine
- Entry Point Routing
- Profile Completion Screen
- Family Join Flow
- Pending Approval Handling
- Anti-Patterns

## User State Machine

EBC Connect activation follows a linear state machine. Each state is determined by two Supabase records: `profiles` (role) and `persons` (identity data).

```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐    ┌───────────┐
│ No Auth  │───>│ Auth + No Person│───>│ Person, No   │───>│ Full      │
│          │    │ (visitor-profile)│    │ Family (CTA) │    │ Access    │
└──────────┘    └─────────────────┘    └──────────────┘    └───────────┘
                     role=pending          family_id=null     role=member
```

**Key:** The `profile.role` field drives gating. New signups get `pending`. Admins approve to `member`, `leader`, or `admin`.

## Entry Point Routing

All onboarding routing lives in `app/index.tsx`. This is the single gate — NEVER scatter routing logic across multiple files.

```typescript
// app/index.tsx — complete routing logic
if (user) {
  if ((profile?.role === 'pending' || profile?.role === 'visitor') &&
      (!person || !person.first_name || !person.last_name)) {
    router.replace('/visitor-profile' as any);
  } else {
    router.replace('/(tabs)/dashboard' as any);
  }
} else {
  router.replace('/(auth)/login' as any);
}
```

**Safety timeout:** A 15-second fallback shows manual retry buttons if auth/user loading stalls. This prevents infinite splash screens on slow connections.

## Profile Completion Screen

`app/visitor-profile.tsx` collects identity data for new users.

```typescript
// Required fields: first_name, last_name
// Optional: email (pre-filled from auth), phone, date_of_birth, avatar

const handleSaveProfile = async () => {
  if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
    Alert.alert('Error', 'Please enter your first and last name');
    return;
  }

  if (person) {
    await supabase.from('persons').update({...}).eq('id', person.id);
  } else {
    await supabase.from('persons').insert({
      first_name: profileForm.first_name.trim(),
      last_name: profileForm.last_name.trim(),
      email: profileForm.email.trim(),
      user_id: profile?.id,
      family_id: null,
    });
  }

  Alert.alert('Success', 'Your profile has been saved!', [
    { text: 'Continue', onPress: () => router.replace('/(tabs)/family') }
  ]);
};
```

**Skip flow:** Users can defer profile completion. The skip button confirms via `Alert.alert` and redirects to `/(tabs)/family`. The dashboard later shows a "Complete Your Profile" CTA.

## Family Join Flow

Two paths in `app/join-family.tsx`:

1. **Replace placeholder**: Select a family member with `user_id = null` and replace with your person record
2. **Join with token**: Requires a token shared by an existing family member via `supabase.rpc('join_family_with_token')`

```typescript
// Replace placeholder — checks canReplacePerson(member)
const canReplacePerson = (member: Person) => !member.user_id;

// Join with token — RPC call
const { data, error } = await supabase.rpc('join_family_with_token', {
  p_token: token,
});
```

## Pending Approval Handling

Pending users see a banner on dashboard and settings but can still use most features.

```typescript
// app/(tabs)/dashboard.tsx — pending banner
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={18} color="#D97706" />
    <Text>Your account is pending approval from church leadership</Text>
  </View>
)}

// Profile completion CTA for pending users with incomplete profile
{isPending && (!person || !person.first_name || !person.last_name) && (
  <TouchableOpacity onPress={() => router.push('/visitor-profile')}>
    <User size={20} />
    <Text>Complete Your Profile</Text>
  </TouchableOpacity>
)}
```

**Design decision:** Pending users can onboard fully (profile + family) before admin approval. This reduces friction — admins approve real profiles, not empty accounts.

## Anti-Patterns

### WARNING: Scattering Onboarding Checks Across Screens

**The Problem:**

```typescript
// BAD — checking onboarding state in every screen
export default function EventsScreen() {
  const { person } = useUser();
  if (!person?.first_name) {
    return <Redirect href="/visitor-profile" />;
  }
  // ...
}
```

**Why This Breaks:**
1. Duplicate logic across screens means inconsistent behavior when checks change
2. Users get redirected mid-navigation, creating jarring UX
3. Adding a new step requires touching every screen file

**The Fix:**

Centralize all routing in `app/index.tsx`. Use dashboard CTAs for optional steps.

### WARNING: Blocking Onboarding on Optional Data

**The Problem:**

```typescript
// BAD — requiring phone number before allowing dashboard access
if (!person.phone) {
  router.replace('/visitor-profile');
}
```

**Why This Breaks:**
1. Users abandon onboarding when asked for too much data upfront
2. Phone numbers are sensitive — not everyone wants to share immediately
3. Only `first_name` and `last_name` are truly needed for the app to function

**The Fix:**

Only gate on fields that are functionally required. Use dashboard CTAs to encourage completing optional fields progressively.

### WARNING: No Skip Option on Onboarding Screens

**The Problem:**

Forcing users through every step with no escape hatch.

**Why This Breaks:**
1. Users who just want to browse feel trapped
2. Church visitors exploring the app may not want to commit personal info
3. Increases abandonment rate at sign-up

**The Fix:**

Always provide a skip button with a confirmation dialog explaining what they'll miss:

```typescript
const handleSkip = () => {
  Alert.alert(
    'Skip Profile Setup',
    'You can complete your profile later in the Family tab.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => router.replace('/(tabs)/family') }
    ]
  );
};
```
