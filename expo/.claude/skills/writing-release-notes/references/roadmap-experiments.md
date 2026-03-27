# Roadmap & Experiments Reference

## Contents
- Release Channels in EBC Connect
- EAS Build Profiles
- OTA Update Strategy
- Version and Runtime Policy
- Role-Based Feature Gating
- Tag-Based Audience Targeting
- Staged Rollout via Announcements
- DO/DON'T Patterns
- Release Planning Checklist

## Release Channels in EBC Connect

EBC Connect uses EAS Build with three profiles and OTA updates for JS-only changes:

| Channel | Build Profile | Distribution | Use Case |
|---|---|---|---|
| Development | `development` | Internal (dev client) | Local testing with dev tools |
| Preview | `preview` | Internal (TestFlight/APK) | Beta testing with church leaders |
| Production | `production` | App Store / Google Play | Public release |
| OTA | N/A (via `npx eas update`) | Existing production builds | JS-only hotfixes and features |

```json
// eas.json — build profiles
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  { "autoIncrement": true }
  }
}
```

Production builds auto-increment the build number. Version is managed locally in `app.json` (`appVersionSource: "local"`). See the **eas** skill for detailed build and submit commands.

## OTA Update Strategy

OTA updates via `expo-updates` are **silent** — no in-app prompt or banner. Users receive the update on their next cold launch. The runtime version policy is `appVersion`, meaning OTA updates only reach builds matching the same `version` in `app.json`.

```json
// app.json
"runtimeVersion": { "policy": "appVersion" },
"updates": { "url": "https://u.expo.dev/9a4cd3a2-058f-4e51-8680-365b3e37e030" }
```

**Implications for release notes:**
- OTA updates need an in-app announcement since users won't see an App Store update prompt
- Native builds trigger an App Store/Google Play update flow, so users expect release notes there
- Bumping `app.json` version creates a new runtime boundary — old builds stop receiving OTAs

## Version and Runtime Policy

Version lives in three places that must stay in sync:

```
app.json         → "version": "1.0.0"     (canonical, drives runtime version)
developer-info.tsx → "Version 1.0.0"       (hero display)
settings.tsx       → "Version 1.0.0"       (about section)
```

WARNING: These are not derived from a single source. Each is a hardcoded string. Missing one creates version drift visible to users.

## Role-Based Feature Gating

The app uses Supabase `user_role` enum to gate features. This is the closest thing to feature flags:

```typescript
// hooks/me-context.tsx
const isAdmin = profile?.role === 'admin';
const isLeader = profile?.role === 'leader';
const isAdminOrLeader = isAdmin || isLeader;
```

| Role | Access Level |
|---|---|
| `admin` | Full access, admin panel, user approval, all CRUD |
| `leader` | Create events/announcements/forms, limited admin |
| `member` | View all content, RSVP, pray, submit forms |
| `pending` | Dashboard (limited), profile setup, no prayers/directory |
| `visitor` | Minimal access, profile setup |

When writing release notes for role-gated features, specify who can use them: "Admins and leaders can now..." or "Available to all members."

## Tag-Based Audience Targeting

Announcements and events can be targeted to specific tags (groups). The announcement creation form allows selecting:

```typescript
// create-announcement.tsx
// Visibility: Public (all users) vs. Targeted (role + tag based)
// Roles: member, leader, admin (multi-select chips)
// Tags: from available tags (multi-select)
```

This enables **staged release communication**: announce to leaders first, then to all members.

## Staged Rollout via Announcements

Since there are no feature flags, use the announcements system for staged communication:

**Phase 1 — Preview with leaders:**
```typescript
await createAnnouncement({
  title: 'Coming Soon: Calendar View',
  body: 'We\'re adding a calendar view to Events. Leaders, please try it out and share feedback.',
  is_published: true,
  is_public: false,
  roles_allowed: ['leader', 'admin'],
});
```

**Phase 2 — Full rollout announcement:**
```typescript
await createAnnouncement({
  title: 'New: Calendar View for Events',
  body: 'Browse events by date with the new calendar view at the top of the Events screen.',
  is_published: true,
  is_public: true,
  roles_allowed: null,
});
```

## DO/DON'T Patterns

### DO: Use preview builds for pre-release testing

```bash
# Build and distribute to internal testers (leaders/admins)
eas build --profile preview --platform all
```

Write draft release notes during preview testing — feedback from testers may change the final copy.

### DON'T: Ship OTA updates without an in-app announcement for visible changes

```markdown
// BAD — users get new features silently, no context
npx eas update  # ships JS changes, no notification

// GOOD — announce visible changes
npx eas update  # ship the code
# Then create an announcement explaining what changed
```

### DO: Separate infrastructure changes from feature changes in release notes

```markdown
// GOOD — users see features, not plumbing
**New Features**
- Calendar view for browsing events by date

**Improvements**
- Faster app loading
- Better offline handling
```

### DON'T: Use `autoIncrement` for version — only for build number

The `autoIncrement: true` in production profile increments the **build number**, not the `version` string. The version (`1.0.0` → `1.1.0`) must be bumped manually in `app.json`.

## Release Planning Checklist

Copy this checklist and track progress:
- [ ] Finalize feature scope and test on preview build
- [ ] Gather feedback from preview testers (leaders/admins)
- [ ] Write release notes (App Store + in-app announcement)
- [ ] Bump version in `app.json`, `developer-info.tsx`, `settings.tsx`
- [ ] Build production: `eas build --profile production --platform all`
- [ ] Submit to stores: `eas submit --platform ios && eas submit --platform android`
- [ ] After store approval, publish in-app announcement for the release
- [ ] For OTA-only updates: `npx eas update` then create announcement

See the **prioritizing-roadmap-bets** skill for deciding what goes into each release. See the **scoping-feature-work** skill for breaking large features into shippable increments.
