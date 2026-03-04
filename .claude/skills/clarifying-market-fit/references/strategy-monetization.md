# Strategy & Monetization Reference

## Contents
- Positioning Framework
- ICP Definition
- Value Narrative Structure
- Competitive Positioning
- Monetization Context
- Strategic Gaps

## Positioning Framework

EBC Connect's positioning is unique: it is a **closed-community utility app**, not a marketplace or SaaS product. The positioning must answer "why should I download this?" for exactly one audience.

### Current Positioning (from `app/developer-info.tsx`)

```tsx
// Mission statement
"EBC Connect was built to strengthen the bonds of our church family
at Edna Baptist Church. Staying connected, informed, and engaged
has never been easier."

// Tagline
"Connecting our church family"

// Footer
"Made with love for the EBC family"
```

### Positioning Statement Template

```
For [members and visitors of Edna Baptist Church]
who [want to stay connected with their church community],
EBC Connect is [a mobile app]
that [provides events, prayers, announcements, and a family directory].
Unlike [church bulletins, email chains, and Facebook groups],
EBC Connect [is purpose-built for our church family with
personalized content and real-time updates].
```

## ICP Definition

EBC Connect has a single, well-defined ICP:

| Attribute | Value |
|-----------|-------|
| Who | Members and visitors of Edna Baptist Church |
| Location | Edna, Texas area |
| Age range | All ages (family-inclusive) |
| Tech comfort | Varies widely — app must be simple |
| Primary need | Know what's happening at church |
| Secondary need | Stay connected between Sundays |
| Activation trigger | Pastor announcement, bulletin, family member invite |

### ICP Segments (by role)

```
Visitor → First-time attendee, exploring the church
  Copy tone: welcoming, low-commitment
  Key screen: visitor-profile.tsx

Pending → Signed up, waiting for approval
  Copy tone: reassuring, transparent about the wait
  Key screen: dashboard.tsx pending banner

Member → Approved, active participant
  Copy tone: warm, community-focused
  Key screens: dashboard.tsx, events, prayers

Leader → Ministry/group leader with extra permissions
  Copy tone: empowering, efficient
  Key screens: admin.tsx, create-event.tsx

Admin → Church staff managing the app
  Copy tone: clear, task-oriented
  Key screen: admin.tsx
```

## Value Narrative Structure

### Three Pillars (from mission statement)

| Pillar | Features | Screen |
|--------|----------|--------|
| **Connected** | Family directory, family groups, member profiles | `directory.tsx`, `family.tsx` |
| **Informed** | Announcements (tag-personalized), push notifications | `announcements.tsx`, `notifications.tsx` |
| **Engaged** | Events, RSVPs, prayer requests, signup forms, potlucks | `events.tsx`, `prayers.tsx`, `forms.tsx` |

### DO: Map Every Feature to a Pillar

```tsx
// When writing feature descriptions or empty states,
// anchor to one of the three pillars:

// Events empty state — "Engaged" pillar
"Events help our church family gather and grow together"

// Directory empty state — "Connected" pillar
"Find and connect with your church family"

// Announcements empty state — "Informed" pillar
"Stay informed with updates from your church community"
```

### DON'T: Use Generic App Language

```tsx
// BAD — sounds like any app
"No items found"
"Create new"
"View all"

// GOOD — anchored to community identity
"No prayer requests from our church family"
"Share a new prayer with the church"
"See all updates from your community"
```

## Competitive Positioning

EBC Connect competes with informal alternatives, not other church apps:

| Alternative | Weakness EBC Connect Solves |
|------------|---------------------------|
| Church bulletin (paper) | Not real-time, no RSVPs, lost by Monday |
| Email chains | No structure, hard to search, spam risk |
| Facebook groups | Not everyone uses Facebook, privacy concerns |
| Group texting | No organization, no persistent records, overwhelming |
| Church website | One-way communication, no personalization |

When writing any value-prop copy, frame against the *old way*:

```tsx
// Login screen subtitle options:
"Everything about Edna Baptist — without the bulletin board"
"Your church family, always in your pocket"
```

## Monetization Context

EBC Connect is a **free community tool**. There is no monetization, no premium tier, no ads.

### Implications for Copy

- NEVER use urgency or scarcity language ("limited time", "unlock premium")
- NEVER frame features as "free" — everything is included by default
- NEVER use commercial CTAs ("Subscribe", "Upgrade", "Buy")
- The app is a ministry tool, not a product

## Strategic Gaps

### Gap 1: No Onboarding Value Communication

```tsx
// Current login screen: logo + form fields
// New visitors from a church bulletin have zero context

// Recommendation: Add a tagline below the logo
<Text style={styles.tagline}>Connecting our church family</Text>
<Text style={styles.subtitle}>
  Events, prayers, and announcements for Edna Baptist Church
</Text>
```

### Gap 2: Pending State Has No Timeline

```tsx
// Current: "Your account is pending approval from church leadership"
// Missing: HOW LONG does this take? WHAT can I do while waiting?

// Recommendation:
"Your account is pending approval from church leadership.
This usually takes 1-2 days. While you wait, you can
complete your profile and join your family."
```

### Gap 3: No "What's New" After Updates

OTA updates via `npx eas update` push silently. Users never learn about new features.
See the **writing-release-notes** skill for in-app update announcements.

### Gap 4: Value Not Reinforced After Activation

Once a user is an active member, the app stops explaining itself. Consider "did you know?" prompts for underused features.
See the **designing-inapp-guidance** skill for contextual feature discovery.

## Positioning Update Workflow

1. Draft new copy aligned to the three pillars (Connected, Informed, Engaged)
2. Search for all instances of old copy: `grep -rn "old phrase" app/ components/`
3. Update all instances consistently
4. Verify terminology matches voice rules in the content-copy reference
5. If the change affects app store copy, update external store listings to match
6. Deploy via OTA: `npx eas update`

See the **crafting-page-messaging** skill for page-level messaging structure.
See the **mapping-user-journeys** skill for end-to-end journey audit.
