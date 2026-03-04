# Feedback & Insights Prioritization

## Contents
- Current Feedback Channels
- Missing Feedback Infrastructure
- Proxy Feedback Signals
- Prioritizing Feedback-Driven Work
- Anti-Patterns
- Checklist

## Current Feedback Channels

EBC Connect has **no in-app feedback mechanism**. There is no feedback form, no rating prompt, no bug report flow, and no feature request collection.

### What Exists

```typescript
// Developer info page (app/developer-info.tsx) — credit page only
// Settings screen — shows version "1.0.0" (hardcoded)
// No "Send Feedback" button anywhere in the app
// No App Store review prompt
// No crash reporting beyond Expo's default error boundary
```

### The Only User Communication Channel

```typescript
// Church settings exposes contact info:
interface ChurchSettings {
  email: string;   // Church email — not developer/support email
  phone: string;   // Church phone
  website: string; // Church website
}
// Users can contact the church, but there is no path
// to report app issues or request features.
```

## Missing Feedback Infrastructure

### WARNING: No In-App Feedback Collection

**Detected:** No feedback form, no bug report flow, no feature request mechanism.

**Impact:** User frustration is invisible until they uninstall. Feature requests go to random church staff who can't act on them. Bugs are reported verbally and lost.

**Recommended Solution:** Add a feedback entry point in Settings:

```tsx
// In app/(tabs)/settings.tsx — add to the "About" section:
<TouchableOpacity
  style={styles.settingRow}
  onPress={() => Linking.openURL('mailto:support@ednabaptist.church?subject=App Feedback')}
>
  <MessageSquare size={20} color={Colors.navy} />
  <Text>Send Feedback</Text>
  <ChevronRight size={16} color={Colors.steelBlue} />
</TouchableOpacity>

// Or better: an in-app form that captures device info automatically
```

### WARNING: No Crash Reporting

**Detected:** No Sentry, no Bugsnag, no Firebase Crashlytics in dependencies.

**Impact:** Production crashes are invisible. Users experience errors silently. The team only learns about crashes when someone mentions it in person.

**Recommended Solution:**

```bash
# Sentry (most common for Expo apps)
bun add @sentry/react-native
```

## Proxy Feedback Signals

Without direct feedback collection, use these proxy signals to infer user satisfaction:

### Engagement Drop-Off

```typescript
// Monitor these existing data points for regression:

// 1. Prayer engagement decline
// If total daily prayers drop week-over-week, something is wrong.
// Query: SELECT date_trunc('week', created_at), COUNT(*)
//        FROM prayer_marks GROUP BY 1 ORDER BY 1;

// 2. RSVP rate decline
// If fewer people RSVP to similar events, engagement is dropping.
// The data exists in event_rsvps table.

// 3. Notification unread accumulation
// Rising unread counts = users aren't opening the app.
const { unreadCount } = useNotifications();
// If average unreadCount across users rises, re-engagement is broken.
```

### Admin Observation Signals

```typescript
// Admin approval queue tells you about acquisition:
// - Growing queue = word of mouth is working
// - Empty queue = no new signups (growth problem)
// - Frequent rejections = spam or wrong audience

// Tag assignment patterns tell you about segmentation health:
// - Most users have 0 tags = personalization is unused
// - Tag distribution is skewed = some groups are over-served

// Announcement read_count / total_recipients ratio:
// - Below 30% = content isn't resonating or notifications are broken
// - Above 70% = content is relevant and push is working
```

## Prioritizing Feedback-Driven Work

### Tier 1: Make Feedback Possible (Ship First)

| Initiative | Effort | Impact |
|-----------|--------|--------|
| Add "Send Feedback" email link in Settings | 30 min | Users can report issues |
| Install crash reporting (Sentry) | 2-4 hours | Automatic error visibility |
| Add app version from `Constants.expoConfig` | 15 min | Users can reference version in reports |

```typescript
// Fix hardcoded version in settings.tsx:
import Constants from 'expo-constants';

// BEFORE (hardcoded):
<Text>Version 1.0.0</Text>

// AFTER (dynamic):
<Text>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
```

### Tier 2: Make Feedback Structured (Build Second)

| Initiative | Effort | Impact |
|-----------|--------|--------|
| In-app feedback form with device info | 1-2 days | Structured, actionable reports |
| App Store review prompt after positive engagement | 1 day | Organic store ratings |
| Feature request voting (Supabase table) | 2-3 days | Community-driven prioritization |

### Tier 3: Make Feedback Continuous (Build Later)

| Initiative | Effort | Impact |
|-----------|--------|--------|
| NPS survey after 30 days | 2-3 days | Satisfaction benchmark |
| Session replay (PostHog) | 1-2 days (if PostHog installed) | See exactly what users struggle with |
| In-app changelog / release notes | 1-2 days | Awareness of improvements |

## Scoring Feedback Initiatives

### DO: Collect device context with every feedback report

```typescript
// When building a feedback form, auto-capture:
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const feedbackContext = {
  appVersion: Constants.expoConfig?.version,
  platform: Platform.OS,
  osVersion: Platform.Version,
  deviceModel: Device.modelName,
  deviceBrand: Device.brand,
  role: myRole,
  // Do NOT include: email, name, or other PII unless user opts in
};
```

### DO: Time review prompts after positive engagement

```typescript
// GOOD — ask for review after a meaningful positive action
// Example: After marking 10th prayer, after first successful RSVP

// Use AsyncStorage to track engagement milestones:
const prayerCount = await loadData('total_prayers_marked');
if (prayerCount >= 10 && !await loadData('review_prompted')) {
  // Show review prompt
  await saveData('review_prompted', true);
}
```

### DON'T: Ask for feedback during onboarding

```typescript
// BAD — prompting for feedback when user is still pending/new
// They haven't used the app enough to have an opinion.
// This creates negative first impressions.

// GOOD — wait until user has completed at least 3 engagement actions
```

## Anti-Patterns

### WARNING: No Error Visibility

**The Problem:** The app catches errors with `try-catch` and `console.error` but has no way to aggregate or alert on production errors.

**Why This Breaks:** A bug affecting 50% of users on Android could persist for weeks because no one reports it. The team only learns about issues through in-person complaints, which biases feedback toward the most vocal users.

**The Fix:** Install crash reporting before building any other feedback mechanism. Crash reporting is passive — it requires zero user effort and catches issues that users won't report.

### WARNING: Verbal Feedback Bias

**The Problem:** Without structured feedback channels, the loudest voices in the congregation drive the roadmap.

**Why This Breaks:** A vocal minority requesting a chat feature doesn't mean the majority wants it. Without data or structured feedback, the team builds for the few, not the many.

**The Fix:** Even a simple "What should we build next?" poll in the app (or via announcement) provides better signal than hallway conversations.

## Checklist

Copy this checklist when prioritizing feedback work:
- [ ] Can users report bugs from within the app?
- [ ] Is crash reporting installed (Sentry/Bugsnag)?
- [ ] Is the app version dynamically displayed (not hardcoded)?
- [ ] Are review prompts timed after positive engagement?
- [ ] Is device context automatically captured with feedback?
- [ ] Are proxy engagement signals being monitored?

See the **instrumenting-product-metrics** skill for measuring feedback quality. See the **adding-structured-signals** skill for structured data collection.
