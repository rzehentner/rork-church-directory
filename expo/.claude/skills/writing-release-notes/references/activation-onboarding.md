# Activation & Onboarding Reference

## Contents
- Onboarding Flow in EBC Connect
- First-Run Routing Logic
- Profile Completion Surface
- Pending Status Communication
- Biometric Enrollment
- DO/DON'T Patterns
- Release Note Implications

## Onboarding Flow in EBC Connect

New users follow this path: **Sign Up → Pending Role → Visitor Profile → Dashboard (limited) → Admin Approval → Full Access**.

The entry point (`app/index.tsx`) routes based on role and profile completeness:

```typescript
// app/index.tsx — role-based redirect after auth
if ((profile?.role === 'pending' || profile?.role === 'visitor')
    && (!person || !person.first_name || !person.last_name)) {
  router.replace('/visitor-profile');
} else {
  router.replace('/(tabs)/dashboard');
}
```

This means release notes for onboarding changes must specify which role is affected — `pending` users see a fundamentally different app than `member` users.

## Profile Completion Surface

The `visitor-profile.tsx` screen collects first name, last name, phone, date of birth, and profile photo. It includes a "Skip for now" option:

```typescript
// app/visitor-profile.tsx — skip with context
Alert.alert(
  'Skip Profile Setup',
  'You can complete your profile later in the Family tab. Continue to the app?',
  [
    { text: 'Go Back', style: 'cancel' },
    { text: 'Skip', onPress: () => router.replace('/(tabs)/dashboard') },
  ]
);
```

When writing release notes about profile changes, always mention that skipping is still available — users resist mandatory steps.

## Pending Status Communication

Two surfaces communicate pending status:

```typescript
// app/(tabs)/dashboard.tsx — amber banner at top
<View style={styles.pendingBanner}>
  <AlertCircle size={18} color="#D97706" />
  <Text>Your account is pending approval from church leadership</Text>
</View>

// app/visitor-profile.tsx — inline notice
<View style={styles.pendingNotice}>
  <AlertCircle size={20} color="#F59E0B" />
  <Text>Your account is pending approval. You can complete your profile
    and join a family while waiting for approval.</Text>
</View>
```

Release notes should never mention "pending approval" publicly — frame it as "quick setup" or "getting started."

## Biometric Enrollment

Biometric auth is offered once after first successful password login on supported hardware:

```typescript
// app/(auth)/login.tsx — post-login biometric prompt
if (!isSignUp && isBiometricAvailable && !isBiometricEnabled) {
  Alert.alert(
    'Enable Biometric Login',
    'Would you like to enable biometric authentication for faster sign-in?',
    [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Enable', onPress: () => enableBiometric(email, password) },
    ]
  );
}
```

When documenting biometric features in release notes, note it is **native only** (skipped on web). See the **react-native** skill for platform-specific considerations.

## DO/DON'T Patterns

### DO: Frame onboarding changes around user benefit

```markdown
// GOOD release note
- Faster sign-up: complete your profile in under a minute
- Face ID / Touch ID support for quicker sign-in
```

### DON'T: Expose internal role mechanics

```markdown
// BAD release note — leaks internal system details
- Users with 'pending' role now redirect to visitor-profile.tsx
- Added role check before dashboard navigation
```

### DO: Mention skip options for new required steps

```markdown
// GOOD — respects user autonomy
- New profile photo option during setup (you can skip and add later)
```

### DON'T: Write release notes only for new users

Onboarding improvements often affect existing users who haven't completed all steps. Check the dashboard's inline CTAs:

```typescript
// app/(tabs)/dashboard.tsx — persistent CTA for incomplete profiles
{isPending && (!person || !person.first_name || !person.last_name) && (
  <TouchableOpacity onPress={() => router.push('/visitor-profile')}>
    <Text>Complete Your Profile</Text>
    <Text>Help your church family get to know you</Text>
  </TouchableOpacity>
)}
```

## Release Note Implications

When shipping onboarding changes, release notes should:

1. **Lead with the benefit** — "Get started faster" not "Refactored auth redirect"
2. **Distinguish platform** — Biometric, push notification, and secure store features are native-only
3. **Avoid role jargon** — "new members" not "pending users"
4. **Mention the skip path** — If adding a new required step, say it can be done later
5. **Test both paths** — Verify the release note claims work for both fresh sign-ups and existing incomplete profiles

### Validation Loop

1. Read `app/index.tsx` redirect logic to confirm routing hasn't changed
2. Check `visitor-profile.tsx` for any new required fields
3. Verify dashboard CTAs still match the profile completeness check
4. If any diverge from the release notes draft, update the draft and repeat
