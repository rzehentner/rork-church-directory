# Product Analytics Setup

## Contents
- SDK Options
- PostHog Setup
- Supabase-Native Alternative
- User Identification
- Platform Considerations
- Anti-Patterns

## SDK Options

| Option | Pros | Cons |
|--------|------|------|
| **PostHog React Native** | Funnels, cohorts, feature flags, session replay | Third-party dependency, data leaves your infra |
| **Supabase `product_events` table** | Zero new dependencies, data stays in Postgres, queryable with SQL | No built-in funnel/cohort UI, must build dashboards |
| **Amplitude / Mixpanel** | Mature product analytics | Expensive at scale, heavy SDKs |

**Recommendation:** Start with PostHog (free tier: 1M events/month). If you need data sovereignty, use the Supabase-native approach.

## PostHog Setup for Expo

### 1. Install

```bash
bun add posthog-react-native
```

### 2. Add Provider in `app/_layout.tsx`

Insert after `QueryClientProvider`, before `ToastProvider`:

```typescript
import { PostHogProvider } from 'posthog-react-native';

// In the provider stack:
<QueryClientProvider client={queryClient}>
  <PostHogProvider
    apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY!}
    options={{
      host: 'https://us.i.posthog.com',
      enableSessionReplay: false,  // Disable for RN performance
    }}
  >
    <ToastProvider>
      {/* ... rest of providers */}
    </ToastProvider>
  </PostHogProvider>
</QueryClientProvider>
```

### 3. Add Environment Variable

Add to `.env` and `.env.example`:

```
EXPO_PUBLIC_POSTHOG_KEY=phc_your_key_here
```

### 4. Create Analytics Helper

Create `lib/analytics.ts`:

```typescript
import { usePostHog } from 'posthog-react-native';

// Re-export for consistent import path
export { usePostHog } from 'posthog-react-native';

// Typed event helper (optional, prevents typos)
export type ProductEvent =
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'profile_completed'
  | 'profile_skipped'
  | 'family_created'
  | 'family_joined'
  | 'user_approved'
  | 'event_rsvp'
  | 'prayer_prayed'
  | 'signup_submitted'
  | 'potluck_claimed'
  | 'dashboard_viewed'
  | 'notification_tapped'
  | 'event_created'
  | 'announcement_created'
  | 'guidance_shown'
  | 'guidance_tapped'
  | 'error_shown';

export function useTrack() {
  const posthog = usePostHog();
  return (event: ProductEvent, properties?: Record<string, unknown>) => {
    posthog.capture(event, properties);
  };
}
```

### 5. Usage in Screens

```typescript
import { useTrack } from '@/lib/analytics';

export default function EventsScreen() {
  const track = useTrack();

  const handleRSVP = async (eventId: string, status: string) => {
    await rsvpEvent(eventId, status);
    track('event_rsvp', { event_id: eventId, status });
  };
}
```

## Supabase-Native Alternative

If you prefer zero third-party dependencies, log events to a Supabase table.

### 1. Create Table (SQL)

```sql
create table product_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  event text not null,
  properties jsonb default '{}',
  created_at timestamptz default now()
);

-- Index for funnel queries
create index idx_product_events_user_event on product_events(user_id, event, created_at);

-- RLS: users can insert their own events, admins can read all
alter table product_events enable row level security;
create policy "Users insert own events" on product_events for insert with check (auth.uid() = user_id);
create policy "Admins read all" on product_events for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### 2. Create RPC for Batch Insert

```sql
create or replace function log_product_event(
  p_event text,
  p_properties jsonb default '{}'
) returns void as $$
begin
  insert into product_events (user_id, event, properties)
  values (auth.uid(), p_event, p_properties);
end;
$$ language plpgsql security definer;
```

### 3. Client Helper

```typescript
// lib/analytics.ts
import { supabase } from '@/lib/supabase';

export async function trackEvent(event: string, properties?: Record<string, unknown>) {
  await supabase.rpc('log_product_event', {
    p_event: event,
    p_properties: properties ?? {},
  });
}
```

**Trade-off:** No built-in funnel visualization. You must query with SQL or build a simple admin dashboard. See the **supabase** skill for RPC patterns.

## User Identification

Set user identity once in `hooks/auth-context.tsx` when the session changes:

```typescript
// In onAuthStateChange callback
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    posthog.identify(session.user.id, {
      email: session.user.email,
    });
  } else {
    posthog.reset();  // Clear on sign out
  }
});
```

Update person properties when profile data loads in `hooks/user-context.tsx`:

```typescript
// After person data is fetched
if (person) {
  posthog.people.set({
    role: profile.role,
    has_family: !!person.family_id,
    church_member_since: person.created_at,
  });
}
```

## Platform Considerations

The app runs on iOS, Android, and web. Analytics must handle all three:

```typescript
import { Platform } from 'react-native';

// PostHog handles platform automatically, but add it as a property for custom queries
posthog.capture('event_rsvp', {
  status,
  platform: Platform.OS,  // 'ios' | 'android' | 'web'
});
```

**Web-specific:** `posthog-react-native` does NOT support web. For web builds, use `posthog-js`:

```typescript
// lib/analytics.ts
import { Platform } from 'react-native';

export function getAnalyticsClient() {
  if (Platform.OS === 'web') {
    // posthog-js for web
    return require('posthog-js').default;
  }
  // posthog-react-native for native
  return require('posthog-react-native');
}
```

Or use the Supabase-native approach which works identically on all platforms.

## WARNING: Tracking in useEffect Without Cleanup

**The Problem:**

```typescript
// BAD — fires on every re-render if dependencies change
useEffect(() => {
  posthog.capture('screen_viewed', { screen: 'events' });
}, [events]); // events changes frequently
```

**Why This Breaks:**
1. `events` array changes on every fetch → fires tracking on every data refresh
2. Inflates screen view counts by 5-10x
3. Skews all downstream funnel calculations

**The Fix:**

```typescript
// GOOD — fires once on mount
useEffect(() => {
  posthog.capture('screen_viewed', { screen: 'events' });
}, []); // empty dependency array = mount only
```

## WARNING: Blocking UI on Analytics Calls

**The Problem:**

```typescript
// BAD — awaiting analytics blocks the user action
const handleRSVP = async () => {
  await rsvpEvent(eventId, status);
  await posthog.capture('event_rsvp', { status }); // blocks UI
  showToast('success', 'RSVP updated');
};
```

**Why This Breaks:**
1. Analytics network failures delay the success toast
2. Users perceive the app as slow
3. Analytics should NEVER block user-facing interactions

**The Fix:**

```typescript
// GOOD — fire and forget
const handleRSVP = async () => {
  await rsvpEvent(eventId, status);
  posthog.capture('event_rsvp', { status }); // no await
  showToast('success', 'RSVP updated');
};
```

## Analytics Setup Checklist

Copy this checklist and track progress:
- [ ] Install PostHog SDK (or create Supabase `product_events` table)
- [ ] Add `EXPO_PUBLIC_POSTHOG_KEY` to `.env` and `.env.example`
- [ ] Add `PostHogProvider` to `app/_layout.tsx` provider stack
- [ ] Create `lib/analytics.ts` with typed event helper
- [ ] Add `posthog.identify()` in auth state change handler
- [ ] Add `posthog.people.set()` in user context after profile load
- [ ] Add `posthog.reset()` on sign out
- [ ] Verify events appear in PostHog dashboard
- [ ] If events fire, iterate: add remaining events from taxonomy

## Related Skills

- See the **supabase** skill for RPC function patterns and table creation
- See the **expo** skill for environment variable configuration
- See the **typescript** skill for type-safe event definitions
