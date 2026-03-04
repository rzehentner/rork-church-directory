# date-fns Workflows Reference

## Contents
- Supabase Timestamp to Display
- Date Input to Supabase Storage
- Event Date Range Filtering
- Calendar Month Navigation
- Birthday Month Matching
- Smart Date Display (Today/Tomorrow/Date)
- Web datetime-local Input Handling

## Supabase Timestamp to Display

All Supabase timestamp columns (`created_at`, `start_at`, `end_at`, `published_at`, `expires_at`) return ISO 8601 strings. The standard flow:

```
Supabase ISO string → new Date() → date-fns format() → rendered text
```

```typescript
import { format, formatDistanceToNow } from 'date-fns';

// Event detail screen — full date + time
const displayDate = format(new Date(event.start_at), 'EEEE, MMMM d, yyyy');
// → "Sunday, February 23, 2026"

const displayTime = event.is_all_day
  ? 'All Day'
  : format(new Date(event.start_at), 'h:mm a');
// → "2:00 PM"

// Prayer feed — relative time
const timeLabel = formatDistanceToNow(new Date(prayer.created_at), {
  addSuffix: true,
});
// → "about 2 hours ago"
```

NEVER parse Supabase timestamps with `Date.parse()` — always use `new Date(isoString)` directly.

## Date Input to Supabase Storage

When saving dates from user input back to Supabase, convert to ISO:

```typescript
import { format } from 'date-fns';

// From DateTimePicker (native) — receives a Date object
function handleDateChange(selectedDate: Date) {
  setStartDate(selectedDate);
}

// When submitting to Supabase
await supabase.from('events').insert({
  start_at: startDate.toISOString(),  // "2026-02-23T14:30:00.000Z"
  end_at: endDate.toISOString(),
});
```

For web `<input type="datetime-local">` fields, format the value for the input:

```typescript
// GOOD — date-fns format for input value
const inputValue = format(date, "yyyy-MM-dd'T'HH:mm");
// → "2026-02-23T14:30"
```

```typescript
// BAD — fragile string slicing
const inputValue = date.toISOString().slice(0, 16);
// Breaks if timezone offset shifts the date boundary
```

## Event Date Range Filtering

Building Supabase queries with date boundaries. See the **supabase** skill for query builder details.

```typescript
import { subMonths, addMonths, startOfDay } from 'date-fns';

// Activity feed — last 3 months to 6 months ahead
const rangeStart = subMonths(new Date(), 3).toISOString();
const rangeEnd = addMonths(new Date(), 6).toISOString();

const { data } = await supabase
  .from('events_for_me')
  .select('*')
  .gte('start_at', rangeStart)
  .lte('start_at', rangeEnd)
  .order('start_at', { ascending: true });

// Upcoming events only (dashboard)
const { data: upcoming } = await supabase
  .from('events_for_me')
  .select('*')
  .gte('start_at', startOfDay(new Date()).toISOString())
  .order('start_at', { ascending: true })
  .limit(5);
```

Workflow validation:

1. Build start/end dates with date-fns arithmetic
2. Convert to ISO with `.toISOString()`
3. Pass to Supabase `.gte()` / `.lte()` / `.eq()` filters
4. If results look wrong, verify timezone: `console.log(rangeStart)` to inspect the UTC boundary

## Calendar Month Navigation

The `Calendar.tsx` component navigates months. Use date-fns for clean month arithmetic:

```typescript
import { addMonths, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

const [currentMonth, setCurrentMonth] = useState(new Date());

function handleNextMonth() {
  setCurrentMonth(prev => addMonths(prev, 1));
}

function handlePrevMonth() {
  setCurrentMonth(prev => subMonths(prev, 1));
}

// Header label
const monthLabel = format(currentMonth, 'MMMM yyyy');
// → "February 2026"

// Query events for visible month
const monthStart = startOfMonth(currentMonth).toISOString();
const monthEnd = endOfMonth(currentMonth).toISOString();
```

## Birthday Month Matching

The dashboard shows birthdays for the current month. Replace native `getMonth()` with date-fns:

```typescript
import { getMonth, parseISO, isSameMonth } from 'date-fns';

// GOOD — readable intent
const currentMonthBirthdays = members.filter(m =>
  m.date_of_birth && isSameMonth(parseISO(m.date_of_birth), new Date())
);
```

```typescript
// BAD — magic numbers, unclear intent
const currentMonth = now.getMonth();
const hasBirthday = dob.getMonth() === currentMonth;
```

## Smart Date Display (Today/Tomorrow/Date)

Multiple screens need "Today" / "Tomorrow" / formatted date logic. This is the standard pattern:

```typescript
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

function formatSmartDate(isoString: string): string {
  const date = new Date(isoString);

  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow, ${format(date, 'h:mm a')}`;
  }
  if (isThisWeek(date)) {
    return format(date, 'EEEE, h:mm a'); // "Wednesday, 2:00 PM"
  }
  return format(date, 'MMM d, h:mm a'); // "Feb 28, 2:00 PM"
}
```

This replaces the duplicated `formatDate()` in dashboard.tsx, announcements.tsx, and forms.tsx.

## Web datetime-local Input Handling

The `DateTimePicker.web.tsx` component uses `<input type="datetime-local">`. The workflow:

```typescript
import { format, parseISO } from 'date-fns';

// Set input value from Date state
const inputValue = format(selectedDate, "yyyy-MM-dd'T'HH:mm");

// Parse input change back to Date
function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  const parsed = parseISO(e.target.value);
  if (!isNaN(parsed.getTime())) {
    onChange(parsed);
  }
}
```

Validation loop:

1. Format Date to `yyyy-MM-dd'T'HH:mm` for the input value
2. User modifies the input
3. Parse the input string with `parseISO()`
4. Validate with `!isNaN(parsed.getTime())`
5. If invalid, keep previous value — do not propagate NaN dates
6. If valid, call `onChange(parsed)` to update parent state

## Adding a New Date Display to a Screen

Copy this checklist and track progress:
- [ ] Import from `date-fns` (NOT native Date methods)
- [ ] Check if `utils/dates.ts` already has the formatter you need
- [ ] If not, add the new formatter to `utils/dates.ts` — never inline
- [ ] Parse Supabase strings with `new Date(isoString)`
- [ ] Format with `format()` or `formatDistanceToNow()`
- [ ] Verify output in both web and native (format strings are platform-consistent, unlike `toLocaleDateString`)
- [ ] Run `npx tsc --noEmit` to confirm types

## Debugging Date Issues

Common failure modes and fixes:

| Symptom | Cause | Fix |
|---------|-------|-----|
| Date shows as "Invalid Date" | Null/undefined from Supabase | Guard: `if (!isoString) return ''` |
| Date off by one day | UTC midnight interpreted as local previous day | Use `parseISO()` or display in UTC context |
| Time shows "12:00 AM" unexpectedly | All-day event with midnight timestamp | Check `is_all_day` flag before formatting time |
| Month navigation skips a month | Mutating Date with `.setMonth()` | Use `addMonths()` (pure, no mutation) |
| Sort order wrong | Comparing ISO strings instead of Date objects | Use `compareDesc()` or `compareAsc()` |
