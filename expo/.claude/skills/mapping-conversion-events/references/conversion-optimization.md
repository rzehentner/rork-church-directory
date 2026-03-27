# Conversion Optimization Reference

## Contents
- Activation Funnel Architecture
- Call Site Instrumentation
- Anti-Patterns
- Reducing Funnel Drop-off
- Validation Checklist

---

## Activation Funnel Architecture

The EBC Connect funnel has four gated stages. Each has a single authoritative call site where conversion fires:

| Stage | Gate | File | Success Signal |
|-------|------|------|----------------|
| 1 — Account Created | `supabase.auth.signUp()` returns no error | `app/(auth)/login.tsx` | `auth_signup` |
| 2 — Profile Complete | `persons` row has `first_name` + `last_name` | `app/visitor-profile.tsx` | `visitor_profile_completed` |
| 3 — Family Joined | `persons.family_id` is non-null | `app/(tabs)/family.tsx` | `family_joined` or `family_created` |
| 4 — First Interaction | Any RSVP, prayer, or form submission | varies | `event_rsvp`, `prayer_request_created`, `signup_submitted` |

The routing gate in `app/index.tsx` is the authoritative funnel checkpoint:

```typescript
// app/index.tsx — routing decision
if (!user) {
  router.replace('/(auth)/login');       // Not in funnel
} else if (
  (profile?.role === 'pending' || profile?.role === 'visitor') &&
  (!person || !person.first_name || !person.last_name)
) {
  router.replace('/visitor-profile');    // Stage 2 gate
} else {
  router.replace('/(tabs)/dashboard');   // Stages 3+ — dashboard prompts family
}
```

Track the routing outcome itself to measure top-of-funnel volume:

```typescript
// app/index.tsx
posthog.capture('funnel_entry', {
  destination: user ? (needsProfile ? 'visitor_profile' : 'dashboard') : 'login',
  user_role: profile?.role ?? null,
});
```

---

## Call Site Instrumentation

### Stage 2: Profile Completion

```typescript
// app/visitor-profile.tsx — handleSaveProfile success path
posthog.capture('visitor_profile_completed', {
  person_id: person?.id,
  has_avatar: !!avatarUrl,
  has_phone: !!profileForm.phone,
  has_dob: !!profileForm.date_of_birth,
});
```

Track abandonment (partial form, no submit) via screen unmount — but only if fields were touched:

```typescript
const isDirty = useRef(false);
// Set isDirty.current = true on any field change

useEffect(() => {
  return () => {
    if (isDirty.current && !isSaving) {
      posthog.capture('visitor_profile_abandoned');
    }
  };
}, []);
```

### Stage 3: Family Join/Create

Both paths resolve in `hooks/user-context.tsx` via `joinFamily()` and `createFamily()`. Fire events in the screen callbacks:

```typescript
// app/(tabs)/family.tsx
const handleJoinFamily = async () => {
  const { familyId, error } = await joinFamily(joinToken);
  if (!error && familyId) {
    posthog.capture('family_joined', { family_id: familyId });
    await refetch();
    router.replace('/(tabs)/dashboard');
  }
};

const handleCreateFamily = async () => {
  const { familyId, error } = await createFamily(familyForm);
  if (!error && familyId) {
    posthog.capture('family_created', { family_id: familyId });
    await refetch();
  }
};
```

### Stage 4: First Interaction Events

```typescript
// services/events.ts — wrap rsvpEvent at call site in app/(tabs)/events.tsx
posthog.capture('event_rsvp', {
  event_id: eventId,
  status,                          // 'going' | 'maybe' | 'declined'
  is_first_rsvp: !hasRsvpdBefore,  // compute from prior state
});

// app/create-prayer.tsx — inside createMutation.onSuccess
posthog.capture('prayer_request_created', {
  is_anonymous: isAnonymous,
  has_details: !!details.trim(),
});

// app/signup-form.tsx — inside submitMutation.onSuccess
posthog.capture('signup_submitted', {
  form_id: actualFormId,
  status: data.status,   // 'confirmed' | 'waitlisted'
});
```

---

## WARNING: Tracking in Services Instead of Screens

**The Problem:**

```typescript
// BAD — tracking inside services/events.ts
export async function rsvpEvent(eventId: string, status: RSVP) {
  const result = await supabase.rpc('rsvp_event', { ... });
  posthog.capture('event_rsvp', { event_id: eventId }); // ← DON'T DO THIS
  return result;
}
```

**Why This Breaks:**
1. Services have no access to UI context (user role, screen name, is_first_time flag)
2. Services are called from tests and admin scripts — tracking fires in non-user contexts
3. You can't A/B test or suppress tracking from services without modifying business logic

**The Fix:**

Always fire tracking events in screen-level callbacks (`handleRSVP`, `handleSubmit`) after the service call resolves, where you have full UI context available.

---

## Reducing Funnel Drop-off

### Stage 2 → 3 Gap (Profile Complete but No Family)

Users who complete profile but never join a family show as "stuck" in the funnel. The dashboard already shows a `My Family` quick action with member count. Reinforce with an empty-state nudge:

```typescript
// app/(tabs)/dashboard.tsx — inside loadDashboardData
if (person && !person.family_id) {
  posthog.capture('funnel_stuck_no_family', { days_since_signup: daysSince });
}
```

Use this signal to trigger a targeted push notification via Supabase RPC after N days.

### Biometric Enrollment Drop-off

The biometric prompt fires in `app/(auth)/login.tsx` after first successful password sign-in. Track acceptance/rejection:

```typescript
Alert.alert(
  'Enable Biometric Login', '...', [
    { text: 'Not Now', onPress: () => posthog.capture('biometric_enrollment_declined') },
    { text: 'Enable',  onPress: () => {
      enableBiometric(email, password);
      posthog.capture('biometric_enrolled');
    }},
  ]
);
```

---

## Validation Checklist

Copy this checklist when instrumenting a new conversion event:

- [ ] Event fires in screen callback, not in service layer
- [ ] Event fires only on success (inside `onSuccess` or after error check)
- [ ] Payload includes enough context to segment (IDs, boolean flags, status values)
- [ ] `Platform.OS` guard added if push/biometric tracking (native only)
- [ ] Event name follows `noun_verb` convention (`event_rsvp`, `family_joined`)
- [ ] No PII in event payload (no email, no full name, no phone number)
- [ ] Tested with PostHog debug mode enabled before deploying
