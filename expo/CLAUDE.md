# EBC Connect

EBC Connect is a mobile-first church community app for Edna Baptist Church. It provides members with a dashboard, event management, prayer requests, announcements, family directory, signup forms, potluck coordination, and admin tools. Built with Expo (React Native) and backed by Supabase, it targets iOS, Android, and web.

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js / Bun | 18+ | Bun preferred (bun.lock is primary lock file) |
| Framework | Expo | 54.x | Managed workflow, Expo Router for file-based navigation |
| Language | TypeScript | 5.x | Strict mode enabled via `tsconfig.json` |
| UI | React Native | 0.81.x | Cross-platform native UI |
| Navigation | Expo Router | 6.x | File-based routing with typed routes |
| Backend | Supabase | 2.x | Auth, Postgres DB, RPC functions, storage |
| Data Fetching | TanStack React Query | 5.x | Caching, background refetch, mutations |
| Icons | lucide-react-native | 0.475.x | Consistent icon set |
| Styling | React Native StyleSheet | — | Per-screen style files, shared color constants |
| Validation | Zod | 4.x | Schema validation |
| Date Utils | date-fns | 4.x | Date formatting and manipulation |
| Build/Deploy | EAS Build & Update | — | Cloud builds, OTA updates |

## Quick Start

```bash
# Prerequisites: Node 18+, Bun (recommended), Expo CLI, EAS CLI

# Install dependencies
bun install

# Set up environment variables (copy and fill in Supabase credentials)
cp .env.example .env

# Start development server
npx expo start

# Start with tunnel (for testing on physical devices over network)
npx expo start --tunnel

# Start web only
npx expo start --web

# Lint
expo lint

# TypeScript check
npx tsc --noEmit
```

## Project Structure

```
ebcconnect/
├── app/                    # Expo Router screens (file-based routing)
│   ├── _layout.tsx         # Root layout: providers, Stack navigator
│   ├── index.tsx           # Entry redirect: auth check → dashboard or login
│   ├── (auth)/             # Auth group: login, layout
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/             # Main tab navigator
│   │   ├── _layout.tsx     # Tab bar config with role-based visibility
│   │   ├── dashboard.tsx   # Home screen with stats and quick actions
│   │   ├── events.tsx      # Event listing and management
│   │   ├── prayers.tsx     # Prayer request feed
│   │   ├── announcements.tsx
│   │   ├── directory.tsx   # Church member directory
│   │   ├── family.tsx      # Family group management
│   │   ├── forms.tsx       # Signup forms
│   │   ├── settings.tsx    # User settings and preferences
│   │   └── admin.tsx       # Admin panel (role-gated)
│   ├── create-event.tsx    # Event creation form
│   ├── edit-event.tsx      # Event editing
│   ├── event-detail.tsx    # Event detail view
│   ├── create-prayer.tsx   # Prayer request form
│   ├── create-announcement.tsx
│   ├── create-bulletin.tsx
│   ├── create-signup-form.tsx
│   ├── create-potluck-form.tsx
│   ├── signup-form.tsx     # Public signup form view
│   ├── signup-responses.tsx
│   ├── potluck-sheet.tsx
│   ├── notifications.tsx
│   ├── developer-info.tsx
│   ├── reset-password.tsx
│   ├── join-family.tsx
│   ├── visitor-profile.tsx
│   └── +not-found.tsx
├── components/             # Shared reusable components
│   ├── Calendar.tsx        # Custom calendar with event dots
│   ├── DateTimePicker.tsx  # Native date/time picker wrapper
│   ├── DateTimePicker.web.tsx  # Web-specific date picker
│   ├── ImageUploader.tsx   # Image pick, resize, upload
│   ├── Toast.tsx           # Toast notifications + confirmation dialog
│   ├── Skeleton.tsx        # Loading skeleton placeholder
│   ├── TagPill.tsx         # Tag badge component
│   └── ...Modals, Pickers
├── hooks/                  # React contexts (app-wide state)
│   ├── auth-context.tsx    # Supabase auth, biometric, session
│   ├── user-context.tsx    # Profile, person, family data
│   ├── me-context.tsx      # Derived auth state (role checks, display name)
│   ├── church-settings-context.tsx  # Church config via React Query
│   ├── notification-context.tsx     # Push notifications, unread count
│   └── toast-context.tsx   # Toast queue, network status
├── services/               # Supabase data access layer
│   ├── events.ts           # Event CRUD, RSVP, tags, reminders
│   ├── prayer.ts           # Prayer requests, pray tracking
│   ├── signup-forms.ts     # Form creation, submission, claims
│   ├── potluck.ts          # Potluck items and claims
│   ├── tags.ts             # Tag management
│   └── event-images.ts     # Event image upload/management
├── lib/                    # Core infrastructure
│   ├── supabase.ts         # Supabase client initialization
│   ├── storage.ts          # AsyncStorage helpers
│   ├── announcements.ts    # Announcement queries
│   ├── notifications.ts    # Push notification setup, fetch, mark-read
│   ├── notification-preferences.ts
│   └── admin-users.ts      # Admin user management
├── types/                  # TypeScript type definitions
│   ├── supabase.ts         # Auto-generated Supabase schema types
│   └── signup.ts           # Manual signup/form types
├── styles/                 # Per-screen StyleSheet files
│   ├── events.styles.ts
│   ├── admin.styles.ts
│   ├── prayers.styles.ts
│   └── ...
├── constants/
│   └── colors.ts           # Color palette (Colors object, `as const`)
├── utils/
│   ├── calendar.ts         # Device calendar integration, ICS export
│   └── validation.ts       # UUID validation helper
└── assets/images/          # App icons, splash, logos
```

## Architecture Overview

The app follows a **layered context architecture** with Expo Router for navigation:

```
┌────────────────────────────────────────────────┐
│  Expo Router (file-based navigation)           │
├────────────────────────────────────────────────┤
│  Screens (app/)                                │
│    └─ Use hooks for state, services for data   │
├────────────────────────────────────────────────┤
│  Contexts (hooks/)                             │
│    └─ Auth → User → Me → ChurchSettings → ...  │
├────────────────────────────────────────────────┤
│  Services (services/) + Lib (lib/)             │
│    └─ Supabase queries, RPC calls, storage     │
├────────────────────────────────────────────────┤
│  Supabase Backend                              │
│    └─ Postgres, Auth, RPC functions, Storage   │
└────────────────────────────────────────────────┘
```

**Provider nesting order** (defined in `app/_layout.tsx`):
QueryClientProvider → ToastProvider → AuthProvider → UserProvider → MeProvider → ChurchSettingsProvider → NotificationProvider

**Data flow**: Screens call service functions directly for CRUD operations. Contexts provide session state, user profile, and derived values (roles, permissions). TanStack React Query is used for church settings caching; other data uses context-based fetching with manual refetch.

### Key Architectural Decisions

- **@nkzw/create-context-hook**: All contexts export `[Provider, useHook]` arrays via this library, standardizing the context pattern
- **Platform-aware code**: Systematic `Platform.OS` checks for web vs native (biometric auth, push notifications, secure storage, date pickers)
- **Supabase views**: Complex queries use database views (`events_for_me`, `announcements_for_me`, `prayer_requests_with_counts`) with fallback to base tables
- **RPC-heavy operations**: Complex mutations (family creation, RSVP, signup submission) use Supabase RPC functions
- **Separated style files**: Each screen has a corresponding `*.styles.ts` file in `styles/`

## Development Guidelines

### File Naming
- Screen files: **kebab-case** (`create-event.tsx`, `signup-form.tsx`, `event-detail.tsx`)
- Component files: **PascalCase** (`Calendar.tsx`, `DateTimePicker.tsx`, `Toast.tsx`)
- Hook files: **kebab-case** with `-context` suffix (`auth-context.tsx`, `user-context.tsx`)
- Service files: **kebab-case** (`events.ts`, `signup-forms.ts`, `event-images.ts`)
- Style files: **kebab-case** with `.styles.ts` suffix (`events.styles.ts`, `admin.styles.ts`)
- Type files: **kebab-case** (`supabase.ts`, `signup.ts`)

### Code Naming
- Components/Types/Interfaces: **PascalCase** (`UserProfile`, `EventRSVP`, `PrayerRequest`)
- Functions/variables: **camelCase** (`handleSubmit`, `isLoading`, `userData`)
- Constants: **SCREAMING_SNAKE_CASE** for arrays/fixed values (`MONTHS`, `DAYS`, `MAX_WIDTH`), camelCase for config objects (`Colors`)
- Booleans: `is`/`has`/`should` prefix (`isAdmin`, `isAuthenticated`, `hasPermission`)
- Event handlers: `handle` prefix (`handlePress`, `handleSubmit`, `handleDelete`)
- Callback props: `on` prefix (`onChange`, `onSubmit`, `onDismiss`)

### Import Order
1. React / React Native core (`react`, `react-native`, `Platform`)
2. Expo packages (`expo-router`, `expo-image`, `expo-haptics`, etc.)
3. Third-party libraries (`lucide-react-native`, `date-fns`, `@supabase/supabase-js`)
4. Internal hooks (`@/hooks/auth-context`, `@/hooks/me-context`)
5. Internal services/lib (`@/services/events`, `@/lib/supabase`)
6. Internal types (`@/types/supabase`, `@/types/signup`)
7. Internal components (`@/components/Toast`, `@/components/Calendar`)
8. Internal constants/utils (`@/constants/colors`, `@/utils/validation`)

### Path Alias
All internal imports use the `@/` path alias (configured in `tsconfig.json` as `@/* → ./*`). Never use relative paths for cross-directory imports.

### Export Patterns
- **Screens**: `export default function ScreenName()`
- **Components**: `export default function ComponentName()`
- **Contexts**: `export const [XxxProvider, useXxx] = createContextHook(...)` (named exports)
- **Services**: Named exports for all functions (`export async function fetchEvents()`)
- **Types**: `export type` / `export interface` (named exports)
- **Constants**: Named export (`export const Colors = { ... } as const`)

### Error Handling
- **Services**: Throw errors on validation/query failure; callers handle with try-catch
- **Contexts**: Try-catch with `console.error`/`console.warn`; fallback to null/empty state
- **Screens**: `Alert.alert` on native, Modal on web for user-facing errors
- **UUID validation**: All service functions validate ID parameters with `isValidUUID()`

### Platform Considerations
- Use `Platform.OS` checks when behavior differs between web and native
- Biometric auth, secure store, push notifications: native only (skip on web)
- DateTimePicker has separate `.web.tsx` implementation
- AsyncStorage for auth persistence on native; default browser storage on web

## Versioning & Changelog

- **Changelog**: `CHANGELOG.md` in the project root tracks all notable changes, following [Keep a Changelog](https://keepachangelog.com) format
- **Versioning**: Follows [Semantic Versioning](https://semver.org/) — MAJOR.MINOR.PATCH
- When bumping a version, update **all three** values in `app.json`:
  - `version` (e.g., "1.0.1")
  - `android.versionCode` (increment by 1)
  - `ios.buildNumber` (increment by 1)
- Always add a new entry to `CHANGELOG.md` before creating a release build
- Categories: `Added`, `Changed`, `Fixed`, `Removed`, `Deprecated`, `Security`

## Available Commands

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo start --tunnel` | Start with tunnel for remote device testing |
| `npx expo start --web` | Start web development server |
| `expo lint` | Run ESLint |
| `npx tsc --noEmit` | TypeScript type checking |
| `eas build --profile development --platform all` | Development build (all platforms) |
| `eas build --profile preview --platform all` | Preview/internal distribution build |
| `eas build --profile production --platform ios` | Production iOS build |
| `eas build --profile production --platform android` | Production Android build |
| `npx eas update` | Publish OTA update |
| `eas submit --platform ios` | Submit to App Store |
| `eas submit --platform android` | Submit to Google Play |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public API key |

Copy `.env.example` to `.env` and fill in values. The `.env` file is gitignored.

## Deployment

- **OTA Updates**: `npx eas update` pushes JS bundle updates to published builds (runtime version policy: `appVersion`)
- **Native Builds**: EAS Build with profiles: `development` (simulator/dev client), `preview` (internal distribution), `production` (store submission)
- **App Store**: `eas submit --platform ios` after production build
- **Google Play**: `eas submit --platform android` after production build
- **Bundle IDs**: `com.ebcconnect.app` (both iOS and Android)

## Color System

The app uses a navy/gold/cream brand palette defined in `constants/colors.ts`. Access via `Colors.navy`, `Colors.status.error`, `Colors.text.primary`, etc. Semantic categories: `text`, `background`, `border`, `status`, `switch`.

## Supabase Schema

Types are auto-generated in `types/supabase.ts`. Key database views:
- `events_for_me` — events with RSVP status, audience tags, attendance
- `announcements_for_me` — announcements with read status, tag targeting
- `prayer_requests_with_counts` — prayer requests with prayer counts, ownership

Key enums: `user_role`, `rsvp_status`, `signup_status`, `prayer_status`

To regenerate types after schema changes:
```bash
npx supabase gen types typescript --project-id rwbppxcusppltwkcjmdu > types/supabase.ts
```


## Skill Usage Guide

When working on tasks involving these technologies, invoke the corresponding skill:

| Skill | Invoke When |
|-------|-------------|
| expo | Configures Expo runtime, EAS builds, and managed workflow operations |
| expo-router | Handles file-based routing, navigation, and typed route definitions |
| typescript | Enforces TypeScript strict mode and type patterns for type safety |
| bun | Manages Bun runtime, package installation, and development environment |
| supabase | Manages authentication, Postgres queries, RPC functions, and storage |
| date-fns | Handles date formatting, manipulation, and utility functions |
| zod | Implements schema validation and runtime type checking |
| react-native | Manages React Native components, hooks, and cross-platform code |
| tanstack-query | Implements React Query for caching, background refetch, and mutations |
| node | Manages Node.js runtime and server-side configuration |
| lucide-react-native | Provides consistent icon set for React Native components |
| frontend-design | Applies React Native StyleSheet with shared color constants and styling |
| designing-onboarding-paths | Designs onboarding paths, checklists, and first-run UI |
| mapping-user-journeys | Maps in-app journeys and identifies friction points in code |
| structuring-offer-ladders | Frames plan tiers, value ladders, and upgrade logic |
| orchestrating-feature-adoption | Plans feature discovery, nudges, and adoption flows |
| crafting-page-messaging | Writes conversion-focused messaging for pages and key CTAs |
| instrumenting-product-metrics | Defines product events, funnels, and activation metrics |
| clarifying-market-fit | Aligns ICP, positioning, and value narrative for on-page messaging |
| inspecting-search-coverage | Audits technical and on-page search coverage |
| adding-structured-signals | Adds structured data for rich results |
| mapping-conversion-events | Defines funnel events, tracking, and success signals |
| tuning-landing-journeys | Improves landing page flow, hierarchy, and conversion paths |
