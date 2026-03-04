# Activation & Onboarding Scoping

## Contents
- Current Onboarding Flow
- Scoping Onboarding Features
- MVP Slice Patterns
- Acceptance Criteria Examples
- Anti-Patterns

## Current Onboarding Flow

EBC Connect has a role-gated onboarding funnel defined in `app/index.tsx`:

```typescript
// Entry redirect logic (app/index.tsx)
// 1. Not authenticated → /login
// 2. Pending/visitor with incomplete profile → /visitor-profile
// 3. Authenticated member+ → /(tabs)/dashboard
```

The flow touches these files:

| Step | Screen | Service/Hook | Role After |
|------|--------|-------------|------------|
| Login | `app/(auth)/login.tsx` | `hooks/auth-context.tsx` | pending |
| Profile | `app/visitor-profile.tsx` | `hooks/user-context.tsx` | visitor/pending |
| Approval | Admin approves in `app/(tabs)/admin.tsx` | `lib/admin-users.ts` | member |
| Dashboard | `app/(tabs)/dashboard.tsx` | `hooks/me-context.tsx` | — |

## Scoping Onboarding Features

### DO: Scope Each Onboarding Step as a Separate Slice

```markdown
Feature: Improved Onboarding
├── Slice 1 (MVP): Login screen polish + error states
├── Slice 2: Visitor profile form + validation
├── Slice 3: Family join/create flow (app/join-family.tsx)
├── Slice 4: First-run dashboard guidance (empty states)
└── Slice 5: Admin approval workflow improvements
```

Each slice is independently deployable. A user can complete Slice 1 without Slice 2 existing.

### DON'T: Scope the Entire Funnel as One Feature

```markdown
# BAD - This is an epic, not a feature
Feature: "Complete Onboarding Redesign"
- Redesign login
- Add onboarding wizard
- Profile completion checklist
- Family setup
- Tutorial system
```

**Why this breaks:** No intermediate value. Takes weeks, blocks other work, and if any step stalls the whole feature is stuck.

## MVP Slice Patterns

### Pattern: Profile Completion Prompt

The dashboard already shows a profile completion prompt for pending/visitor users:

```typescript
// app/(tabs)/dashboard.tsx - existing pattern
{isPending && (
  <View style={styles.pendingBanner}>
    <AlertCircle size={20} color={Colors.status.warning} />
    <Text>Your account is pending approval</Text>
  </View>
)}
```

**MVP acceptance criteria for a profile completion feature:**

```markdown
- [ ] Pending users see completion percentage on dashboard
- [ ] Tapping prompt navigates to visitor-profile screen
- [ ] Profile is "complete" when: first name, last name, email, phone are filled
- [ ] Completion state derived in me-context.tsx (no new context needed)
- [ ] Toast shown on successful profile update
```

### Pattern: Empty State as Onboarding

Every list screen needs an empty state that guides new users:

```typescript
// Existing pattern from prayers.tsx
{prayers.length === 0 && (
  <View style={styles.emptyState}>
    <Heart size={48} color={Colors.text.tertiary} />
    <Text style={styles.emptyTitle}>No prayer requests yet</Text>
    <Text style={styles.emptySubtitle}>Be the first to share a prayer request</Text>
    <TouchableOpacity onPress={() => router.push('/create-prayer')}>
      <Text>Create Prayer Request</Text>
    </TouchableOpacity>
  </View>
)}
```

**Acceptance criteria for empty states:**

```markdown
- [ ] Empty state shows relevant icon (from lucide-react-native)
- [ ] Copy explains what the feature does
- [ ] CTA button navigates to create screen (if user has permission)
- [ ] Pending users see "awaiting approval" instead of CTA
```

## Acceptance Criteria Writing Guide

### Structure

Every acceptance criterion follows: **Given [context], When [action], Then [result]**

```markdown
# Good - testable, specific
- [ ] Given a member on the dashboard, when they tap "Events", then they see the events list
- [ ] Given a pending user on the dashboard, when they tap "Prayers", then they see a permission message
- [ ] Given a visitor completing their profile, when all required fields are filled, then the "Submit" button enables

# Bad - vague, untestable
- [ ] User can see events (which user? where? what does "see" mean?)
- [ ] Onboarding works well (what is "well"?)
- [ ] Profile is intuitive (subjective, not testable)
```

### Role-Specific Criteria

Always specify which role the criterion applies to:

```markdown
## Feature: Event Creation
### Member criteria:
- [ ] "Create Event" button is NOT visible

### Leader/Admin criteria:
- [ ] "Create Event" button appears in events screen header
- [ ] Tapping opens create-event.tsx with empty form
- [ ] Tags can be assigned via EventTagPicker component
- [ ] Toast confirms successful creation
```

## Anti-Patterns

### WARNING: Scoping Activation Without Defining "Activated"

**The Problem:** Building onboarding features without defining what "activated" means.

**Why This Breaks:** You ship a profile wizard but have no way to know if it actually helps users reach value. In EBC Connect, "activated" likely means: user has viewed the dashboard, RSVPed to an event, or submitted a prayer request.

**The Fix:** Define activation before scoping:

```markdown
## Activation Definition
A user is "activated" when they have completed ALL of:
1. Profile approved (role != pending)
2. At least one of: RSVP, prayer submission, or announcement read
```

Then scope features that drive users toward those actions.

### WARNING: Mixing Platform Concerns in One Slice

**The Problem:** Scoping "add biometric login" as one slice.

**Why This Breaks:** Biometrics are native-only (`expo-local-authentication`). The web fallback is completely different code. Scoping them together doubles the work estimate.

**The Fix:** Two slices:

```markdown
- Slice A: Native biometric login (expo-local-authentication, expo-secure-store)
- Slice B: Web login persistence (AsyncStorage fallback, "remember me" checkbox)
```

See the **react-native** skill for platform-specific implementation patterns.
See the **expo-router** skill for auth redirect navigation patterns.
