# Feedback & Insights Metrics

## Contents
- Implicit Feedback Signals
- Error Tracking as Feedback
- Support Signal Detection
- Anti-Patterns
- Actionable Dashboards

## Implicit Feedback Signals

EBC Connect has no explicit feedback mechanism (no in-app survey, no rating prompt, no "was this helpful?" widget). All user feedback is implicit — derived from behavior patterns.

### High-Friction Signals

Track these to detect frustration:

| Signal | Event | Detection Logic |
|--------|-------|-----------------|
| Repeated errors | `error_shown` | 3+ errors in same session |
| Form abandonment | `form_started` without `form_submitted` | Track form open + submit separately |
| Rage taps | Multiple rapid taps on same element | Custom gesture handler |
| Sign-out after error | `error_shown` → `sign_out` within 5 min | Funnel analysis |
| Immediate bounce | `screen_viewed` → back navigation < 3 sec | Track screen duration |

### Form Abandonment Tracking

Signup forms in `app/signup-form.tsx` are complex multi-field forms. Track start vs. completion:

```typescript
// On form mount
useEffect(() => {
  posthog.capture('signup_form_opened', {
    form_id: formId,
    event_id: eventId,
    field_count: fields.length,
  });
}, []);

// On successful submission (already tracked as signup_submitted)
// Abandonment = signup_form_opened without signup_submitted in same session
```

For event creation in `app/create-event.tsx`:

```typescript
useEffect(() => {
  posthog.capture('event_form_opened', { is_edit: !!editId });

  return () => {
    // Track if user navigated away without saving
    if (!hasSubmittedRef.current) {
      posthog.capture('event_form_abandoned', { is_edit: !!editId });
    }
  };
}, []);
```

### Screen Duration as Engagement Signal

Long time on prayer list = engaged reading. Long time on settings = confused or searching.

```typescript
// Reusable hook for screen duration tracking
function useScreenDuration(screenName: string) {
  const startTime = useRef(Date.now());

  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      posthog.capture('screen_duration', {
        screen: screenName,
        duration_seconds: duration,
      });
    };
  }, []);
}

// Usage in any screen
export default function PrayersScreen() {
  useScreenDuration('prayers');
  // ...
}
```

## Error Tracking as Feedback

The app's `ErrorBoundary` in `app/_layout.tsx` only calls `console.error`. This is the highest-value untracked signal.

### ErrorBoundary Tracking

```typescript
// In app/_layout.tsx ErrorBoundary
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  posthog.capture('app_crash', {
    error_message: error.message,
    component_stack: errorInfo.componentStack?.slice(0, 500),
    screen: getCurrentRoute(),
  });
}
```

### Toast Error Tracking

The toast system in `hooks/toast-context.tsx` surfaces all user-facing errors. Instrument `showToast` for error-type toasts:

```typescript
function showToast(type: ToastType, message: string) {
  if (type === 'error') {
    posthog.capture('error_shown', {
      message: message.slice(0, 200),  // Truncate for privacy
      screen: getCurrentRoute(),
    });
  }
  // ... existing toast logic
}
```

### Service-Level Error Tracking

Service functions in `services/` throw errors that callers catch. Track at the service boundary:

```typescript
// In services/events.ts
export async function rsvpEvent(eventId: string, status: RSVPStatus) {
  if (!isValidUUID(eventId)) {
    posthog.capture('validation_error', { service: 'events', method: 'rsvpEvent', field: 'eventId' });
    throw new Error('Invalid event ID');
  }
  // ...
}
```

## Support Signal Detection

Without an in-app support channel, detect support needs from behavior:

### Repeated Setting Changes

Users who toggle notification preferences repeatedly may be confused:

```typescript
// Track notification preference changes with frequency
posthog.capture('notification_pref_changed', {
  setting: prefKey,
  new_value: newValue,
  changes_this_session: changeCountRef.current++,
});
```

### Directory as Help-Seeking

Users who browse the directory and tap email addresses may be seeking help from church staff:

```typescript
posthog.capture('directory_email_tapped', {
  is_staff: contactPerson.role === 'admin' || contactPerson.role === 'leader',
});
```

If `is_staff === true` frequently, users may need an in-app support channel.

## WARNING: Tracking PII in Error Messages

**The Problem:**

```typescript
// BAD — error messages may contain user data
posthog.capture('error_shown', { message: error.message });
// error.message might be: "User john@church.org already exists"
```

**Why This Breaks:**
1. PII in analytics violates GDPR/privacy requirements
2. Email addresses, names, phone numbers leak into third-party analytics
3. Cannot easily delete PII from analytics platforms

**The Fix:**

```typescript
// GOOD — sanitize before tracking
function sanitizeForTracking(message: string): string {
  return message
    .replace(/[\w.-]+@[\w.-]+/g, '[email]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
    .slice(0, 200);
}

posthog.capture('error_shown', {
  message: sanitizeForTracking(error.message),
});
```

## WARNING: Tracking Without Consent

**The Problem:** Adding analytics without informing users. Church apps handle sensitive data (prayer requests, family info).

**Why This Breaks:**
1. App Store review may reject apps that track without disclosure
2. Church members expect privacy for prayer requests
3. GDPR requires consent for non-essential analytics

**The Fix:** Add an analytics consent toggle in `app/(tabs)/settings.tsx`:

```typescript
const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

// Check before any tracking call
if (analyticsEnabled) {
  posthog.capture('event_rsvp', { status });
}

// Or disable at the SDK level
posthog.optOut();  // Stops all tracking
posthog.optIn();   // Resumes tracking
```

NEVER track prayer request content, personal messages, or family details as event properties.

## DO/DON'T

```typescript
// DON'T — Track prayer request content
posthog.capture('prayer_created', {
  subject: prayer.subject,  // "Please pray for my marriage"
  details: prayer.details,  // Extremely private
});

// DO — Track structural metadata only
posthog.capture('prayer_created', {
  is_anonymous: prayer.is_anonymous,
  has_details: !!prayer.details,
  subject_length: prayer.subject.length,
});
```

```typescript
// DON'T — Track form field values
posthog.capture('signup_submitted', { phone: formData.phone });

// DO — Track form structure, not content
posthog.capture('signup_submitted', {
  fields_filled: Object.keys(formData).filter(k => !!formData[k]).length,
  total_fields: fields.length,
});
```

## Actionable Dashboard Queries

### Weekly Health Dashboard (SQL for Supabase-native approach)

```sql
-- Activation funnel (last 30 days)
select
  count(*) filter (where event = 'sign_up') as signups,
  count(*) filter (where event = 'profile_completed') as profiles,
  count(*) filter (where event IN ('family_created', 'family_joined')) as families,
  count(*) filter (where event IN ('event_rsvp', 'prayer_prayed')) as first_actions
from product_events
where created_at > now() - interval '30 days';

-- Error hotspots (last 7 days)
select
  properties->>'screen' as screen,
  properties->>'message' as error,
  count(*) as occurrences
from product_events
where event = 'error_shown' and created_at > now() - interval '7 days'
group by 1, 2
order by occurrences desc
limit 10;
```

## Feedback Instrumentation Checklist

Copy this checklist and track progress:
- [ ] Add `app_crash` tracking in `app/_layout.tsx` ErrorBoundary
- [ ] Add `error_shown` tracking in `hooks/toast-context.tsx`
- [ ] Add `signup_form_opened` in `app/signup-form.tsx` (for abandonment)
- [ ] Add `event_form_abandoned` in `app/create-event.tsx` (cleanup handler)
- [ ] Add PII sanitization helper in `lib/analytics.ts`
- [ ] Add analytics consent toggle in `app/(tabs)/settings.tsx`
- [ ] NEVER track prayer content, personal messages, or form field values
- [ ] Build error hotspot dashboard (weekly review)

## Related Skills

- See the **designing-inapp-guidance** skill for surfacing help at friction points
- See the **adding-structured-signals** skill for structured data patterns
- See the **mapping-user-journeys** skill for journey-level friction analysis
