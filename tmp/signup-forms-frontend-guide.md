# Signup Forms Feature — Frontend Developer Guide

**Date:** February 15, 2026  
**Project:** church-directory (Supabase)  
**Status:** Database migration applied. Frontend implementation needed.

---

## Feature Summary

Admins can attach a configurable signup form to any event. Members can sign up themselves, a family member, or manually enter another person. Forms support standard fields (name, email, phone — auto-filled from person data) and custom fields (transportation needs, emergency contact, t-shirt size, etc.).

Forms are accessible in two places: from the event detail screen, and from a standalone "Forms" section that lists all active signup forms.

---

## New Database Objects

### Tables

| Table | Purpose |
|---|---|
| `signup_forms` | Form definitions, one per event max |
| `signup_form_fields` | Ordered list of fields per form (standard + custom) |
| `signup_responses` | Individual signup entries |
| `signup_response_values` | Custom field answers (EAV pattern) |

### Enums

| Enum | Values |
|---|---|
| `signup_form_type` | `event`, `general` |
| `signup_field_type` | `text`, `email`, `phone`, `boolean`, `select`, `textarea`, `date`, `number` |
| `signup_status` | `confirmed`, `waitlisted`, `cancelled` |

### Views

| View | Purpose |
|---|---|
| `signup_form_summary` | Form list with event info + confirmed/waitlisted counts |
| `signup_response_detail` | Full response data with person info + custom fields as JSON |

### RPC Functions

| Function | Who Can Call | Purpose |
|---|---|---|
| `create_signup_form(...)` | Staff only | Create a form + fields in one call |
| `submit_signup(...)` | Authenticated | Sign up self, family member, or manual entry |
| `cancel_signup(...)` | Submitter or staff | Cancel a signup (auto-promotes waitlisted) |
| `get_my_signup_forms()` | Authenticated | List active forms with the caller's signup status |

---

## TypeScript Types to Add

```typescript
// Add to types/supabase.ts

type SignupFormType = 'event' | 'general';
type SignupFieldType = 'text' | 'email' | 'phone' | 'boolean' | 'select' | 'textarea' | 'date' | 'number';
type SignupStatus = 'confirmed' | 'waitlisted' | 'cancelled';

interface SignupForm {
  id: string;
  form_type: SignupFormType;
  event_id: string | null;
  title: string;
  description: string | null;
  is_active: boolean;
  max_signups: number | null;
  deadline: string | null;
  allow_guest_signup: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SignupFormField {
  id: string;
  form_id: string;
  field_key: string;
  field_label: string;
  field_type: SignupFieldType;
  is_required: boolean;
  is_standard: boolean;          // true = name/email/phone (auto-fill from person)
  options: string[] | null;      // for 'select' type
  placeholder: string | null;
  sort_order: number;
}

interface SignupResponse {
  id: string;
  form_id: string;
  person_id: string | null;
  submitted_by: string | null;
  respondent_name: string;
  respondent_email: string | null;
  respondent_phone: string | null;
  status: SignupStatus;
  created_at: string;
  updated_at: string;
}

interface SignupResponseValue {
  id: string;
  response_id: string;
  field_id: string;
  value: string | null;
}
```

---

## API Reference — RPC Functions

### `create_signup_form` (Admin)

Creates a form and its fields in one call.

```typescript
const { data } = await supabase.rpc('create_signup_form', {
  p_event_id: 'event-uuid',
  p_title: 'VBS Registration',        // optional, defaults to "{event title} Signup"
  p_description: 'Register your kids for VBS!',
  p_max_signups: 50,                   // null = unlimited
  p_deadline: '2026-06-01T00:00:00Z',  // null = no deadline
  p_fields: [
    // Standard fields — auto-fill from person data when user selects a person
    { field_key: 'name',  field_label: 'Full Name',  field_type: 'text',  is_required: true, is_standard: true },
    { field_key: 'email', field_label: 'Email',       field_type: 'email', is_required: true, is_standard: true },
    { field_key: 'phone', field_label: 'Phone',       field_type: 'phone', is_required: false, is_standard: true },

    // Custom fields — user fills these in manually
    { field_key: 'emergency_contact', field_label: 'Emergency Contact Name & Phone', field_type: 'text', is_required: true, is_standard: false },
    { field_key: 'needs_transport',   field_label: 'Needs Transportation?',          field_type: 'boolean', is_required: false, is_standard: false },
    { field_key: 'tshirt_size',       field_label: 'T-Shirt Size',                   field_type: 'select',  is_required: true, is_standard: false, options: ['YS','YM','YL','AS','AM','AL','AXL'] },
    { field_key: 'allergies',         field_label: 'Food Allergies or Medical Needs', field_type: 'textarea', is_required: false, is_standard: false },
  ]
});
// Returns: { success: true, form_id: 'uuid' }
```

**Standard fields** (`is_standard: true`) have special meaning. When the user selects a person (themselves or a family member), the frontend should auto-populate name, email, and phone from the person record. The `field_key` values `name`, `email`, and `phone` are stored directly on the response row — NOT in `signup_response_values`.

---

### `submit_signup` (Authenticated User)

Three modes of operation:

**1. Sign up a known person (self or family member):**
```typescript
const { data } = await supabase.rpc('submit_signup', {
  p_form_id: 'form-uuid',
  p_person_id: 'person-uuid',          // person being signed up
  p_field_values: {                     // custom field answers
    emergency_contact: 'Jane Doe (601) 555-9999',
    needs_transport: 'true',
    tshirt_size: 'AM',
    allergies: 'Peanut allergy'
  }
});
```

**2. Sign up with manual entry (no person record):**
```typescript
const { data } = await supabase.rpc('submit_signup', {
  p_form_id: 'form-uuid',
  p_person_id: null,
  p_manual_name: 'Guest Person',
  p_manual_email: 'guest@example.com',
  p_manual_phone: '6015551234',
  p_field_values: {
    emergency_contact: 'Parent Name (601) 555-0000',
    tshirt_size: 'YL'
  }
});
```

**Returns:**
```json
{
  "success": true,
  "response_id": "uuid",
  "status": "confirmed",          // or "waitlisted" if form is full
  "respondent_name": "John Smith"
}
```

**Authorization rules built into the function:**
- Users can sign up themselves (their own person_id)
- Users can sign up anyone in their family (same family_id)
- Staff can sign up anyone
- Manual entries (null person_id) are always allowed for authenticated users
- Duplicate person_id on the same form is blocked (returns error)

---

### `cancel_signup`

```typescript
const { data } = await supabase.rpc('cancel_signup', {
  p_response_id: 'response-uuid'
});
// Returns: { success: true }
```

When a confirmed signup is cancelled, the system automatically promotes the oldest waitlisted person to confirmed.

---

### `get_my_signup_forms`

Returns all active, non-expired forms with the caller's signup status.

```typescript
const { data } = await supabase.rpc('get_my_signup_forms');
```

Returns an array of:
```typescript
{
  form_id: string;
  form_title: string;
  form_description: string | null;
  event_id: string;
  event_title: string;
  event_start: string;
  event_end: string;
  event_location: string | null;
  max_signups: number | null;
  deadline: string | null;
  confirmed_count: number;
  my_signup_status: 'confirmed' | 'waitlisted' | null;  // null = not signed up
}
```

---

## Direct Table Queries

For cases where the RPC functions don't cover the need:

**Get form fields (to render the form):**
```typescript
const { data: fields } = await supabase
  .from('signup_form_fields')
  .select('*')
  .eq('form_id', formId)
  .order('sort_order');
```

**Get all responses for a form (admin view):**
```typescript
const { data: responses } = await supabase
  .from('signup_response_detail')
  .select('*')
  .eq('form_id', formId)
  .neq('status', 'cancelled')
  .order('created_at');
```

The `custom_fields` column in `signup_response_detail` returns a JSON object like:
```json
{
  "emergency_contact": "Jane Doe (601) 555-9999",
  "needs_transport": "true",
  "tshirt_size": "AM",
  "allergies": "Peanut allergy"
}
```

**Check if an event has a signup form:**
```typescript
const { data: form } = await supabase
  .from('signup_forms')
  .select('id, title, is_active, max_signups, deadline')
  .eq('event_id', eventId)
  .single();
```

**Get form summary for listing:**
```typescript
const { data: forms } = await supabase
  .from('signup_form_summary')
  .select('*')
  .eq('is_active', true)
  .order('event_start');
```

---

## UI Screens to Build

### 1. Form Builder (Admin — accessible from event edit/detail)

Admin creates or edits a signup form for an event.

**Inputs:**
- Title (defaults to "{event title} Signup")
- Description (optional instructions)
- Max signups (optional capacity limit)
- Deadline (optional cutoff date)
- Field list — drag-to-reorder, with:
  - Quick-add buttons for standard fields: "Name", "Email", "Phone"
  - "Add Custom Field" button with: label, type dropdown, required toggle, options (for select type), placeholder

**Suggested UX:**
- Show a preview of the form as the admin builds it
- Standard fields should have a distinct visual indicator (e.g., a badge or icon showing they auto-fill)
- Warn if no "name" standard field is added (it's always needed)

---

### 2. Signup Form (User — accessible from event detail + forms list)

The actual form that members fill out.

**Person selection (top of form):**
- "Who are you signing up?" with three options:
  - **Myself** — auto-selects the logged-in user's person record
  - **A family member** — shows a picker with their family members (query persons where family_id matches)
  - **Someone else** — shows manual name/email/phone fields

**When a person is selected**, standard fields auto-populate from their person record and should be shown as read-only (or editable with a visual indicator that they came from the directory).

**Custom fields** render below based on the field definitions:
- `text` → text input
- `email` → email input
- `phone` → phone input with formatting
- `boolean` → toggle/checkbox
- `select` → dropdown from `options` array
- `textarea` → multi-line text
- `date` → date picker
- `number` → number input

**Submit** calls `submit_signup` RPC. Show the returned status (confirmed vs waitlisted) clearly.

**Capacity indicator:** If `max_signups` is set, show "X of Y spots filled" or "X spots remaining". If full, show "You will be added to the waitlist."

**Deadline indicator:** If `deadline` is set and approaching, show a countdown or warning.

---

### 3. Forms List (User — standalone section in app navigation)

A list of all active signup forms, powered by `get_my_signup_forms()`.

**Each card shows:**
- Form title + event title
- Event date/time and location
- Spots remaining (if capped)
- Deadline (if set)
- User's signup status badge: "Signed Up", "Waitlisted", or a "Sign Up" button

Tapping a card navigates to the signup form screen (Screen 2).

---

### 4. Responses List (Admin — accessible from event detail or form management)

A table/list of all signups for a form, powered by `signup_response_detail` view.

**Columns:**
- Name (with person photo if available)
- Email, Phone
- Status (confirmed / waitlisted / cancelled)
- Custom field values (expand or show in columns)
- Signed up at (timestamp)
- Submitted by (who submitted — might differ from the person signed up)

**Actions:**
- Cancel a signup (staff can cancel anyone)
- Export to CSV (nice-to-have)
- Filter by status

---

## How It Relates to Existing Features

**Events:** A form is always tied to an event via `signup_forms.event_id` (one-to-one). The form inherits the event's audience tags — there are no tags directly on forms. To check if an event has a signup form, query `signup_forms` by `event_id`.

**Event Attendees / RSVP:** The signup forms system is **separate from** `event_attendees` / RSVP. RSVPs are simple going/maybe/declined responses. Signup forms are for structured registration with custom data collection. **When an event has a signup form, hide the RSVP buttons entirely.** The signup form replaces the RSVP for that event. On the event detail screen, check for a signup form first:

```typescript
const { data: form } = await supabase
  .from('signup_forms')
  .select('id, is_active')
  .eq('event_id', eventId)
  .maybeSingle();

if (form?.is_active) {
  // Show signup form UI (link to form, spots remaining, user's status)
} else {
  // Show standard RSVP buttons (going / maybe / declined)
}
```

This is intentional — every event gets RSVP by default, and admins can "upgrade" an event to a full signup form when they need structured registration. The two systems should never appear on the same event simultaneously.

**Persons:** Signup responses link to `persons` via `person_id`. When a user signs up a known person, `submit_signup` auto-fills name/email/phone from the person record and enforces family-based authorization.

**Profiles:** `submitted_by` tracks which logged-in user submitted the signup. This lets the UI show "You signed up John Smith" and lets users cancel their own submissions.

---

## Edge Cases to Handle

| Scenario | Behavior |
|---|---|
| Form is at capacity | New signups get `status = 'waitlisted'` automatically |
| Confirmed person cancels | Oldest waitlisted person auto-promoted to confirmed |
| Deadline has passed | `submit_signup` returns error; UI should hide/disable the form |
| Form is deactivated | `submit_signup` returns error; `get_my_signup_forms` excludes it |
| User tries to sign up the same person twice | Returns error "X is already signed up" |
| User tries to sign up non-family member | Returns error unless user is staff |
| Manual entry (no person_id) | Allowed for any authenticated user; no duplicate check (can't match without person_id) |
| Guest signup (unauthenticated) | Only allowed if `allow_guest_signup = true` on the form (not implemented in RPC yet — would need a separate anon-accessible function if needed) |

---

## Migration Checklist

- [ ] Run `signup-forms-migration.sql` in Supabase SQL Editor
- [ ] Add types to `types/supabase.ts`
- [ ] Build Form Builder screen (admin)
- [ ] Build Signup Form screen (user)
- [ ] Build Forms List screen (user)
- [ ] Build Responses List screen (admin)
- [ ] Add "Signup Form" button/link to event detail screen
- [ ] Add "Forms" section to app navigation
- [ ] Test: create form, sign up self, sign up family member, manual entry, cancel, waitlist promotion
