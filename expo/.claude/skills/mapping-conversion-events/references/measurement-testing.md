# Measurement & Testing Reference

## Contents
- Core Metrics
- Supabase Analytics Queries
- PostHog Funnel Setup
- Testing Instrumentation
- Anti-Patterns

---

## Core Metrics

These are the metrics that matter for EBC Connect. Everything else is vanity:

| Metric | Formula | Target | Supabase Source |
|--------|---------|--------|-----------------|
| Activation rate | profile_complete ÷ signed_up | >70% | `profiles` + `persons` |
| Family join rate | family_joined ÷ profile_complete | >60% | `persons.family_id` |
| 7-day retention | users_active_in_7d ÷ activated | >40% | `user_activity` or event logs |
| Feature breadth | distinct features used ÷ weekly_active | >2 | custom event count |
| Pending-to-approved | avg(approved_at - created_at) days | <2d | `profiles` role transitions |
| Push opt-in rate | push_registered ÷ activated_native | >60% | `notification_endpoints` |

"Activated" = completed profile + joined family (Stages 2 + 3).

---

## Supabase Analytics Queries

Run these directly in the Supabase SQL editor or via an RPC function.

### Activation Funnel

```sql
SELECT
  COUNT(*)                                                      AS signed_up,
  COUNT(*) FILTER (WHERE p.first_name IS NOT NULL)              AS profile_complete,
  COUNT(*) FILTER (WHERE p.family_id IS NOT NULL)               AS family_joined,
  COUNT(*) FILTER (WHERE pr.role NOT IN ('pending', 'visitor')) AS admin_approved,
  ROUND(
    COUNT(*) FILTER (WHERE p.first_name IS NOT NULL) * 100.0
    / NULLIF(COUNT(*), 0), 1
  )                                                             AS profile_rate_pct
FROM profiles pr
LEFT JOIN persons p ON p.user_id = pr.id;
```

### Pending-to-Approved Lag

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400) AS avg_days,
  MAX(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400) AS max_days
FROM (
  SELECT
    created_at,
    updated_at AS approved_at
  FROM profiles
  WHERE role NOT IN ('pending', 'visitor')
    AND updated_at IS NOT NULL
) t;
```

### Weekly Active Users (last 7 days of any Supabase auth activity)

```sql
-- Requires that you track last_seen in a user_activity table or use auth.users.last_sign_in_at
SELECT COUNT(DISTINCT id) AS wau
FROM auth.users
WHERE last_sign_in_at >= NOW() - INTERVAL '7 days';
```

### RSVP Conversion by Event

```sql
SELECT
  e.title,
  e.start_at,
  COUNT(r.id)                                                 AS total_rsvps,
  COUNT(r.id) FILTER (WHERE r.status = 'going')               AS going,
  COUNT(r.id) FILTER (WHERE r.status = 'maybe')               AS maybe,
  COUNT(r.id) FILTER (WHERE r.status = 'declined')            AS declined
FROM events e
LEFT JOIN event_rsvps r ON r.event_id = e.id
WHERE e.start_at >= NOW()
GROUP BY e.id, e.title, e.start_at
ORDER BY e.start_at;
```

### Prayer Engagement

```sql
SELECT
  COUNT(*)                                          AS total_requests,
  COUNT(*) FILTER (WHERE status = 'open')           AS open,
  COUNT(*) FILTER (WHERE status = 'answered')       AS answered,
  ROUND(AVG(prayer_count), 1)                       AS avg_prayers_per_request
FROM prayer_requests_with_counts;
```

---

## PostHog Funnel Setup

After instrumenting events (see `conversion-optimization.md`), configure a funnel in PostHog:

1. **Funnel steps:**
   - `auth_signup`
   - `visitor_profile_completed`
   - `family_joined` OR `family_created`
   - `event_rsvp` OR `prayer_request_created` OR `signup_submitted`

2. **Conversion window:** 7 days (church members return weekly, not daily)

3. **Breakdown dimension:** `$os` — measure iOS vs Android vs Web drop-off separately

4. **Retention chart:** Set "initial action" = `visitor_profile_completed`, "return action" = any engagement event, window = weekly

---

## Testing Instrumentation

### Verify events fire correctly before deploying

PostHog has a debug mode that logs to the console without sending to the server:

```typescript
const posthog = new PostHog('YOUR_KEY', {
  host: 'https://us.i.posthog.com',
  debug: __DEV__,          // logs all events in development
  disabled: false,         // still fires in dev so you can verify
});
```

Check the Metro console for `[PostHog]` lines after each conversion action.

### Test each funnel stage manually

```
Copy this checklist and track progress:
- [ ] Create a new test account via email/password
- [ ] Confirm `auth_signup` fires in PostHog Live Events
- [ ] Complete visitor profile — confirm `visitor_profile_completed` fires
- [ ] Navigate to Family tab — confirm empty state renders correctly
- [ ] Create or join a family — confirm `family_joined` or `family_created` fires
- [ ] RSVP to an event — confirm `event_rsvp` fires with correct status
- [ ] Submit a prayer request — confirm `prayer_request_created` fires
- [ ] Submit a signup form — confirm `signup_submitted` fires with correct status
- [ ] Grant push permissions — confirm `push_notification_registered` fires
- [ ] Verify no PII appears in any event payload (PostHog → Event Properties)
```

---

## WARNING: Using console.log as a Proxy for Analytics

**The Problem:**

The codebase has 150+ `console.log` calls that loosely resemble tracking:

```typescript
// EXISTING — development-only, no business value
console.log('🏷️ Loading tagged events for person:', myPersonId);
console.log('[funnel] step_2_profile_complete');
```

**Why This Breaks:**
1. Console logs don't persist — you can't query them retroactively
2. No aggregation, no cohort analysis, no funnel visualization
3. Logs are stripped in production builds (EAS production profile may strip them)
4. Can't segment by user properties, platform, or role

**The Fix:**

Replace funnel-relevant `console.log` calls with `posthog.capture()`. Leave diagnostic logs for developer debugging only. A `console.log` that says `[funnel]` is a placeholder, not an implementation.

---

## WARNING: Measuring Retention with signInCount Instead of Distinct Sessions

```typescript
// BAD — sign-in count is not retention
posthog.capture('app_opened', { sign_in_count: localCount });
```

Retention requires distinct sessions on distinct days. Use PostHog's built-in retention analysis which tracks `$session_id` automatically, or track `app_foreground` with a date string:

```typescript
// app/_layout.tsx — AppState listener
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    posthog.capture('app_foreground', {
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD only
    });
  }
});
```

For deeper metric patterns, see the **instrumenting-product-metrics** skill.
