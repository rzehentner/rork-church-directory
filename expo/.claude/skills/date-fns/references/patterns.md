# date-fns Patterns Reference

## Contents
- Format Patterns
- Relative Time Patterns
- Date Arithmetic Patterns
- Comparison and Sorting Patterns
- WARNING: Duplicated Formatters Anti-Pattern
- WARNING: Manual Time-Ago Calculation
- WARNING: Native Date Arithmetic
- WARNING: Inconsistent Locale Usage
- Consolidation Guidance

## Format Patterns

### Standard display formats used in this project

```typescript
import { format } from 'date-fns';

// Bulletin header — full date
format(new Date(event.start_at), 'MMMM d, yyyy');
// → "February 23, 2026"

// Event card — compact weekday + date
format(new Date(event.start_at), 'EEE, MMM d');
// → "Sun, Feb 23"

// Time display
format(new Date(event.start_at), 'h:mm a');
// → "2:00 PM"

// Date input value for web <input type="datetime-local">
format(new Date(event.start_at), "yyyy-MM-dd'T'HH:mm");
// → "2026-02-23T14:30"

// Smart "Today/Tomorrow" display
import { isToday, isTomorrow } from 'date-fns';

function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}
```

## Relative Time Patterns

### Relative timestamps for feeds

```typescript
import { formatDistanceToNow } from 'date-fns';

// Prayer requests, activity feed, announcements
formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
// → "2 hours ago", "3 days ago", "about 1 month ago"
```

### Compact relative time (for tight UI spaces)

```typescript
import {
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return 'Just now';
  const hours = differenceInHours(now, date);
  if (hours < 1) return `${mins}m ago`;
  const days = differenceInDays(now, date);
  if (days < 1) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return format(date, 'MMM d');
}
```

## Date Arithmetic Patterns

```typescript
import { addDays, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Tomorrow (used in dashboard event lookahead)
const tomorrow = addDays(new Date(), 1);

// Date range for activity queries
const rangeStart = subMonths(new Date(), 3);
const rangeEnd = addMonths(new Date(), 6);

// Calendar month boundaries
const monthStart = startOfMonth(new Date());
const monthEnd = endOfMonth(new Date());
```

## Comparison and Sorting Patterns

```typescript
import { compareDesc, isBefore, isAfter, isFuture, isPast } from 'date-fns';

// Sort by newest first (prayer requests, announcements)
items.sort((a, b) => compareDesc(
  new Date(a.created_at),
  new Date(b.created_at),
));

// Check if announcement is scheduled (not yet published)
const isPending = announcement.published_at
  && isFuture(new Date(announcement.published_at));

// Check if announcement has expired
const isExpired = announcement.expires_at
  && isPast(new Date(announcement.expires_at));

// Filter upcoming events
import { isWithinInterval } from 'date-fns';

const upcomingEvents = events.filter(e =>
  isWithinInterval(new Date(e.start_at), {
    start: new Date(),
    end: addMonths(new Date(), 1),
  })
);
```

---

## WARNING: Duplicated Formatters Anti-Pattern

**The Problem:**

```typescript
// BAD — formatDate() is redefined in dashboard.tsx, announcements.tsx,
// forms.tsx, create-event.tsx, admin.tsx (5+ copies)
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
```

**Why This Breaks:**
1. **Inconsistent output** — each copy uses different options (`'en-US'` vs `[]` vs `undefined`)
2. **Bug multiplication** — fixing a format bug requires editing 5+ files
3. **Wasted bundle** — date-fns is already in the bundle but unused

**The Fix:**

Create a shared utility at `utils/dates.ts`:

```typescript
// GOOD — single source of truth
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

export function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

export function formatTimeAgo(isoString: string): string {
  return formatDistanceToNow(new Date(isoString), { addSuffix: true });
}

export function formatCompactDate(isoString: string): string {
  return format(new Date(isoString), 'MMM d, yyyy');
}
```

**When You Might Be Tempted:** When adding a new screen that needs a formatted date. NEVER copy a `formatDate` from another screen — import from `utils/dates.ts`.

---

## WARNING: Manual Time-Ago Calculation

**The Problem:**

```typescript
// BAD — manual millisecond math in dashboard.tsx, activity.tsx
const diffInHours = Math.floor(
  (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60)
);
if (diffInHours < 1) return 'Just now';
if (diffInHours < 24) return `${diffInHours}h ago`;
```

**Why This Breaks:**
1. **Off-by-one errors** — integer truncation produces wrong values near boundaries
2. **Missing edge cases** — no handling for future dates, DST transitions
3. **Duplicated in 3+ files** with slightly different logic each time

**The Fix:**

```typescript
// GOOD — date-fns handles all edge cases
import { formatDistanceToNow } from 'date-fns';

formatDistanceToNow(new Date(dateString), { addSuffix: true });
```

---

## WARNING: Native Date Arithmetic

**The Problem:**

```typescript
// BAD — mutates the Date object in place
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const endDate = new Date();
endDate.setMonth(endDate.getMonth() + 6);
```

**Why This Breaks:**
1. **Mutation** — `.setDate()` and `.setMonth()` mutate the original object, causing stale references in React state
2. **Month overflow bugs** — `new Date(2026, 0, 31).setMonth(1)` produces March 3, not Feb 28
3. **Verbose and error-prone** for common operations

**The Fix:**

```typescript
// GOOD — pure functions, no mutation, handles overflow
import { addDays, addMonths } from 'date-fns';

const tomorrow = addDays(new Date(), 1);
const sixMonthsAhead = addMonths(new Date(), 6);
```

---

## WARNING: Inconsistent Locale Usage

**The Problem:**

```typescript
// BAD — three different locale strategies in the same app
date.toLocaleDateString([]);           // forms.tsx — empty array
date.toLocaleDateString(undefined);    // dashboard.tsx — undefined
date.toLocaleDateString('en-US');      // create-event.tsx — hardcoded
```

**Why This Breaks:**
1. **Different output** on the same device depending on which screen the user views
2. **Testing difficulty** — locale-dependent output varies across CI environments

**The Fix:**

Use date-fns `format()` which produces identical output everywhere:

```typescript
// GOOD — deterministic, locale-independent
import { format } from 'date-fns';
format(date, 'EEE, MMM d, yyyy'); // Always "Sun, Feb 23, 2026"
```

---

## Consolidation Guidance

When refactoring screens to use date-fns, follow this checklist:

Copy this checklist and track progress:
- [ ] Create `utils/dates.ts` with shared formatters
- [ ] Replace `formatDate()` in dashboard.tsx with shared import
- [ ] Replace `formatDate()` in announcements.tsx with shared import
- [ ] Replace `formatDate()` / `formatTime()` in forms.tsx with shared import
- [ ] Replace `formatDate()` in create-event.tsx with shared import
- [ ] Replace `formatTimeAgo()` in dashboard.tsx and activity.tsx
- [ ] Replace `.setDate()` / `.setMonth()` mutations with `addDays` / `addMonths`
- [ ] Replace manual millisecond math with `differenceIn*` functions
- [ ] Run `npx tsc --noEmit` to verify no type regressions
