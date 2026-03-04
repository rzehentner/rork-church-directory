# Expo Router Patterns

## Contents
- Route Organization
- Parameter Passing
- Navigation Methods
- Header Configuration
- Hidden Tab Hub Pattern
- Provider Nesting in Root Layout
- Anti-Patterns

## Route Organization

This project uses three route groups under the root `Stack`:

```
app/
├── index.tsx              # Entry redirect (auth check)
├── _layout.tsx            # Root Stack: providers + screen registration
├── (auth)/                # Unauthenticated group
│   ├── _layout.tsx        # Headerless Stack
│   └── login.tsx
├── (tabs)/                # Main tab navigator
│   ├── _layout.tsx        # Tabs config with hidden tabs
│   ├── dashboard.tsx      # Visible tab (initialRoute)
│   ├── activity.tsx       # Visible tab
│   ├── directory.tsx      # Visible tab
│   ├── settings.tsx       # Visible tab
│   ├── events.tsx         # Hidden tab (href: null)
│   ├── prayers.tsx        # Hidden tab
│   └── admin.tsx          # Hidden tab
├── event-detail.tsx       # Top-level modal/stack screens
├── create-event.tsx
└── +not-found.tsx         # 404 fallback
```

**Every top-level screen must be registered** in `app/_layout.tsx` inside `RootLayoutNav`:

```typescript
function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }} initialRouteName="index">
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="event-detail" options={{ title: "Event Details" }} />
      {/* ... all other top-level screens */}
    </Stack>
  );
}
```

## Parameter Passing

All parameters use **URL query strings**, never path segments. Type them with a generic on `useLocalSearchParams`:

```typescript
// Single required param
const { id } = useLocalSearchParams<{ id: string }>();

// Multiple params, some optional
const { formId, eventId } = useLocalSearchParams<{ formId?: string; eventId?: string }>();

// Passing params - always encodeURIComponent for strings
router.push(`/create-signup-form?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}` as any);
```

**All route strings cast to `as any`** because Expo Router v6's typed routes don't fully support dynamic query parameters. This is the established pattern across the entire codebase.

### WARNING: Missing encodeURIComponent

**The Problem:**

```typescript
// BAD - titles with & or ? break the URL
router.push(`/signup-responses?formId=${id}&formTitle=${title}` as any);
```

**Why This Breaks:**
1. A title like "Lunch & Learn" produces `formTitle=Lunch & Learn`, splitting into a spurious `Learn` param
2. Special characters (`?`, `#`, `=`) corrupt the query string entirely

**The Fix:**

```typescript
// GOOD - encode user-generated strings
router.push(`/signup-responses?formId=${id}&formTitle=${encodeURIComponent(title)}` as any);
```

## Navigation Methods

| Method | When to Use | Stack Effect |
|--------|-------------|--------------|
| `router.push()` | Forward navigation (detail screens, forms) | Adds to stack |
| `router.replace()` | Auth redirects, post-login, preventing back | Replaces current |
| `router.back()` | After form submission, cancel actions | Pops stack |
| `<Link href="/">` | Static links (404 page, simple navigation) | Adds to stack |

```typescript
// After successful form save — go back to previous screen
router.back();

// After login — replace so user can't "back" to login
router.replace('/(tabs)/dashboard' as any);

// After creating an event — replace to the listing
router.replace('/(tabs)/events' as any);
```

## Header Configuration

Headers are configured at two levels:

**1. Static defaults in `_layout.tsx`:**

```typescript
<Stack.Screen name="create-event" options={{ title: "Create Event" }} />
```

**2. Dynamic overrides inside the screen component:**

```typescript
export default function EventDetailScreen() {
  const [event, setEvent] = useState<EventDetail | null>(null);
  return (
    <>
      <Stack.Screen
        options={{
          title: event?.title ?? 'Event Details',
          headerRight: () => (
            <TouchableOpacity onPress={handleShare}>
              <Share2 size={20} color={Colors.navy} />
            </TouchableOpacity>
          ),
        }}
      />
      {/* screen content */}
    </>
  );
}
```

Screens that manage their own header/back button (like `event-detail.tsx`) set `headerShown: false` in the layout and render a custom header inside the component.

## Hidden Tab Hub Pattern

The tab bar shows only 4 tabs. Additional screens live inside `(tabs)/` but are hidden:

```typescript
// app/(tabs)/_layout.tsx
<Tabs.Screen name="events" options={{ href: null }} />
<Tabs.Screen name="announcements" options={{ href: null }} />
<Tabs.Screen name="prayers" options={{ href: null }} />
<Tabs.Screen name="forms" options={{ href: null }} />
<Tabs.Screen name="family" options={{ href: null }} />
<Tabs.Screen name="admin" options={{ href: null }} />
```

Navigation to hidden tabs uses the full group path:

```typescript
router.push('/(tabs)/events' as any);
router.push('/(tabs)/admin' as any);
```

**Why this pattern:** Hidden tabs retain their scroll position and state when navigated away and back. Top-level Stack screens remount on every push. Use hidden tabs for list screens users revisit frequently.

## Provider Nesting in Root Layout

Provider order matters. The root layout nests providers in dependency order — each context can access contexts above it:

```
QueryClientProvider → ToastProvider → AuthProvider → UserProvider
→ MeProvider → ChurchSettingsProvider → NotificationProvider
```

See the **tanstack-query** skill for QueryClient configuration. See the **supabase** skill for auth provider details.

### WARNING: Accessing Context Above Its Provider

**The Problem:**

```typescript
// BAD - useAuth() called in a component outside AuthProvider
function RootLayout() {
  const { user } = useAuth(); // Crashes: no provider in tree
  return <AuthProvider>...</AuthProvider>;
}
```

**Why This Breaks:**
1. React contexts return undefined/throw when accessed outside their provider
2. The `@nkzw/create-context-hook` library throws immediately on missing provider

**The Fix:**

```typescript
// GOOD - access context only inside the provider tree
function RootLayout() {
  return (
    <AuthProvider>
      <AuthGatedContent /> {/* useAuth() works here */}
    </AuthProvider>
  );
}
```

### WARNING: Using router.push() for Auth Redirects

**The Problem:**

```typescript
// BAD - push adds login to the navigation stack
router.push('/(auth)/login' as any);
```

**Why This Breaks:**
1. User can swipe back to a screen they shouldn't access
2. Navigation stack grows with stale auth states
3. Deep back-press chains confuse users

**The Fix:**

```typescript
// GOOD - replace prevents back navigation to protected screens
router.replace('/(auth)/login' as any);
router.replace('/(tabs)/dashboard' as any);
```

**When You Might Be Tempted:** After a logout action or session expiry, you might reach for `push` out of habit. Always use `replace` for auth state transitions.
