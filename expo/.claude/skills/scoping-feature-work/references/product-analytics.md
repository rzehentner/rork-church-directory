# Product Analytics Scoping

## Contents
- Current Instrumentation State
- Scoping Analytics Into Features
- Event Taxonomy
- Missing Solutions
- Anti-Patterns

## Current Instrumentation State

EBC Connect has **no analytics service**. No Segment, Amplitude, Mixpanel, or Firebase Analytics. Existing instrumentation:

| What Exists | Where | Limitation |
|------------|-------|------------|
| Console logging | ~32 files | Dev-only, not persisted, unstructured |
| Push notification delivery | `lib/notifications.ts` | No open/click-through tracking |
| Toast feedback | `hooks/toast-context.tsx` | Ephemeral, not logged |
| Error logging | Service/hook files | `console.error` only, no Sentry |

## WARNING: Missing Professional Analytics

**Detected:** No analytics library in `package.json`
**Impact:** No visibility into feature adoption, user behavior, or funnel conversion

### Recommended Solution

For Expo apps, use `expo-analytics` patterns or a lightweight event tracker via Supabase:

```typescript
// Option A: Supabase-based event tracking (no new dependency)
// services/analytics.ts
export async function trackEvent(name: string, properties?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('analytics_events').insert({
    event_name: name,
    user_id: user?.id,
    properties,
    platform: Platform.OS,
    created_at: new Date().toISOString(),
  });
}
```

```typescript
// Option B: Add expo-firebase-analytics or similar
// This requires native build changes (not OTA-updatable)
```

### Why This Matters

Without analytics, every product decision is a guess. You cannot measure whether a new feature is adopted, whether onboarding changes improve activation, or where users drop off.

## Scoping Analytics Into Features

### DO: Include Analytics Criteria in Every Feature Slice

Every feature slice should include 1-2 analytics acceptance criteria:

```markdown
## Feature: Event RSVP
### Functional criteria:
- [ ] User can tap Going/Maybe/Can't Go
- [ ] RSVP status persists across sessions

### Analytics criteria:
- [ ] Track "event_rsvp" with properties: { event_id, status, source }
- [ ] Track "event_detail_viewed" on screen mount
```

### DON'T: Scope Analytics as a Separate Project

```markdown
# BAD - Analytics deferred indefinitely
Phase 1: Build features
Phase 2: Add analytics later
```

**Why this breaks:** "Later" never comes. And when it does, you've lost months of behavioral data. Adding analytics during feature development costs ~5% more effort. Adding it retroactively costs 10x.

## Event Taxonomy

When scoping analytics for EBC Connect features, use this naming convention:

### Screen Events

```typescript
// Pattern: [entity]_[action]
'dashboard_viewed'
'events_list_viewed'
'event_detail_viewed'
'prayer_created'
'event_rsvp_submitted'
'announcement_read'
'signup_form_submitted'
```

### Interaction Events

```typescript
// Pattern: [entity]_[interaction]
'event_search_used'           // { query_length, result_count }
'prayer_prayed'               // { prayer_id }
'notification_opened'         // { notification_type }
'calendar_date_selected'      // { date, event_count }
'directory_member_viewed'     // { member_id }
'family_joined'               // { family_id, method: 'code' | 'created' }
```

### Funnel Events

```typescript
// Onboarding funnel
'onboarding_login_completed'
'onboarding_profile_started'
'onboarding_profile_completed'
'onboarding_family_joined'
'onboarding_first_action'     // { action_type }

// Event creation funnel
'event_create_started'
'event_create_tags_added'
'event_create_image_uploaded'
'event_create_completed'
'event_create_abandoned'      // { step, time_spent_ms }
```

## Scoping Analytics Checklist

When scoping any feature, add these criteria:

```markdown
Analytics scope:
- [ ] Define 2-3 key events for this feature
- [ ] Define event properties (what context to capture)
- [ ] Identify funnel steps (if multi-step flow)
- [ ] Define success metric (what number should go up?)
- [ ] Specify platform property on all events (web vs native)
```

## Measuring Feature Success

### Define Success Metrics Before Building

```markdown
## Feature: Prayer Request Improvements
### Success metrics:
- Primary: Prayer requests created per week increases by 20%
- Secondary: "Prayed" button usage increases
- Guardrail: No increase in prayer deletion rate (quality maintained)
```

### Map Metrics to Supabase Queries

Since analytics may use Supabase, scope the queries:

```sql
-- Prayer engagement this week
SELECT COUNT(*) FROM prayer_marks
WHERE created_at > now() - interval '7 days';

-- RSVP conversion rate
SELECT
  COUNT(*) FILTER (WHERE rsvp_status != 'none') AS rsvped,
  COUNT(*) AS total_views
FROM event_views;
```

## Anti-Patterns

### WARNING: Tracking Everything

**The Problem:** Scoping analytics to track every button tap and scroll event.

**Why This Breaks:** Data volume overwhelms Supabase (or any backend), makes queries slow, and nobody analyzes 90% of it. In a church app with hundreds of users, you need signal, not noise.

**The Fix:** Track decisions, not movements:

```markdown
# BAD - tracking noise
'button_tapped'           // { button_id: 'rsvp_going' }
'screen_scrolled'         // { scroll_depth: 0.75 }
'tab_switched'            // { from: 'events', to: 'prayers' }

# GOOD - tracking decisions
'event_rsvp_submitted'    // { event_id, status: 'going' }
'prayer_created'          // { is_anonymous: true }
'announcement_read'       // { announcement_id, time_to_read_ms }
```

### WARNING: Scoping Analytics Without Privacy Consideration

**The Problem:** Tracking prayer request content, personal details, or family information.

**Why This Breaks:** Church members trust the app with sensitive information. Tracking prayer content in analytics violates that trust. Even without regulations, it's ethically wrong.

**The Fix:** Track actions and counts, never content:

```markdown
# BAD
trackEvent('prayer_created', { subject: prayer.subject, details: prayer.details })

# GOOD
trackEvent('prayer_created', { is_anonymous: prayer.is_anonymous, word_count: prayer.details?.split(' ').length })
```

See the **instrumenting-product-metrics** skill for implementation patterns.
See the **supabase** skill for database query patterns for analytics views.
