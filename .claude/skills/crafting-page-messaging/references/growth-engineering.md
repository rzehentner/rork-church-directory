# Growth Engineering Reference

## Contents
- Growth Loops in EBC Connect
- Family Join Token Loop
- Event Sharing Loop
- WARNING: No Viral Mechanics
- WARNING: No Onboarding Completion Tracking
- Activation Messaging Sequence
- Role Progression Messaging
- Growth Engineering Checklist

## Growth Loops in EBC Connect

The app has two growth loops, both powered by copy that frames sharing as community connection:

```
Loop 1: Family Invite
Member → copies join token → shares externally → new user signs up → joins family → loop repeats

Loop 2: Event Sharing
Member → copies event details → shares externally → recipient hears about church → may visit
```

Loop 1 is closed (leads to app signup). Loop 2 is open (no link back to app — see WARNING below).

## Family Join Token Loop

The join token is the app's only closed-loop growth mechanism. The copy at each stage matters:

```typescript
// Stage 1: Member sees token card — app/(tabs)/family.tsx
<Text style={styles.tokenLabel}>Join Token</Text>
<Text style={styles.tokenValue}>{joinToken}</Text>
<TouchableOpacity onPress={copyJoinToken}>
  <Text>Copy</Text>
</TouchableOpacity>

// Stage 2: Member shares (currently just clipboard)
showToast('Copied! Family join token copied to clipboard', 'success');

// Stage 3: New user enters token — app/join-family.tsx
<TextInput placeholder="Enter family join token" />

// Stage 4: Confirmation
showToast('Joined family successfully!', 'success');
```

**Copy improvement:** Stage 2 should include context so the member knows what to say:

```typescript
// BETTER — wraps token in a shareable message
const message = `Join our family on EBC Connect! Use this code when you sign up: ${joinToken}`;
await Clipboard.setStringAsync(message);
showToast('Invite message copied!', 'success');
```

## Event Sharing Loop

```typescript
// app/event-detail.tsx — current implementation
const shareText = `Check out this event: ${event.title}\n${formattedDate}${
  event.location ? `\nLocation: ${event.location}` : ''
}`;
```

This loop is **open** — the recipient gets text but no link to the app. To close it:

```typescript
// Add app download context
const shareText = `Check out this event at Edna Baptist Church: ${event.title}\n` +
  `${formattedDate}\n` +
  `${event.location ? `Location: ${event.location}\n` : ''}` +
  `Download EBC Connect to RSVP and stay connected with our church family.`;
```

### WARNING: No Viral Mechanics

**Detected:** No referral incentives, invite tracking, or social sharing features beyond clipboard copy.

**Impact:** Growth depends entirely on word-of-mouth and manual token sharing. There's no way to measure or accelerate organic growth.

**Recommended additions (ordered by effort):**

1. **Low effort:** Add app download link to all shared text (event shares, join token messages)
2. **Medium effort:** Add native share sheet (`Share.share()`) to replace clipboard-only sharing
3. **Higher effort:** Track join token usage in Supabase to measure invite-to-signup conversion

### WARNING: No Onboarding Completion Tracking

**Detected:** No tracking of how far new users get through the activation sequence (signup → profile → family → first action).

**Impact:** Can't identify where users drop off. Copy changes to early steps might hurt later steps without detection.

**Recommended:** See the **improving-activation-flow** skill for activation milestone tracking.

## Activation Messaging Sequence

The app guides new users through a multi-step activation with messaging at each stage:

```
Step 1: Splash screen
  Copy: "Loading your church family..." | "Welcome back!"
  File: app/index.tsx:79

Step 2: Login / Signup
  Copy: "Create Account" | "Send Magic Link"
  File: app/(auth)/login.tsx:191-195

Step 3: Visitor profile
  Copy: "Complete Your Profile — Help your church family get to know you better"
  File: app/visitor-profile.tsx:219-221

Step 4: Pending approval
  Copy: "Your account is pending approval from church leadership"
  File: app/(tabs)/dashboard.tsx:386

Step 5: Family connection
  Copy: "Join Your Family — Connect with your family in the church community"
  File: app/(tabs)/dashboard.tsx:598-599

Step 6: First action (RSVP, prayer, etc.)
  Copy: varies by action type
```

**Rule:** Each step's copy must motivate the NEXT step. The profile copy mentions "church family" to prime the family join step.

## Role Progression Messaging

The app has four roles with distinct messaging:

| Role | Status Copy | Dashboard Treatment |
|------|-------------|-------------------|
| `visitor` | Routed to visitor-profile | No dashboard access |
| `pending` | "Your account is pending approval" + orange badge | Limited dashboard, profile/family CTAs |
| `member` | No status badge | Full dashboard, all features |
| `admin`/`leader` | No status badge | Full dashboard + admin panel CTA |

**Copy principle:** Pending users should feel welcomed, not blocked. The copy says "pending approval from church leadership" (implies humans are reviewing), not "your account is under review" (implies a machine).

## Growth Engineering Checklist

Copy this checklist when building or auditing a growth surface:

- [ ] Shared content includes a hook line (why the recipient should care)
- [ ] Shared content includes app context or download reference
- [ ] Join token copy includes a contextual message, not just the raw token
- [ ] Success messages after sharing confirm what was shared
- [ ] Each activation step's copy primes the next step
- [ ] Pending status messaging feels welcoming, not restrictive
- [ ] Empty states in social features (prayers, events) encourage creation

See the **improving-activation-flow** skill for activation funnel optimization.
See the **designing-onboarding-paths** skill for first-run experience design.
See the **instrumenting-product-metrics** skill for growth metric tracking.
