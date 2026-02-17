# Potluck / Item-Based Signup Forms — Frontend Developer Guide

**Date:** February 16, 2026  
**Project:** church-directory (Supabase)  
**Status:** Database migration ready. Frontend implementation needed.  
**Prerequisite:** The base signup forms migration (`signup-forms-migration.sql`) must be applied first.

---

## Feature Summary

A new form type (`potluck`) under the existing `signup_forms` system. Admins create a list of items needed for an event, organized by group (Meats, Sides, Desserts, Drinks, etc.). Each item can need 1 or more volunteers. Members browse the list and claim items they'll bring — like a digital sign-up sheet.

---

## How It Fits Into the Existing System

The `signup_forms` table is the shared parent for all form types. The `form_type` column now has three values: `event`, `general`, and `potluck`.

**The RSVP/form display rule still applies:** When an event has ANY signup form (event-type OR potluck-type), hide the RSVP buttons. Check `signup_forms` by `event_id` — if a row exists and `is_active = true`, show the appropriate form UI based on `form_type`.

```typescript
const { data: form } = await supabase
  .from('signup_forms')
  .select('id, form_type, is_active')
  .eq('event_id', eventId)
  .maybeSingle();

if (form?.is_active && form.form_type === 'potluck') {
  // Show potluck item checklist UI
} else if (form?.is_active && form.form_type === 'event') {
  // Show registration form UI (existing)
} else {
  // Show standard RSVP buttons
}
```

**Forms list page:** `signup_form_summary` already includes potluck forms. Use `form_type` to render the correct card style. Potluck cards should show items claimed vs total items instead of confirmed/waitlisted counts.

---

## New Database Objects

### Tables

| Table | Purpose |
|---|---|
| `signup_item_groups` | Categories: "Meats", "Sides", "Desserts" |
| `signup_items` | Individual items: "Ham", "Brisket", "Brownies" |
| `signup_item_claims` | Who is bringing what |

### View

| View | Purpose |
|---|---|
| `potluck_form_detail` | Full form data: groups → items → claims with counts |

### RPC Functions

| Function | Who Can Call | Purpose |
|---|---|---|
| `create_potluck_form(...)` | Staff only | Create form + groups + items in one call |
| `add_potluck_items(...)` | Staff only | Add items to existing group or create new group |
| `claim_potluck_item(...)` | Authenticated | Claim an item (self, family member, or manual) |
| `unclaim_potluck_item(...)` | Claimant or staff | Remove a claim |

---

## TypeScript Types to Add

```typescript
interface SignupItemGroup {
  id: string;
  form_id: string;
  title: string;
  sort_order: number;
}

interface SignupItem {
  id: string;
  group_id: string;
  form_id: string;
  name: string;
  description: string | null;
  quantity_needed: number;       // 1 = one person claims it; 3 = three people can each claim one
  sort_order: number;
}

interface SignupItemClaim {
  id: string;
  item_id: string;
  form_id: string;
  person_id: string | null;
  claimed_by: string;           // profile id of who submitted the claim
  claimant_name: string;
  note: string | null;
  created_at: string;
}

// From potluck_form_detail view
interface PotluckFormDetailRow {
  item_id: string;
  form_id: string;
  item_name: string;
  item_description: string | null;
  quantity_needed: number;
  item_sort: number;
  group_id: string;
  group_title: string;
  group_sort: number;
  event_id: string;
  form_title: string;
  is_active: boolean;
  deadline: string | null;
  claim_count: number;
  claims: {
    claim_id: string;
    person_id: string | null;
    claimant_name: string;
    claimed_by: string;
    note: string | null;
    created_at: string;
  }[] | null;
}
```

---

## API Reference

### `create_potluck_form` (Admin)

Creates the full form structure in one call.

```typescript
const { data } = await supabase.rpc('create_potluck_form', {
  p_event_id: 'event-uuid',
  p_title: 'Fall Festival Potluck',           // optional, defaults to "{event title} — Sign Up to Bring"
  p_description: 'Sign up to bring a dish!',  // optional
  p_deadline: '2026-10-30T00:00:00Z',         // optional
  p_groups: [
    {
      title: 'Meats',
      items: [
        { name: 'Ham', description: 'Enough to serve 20', quantity_needed: 2 },
        { name: 'Brisket' },
        { name: 'Taco Meat', quantity_needed: 3 }
      ]
    },
    {
      title: 'Sides & Vegetables',
      items: [
        { name: 'Green Bean Casserole' },
        { name: 'Coleslaw', quantity_needed: 2 },
        { name: 'Baked Beans' },
        { name: 'Potato Salad' }
      ]
    },
    {
      title: 'Desserts',
      items: [
        { name: 'Brownies', quantity_needed: 2 },
        { name: 'Cookies', quantity_needed: 3 },
        { name: 'Banana Pudding' }
      ]
    },
    {
      title: 'Drinks',
      items: [
        { name: 'Sweet Tea', quantity_needed: 2 },
        { name: 'Lemonade' },
        { name: 'Water Bottles (case)', quantity_needed: 3 }
      ]
    }
  ]
});
// Returns: { success: true, form_id: 'uuid' }
```

**`quantity_needed`** defaults to 1 if omitted. When set to 2+, that many different people can each claim the item. The UI should show "2 of 3 claimed" style indicators.

---

### `add_potluck_items` (Admin)

Add items to an existing potluck form — either into an existing group or a new one.

```typescript
// Add to an existing group
const { data } = await supabase.rpc('add_potluck_items', {
  p_form_id: 'form-uuid',
  p_group_id: 'existing-group-uuid',
  p_items: [
    { name: 'Mac & Cheese' },
    { name: 'Cornbread', quantity_needed: 2 }
  ]
});

// Create a new group with items
const { data } = await supabase.rpc('add_potluck_items', {
  p_form_id: 'form-uuid',
  p_group_title: 'Paper Goods',
  p_items: [
    { name: 'Paper Plates', quantity_needed: 2 },
    { name: 'Napkins' },
    { name: 'Plastic Cups' }
  ]
});
```

---

### `claim_potluck_item` (Authenticated User)

Three modes, same as event signup:

**1. Claim as a known person (self or family member):**
```typescript
const { data } = await supabase.rpc('claim_potluck_item', {
  p_item_id: 'item-uuid',
  p_person_id: 'person-uuid',
  p_note: "I'll bring my grandmother's recipe"  // optional
});
```

**2. Claim with manual entry:**
```typescript
const { data } = await supabase.rpc('claim_potluck_item', {
  p_item_id: 'item-uuid',
  p_person_id: null,
  p_manual_name: 'Guest Person',
  p_note: null
});
```

**Returns:**
```json
{
  "success": true,
  "item_name": "Ham",
  "claimant_name": "Rob Zehentner"
}
```

**Authorization (same rules as event signup):**
- Users can claim for themselves or a family member
- Staff can claim for anyone
- Manual entries always allowed for authenticated users
- Same person can't claim the same item twice
- If all `quantity_needed` spots are taken, returns an error

---

### `unclaim_potluck_item`

```typescript
const { data } = await supabase.rpc('unclaim_potluck_item', {
  p_claim_id: 'claim-uuid'
});
```

---

### Loading the Full Potluck Form (for rendering)

```typescript
const { data: rows } = await supabase
  .from('potluck_form_detail')
  .select('*')
  .eq('form_id', formId)
  .order('group_sort')
  .order('item_sort');

// Transform flat rows into grouped structure:
const groups = new Map();
for (const row of rows) {
  if (!groups.has(row.group_id)) {
    groups.set(row.group_id, {
      id: row.group_id,
      title: row.group_title,
      sort_order: row.group_sort,
      items: []
    });
  }
  groups.get(row.group_id).items.push({
    id: row.item_id,
    name: row.item_name,
    description: row.item_description,
    quantity_needed: row.quantity_needed,
    claim_count: row.claim_count,
    claims: row.claims || [],
    is_full: row.claim_count >= row.quantity_needed
  });
}
const groupedData = [...groups.values()].sort((a, b) => a.sort_order - b.sort_order);
```

---

## UI Screens to Build

### 1. Potluck Form Builder (Admin — from event edit/detail)

Admin creates the item list.

**UX Flow:**
- Add groups with a title input
- Under each group, add items with: name, optional description, quantity needed (default 1)
- Drag-to-reorder groups and items within groups
- "Add Group" button at the bottom
- "Add Item" button within each group
- Optional: title, description, deadline at the top

**After creation**, admin can add more items/groups via `add_potluck_items`.

---

### 2. Potluck Sign-Up Sheet (User — from event detail or forms list)

The main user-facing screen. Should feel like a **checklist**.

**Layout per group:**
- Group title header ("Meats", "Desserts")
- Items listed below, each showing:
  - Item name + description
  - Claim status: "2 of 3 claimed" or "✓ All claimed" 
  - Who claimed it (show names)
  - If not full: a claim button (or checkbox)
  - If the current user (or their family member) claimed it: an unclaim option

**Claiming flow (regular user):**
- Tapping "I'll bring this" should show the person picker (same 3 options as event signup):
  - Myself
  - A family member (picker)
  - Someone else (manual name entry)
- Optional note field ("I'll bring the smoked version")
- Submit calls `claim_potluck_item`

**Claiming flow (admin on behalf of someone):**
Admins need to claim items for people who don't use the app. For example, Mr. Smith tells the admin at church that he'll bring green beans — the admin checks the item and types in "Mr. Smith". This uses the same `claim_potluck_item` function with `p_person_id: null` and `p_manual_name: 'Mr. Smith'`. The `claimed_by` field will record the admin's profile ID so there's an audit trail. The admin person picker should include all three options: search the full directory (any person, not just family), family member, or manual name entry. The manual name option is the key one for this use case — make it prominent and easy to reach.

**Visual states per item:**
- Available: open, actionable
- Partially claimed: shows who claimed + remaining spots
- Fully claimed: visually muted/completed, no action button
- Claimed by me/my family: highlighted with unclaim option

---

### 3. Potluck Admin View (Staff — from event detail)

A management view showing all claims.

**Useful data points:**
- Total items vs fully claimed items (progress indicator)
- Per-group completion status
- Ability to claim items on behalf of anyone — including people not in the directory (manual name entry)
- Ability to unclaim anyone's item
- Ability to add more items/groups after creation
- Show who submitted each claim (`claimed_by`) vs who is bringing it (`claimant_name`) — these may differ when an admin enters a claim on someone's behalf

**Powered by:** `potluck_form_detail` view + `signup_form_summary` for counts

---

### 4. Forms List Page (Updated)

The existing forms list now includes potluck forms. Card rendering should differ by `form_type`:

| Field | Event Form Card | Potluck Form Card |
|---|---|---|
| Status indicator | "12 of 50 signed up" | "8 of 15 items claimed" |
| User status | "You're signed up" | "You're bringing Ham, Brownies" |
| Action | "Sign Up" button | "View Items" button |

Use `signup_form_summary` — it now includes `total_items`, `fully_claimed_items`, and `total_claims` columns for potluck forms.

---

## Updated signup_form_summary Columns

The view was updated to include potluck-specific counts alongside the existing event-form counts:

| Column | Used By | Description |
|---|---|---|
| `confirmed_count` | Event forms | Number of confirmed signups |
| `waitlisted_count` | Event forms | Number of waitlisted signups |
| `total_items` | Potluck forms | Total number of items across all groups |
| `fully_claimed_items` | Potluck forms | Items where claim_count >= quantity_needed |
| `total_claims` | Potluck forms | Total number of individual claims |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| All spots for an item are claimed | `claim_potluck_item` returns error; UI should disable/hide claim button |
| Item with `quantity_needed = 1` | Simple checkbox — one person claims it, done |
| Item with `quantity_needed = 3` | Shows "1 of 3 claimed" with names; multiple people can claim |
| User tries to claim same item twice | Returns error "X already claimed Y" |
| User claims items across multiple groups | Allowed — no limit on total claims per person |
| Admin adds items after people have already claimed | Existing claims are untouched; new items appear unclaimed |
| Admin claims for non-directory person | Uses `p_person_id: null` + `p_manual_name`; `claimed_by` tracks which admin entered it |
| Deadline passes | Claims are locked; `claim_potluck_item` returns error; UI should show read-only view |

---

## Migration Checklist

- [ ] Apply `signup-forms-migration.sql` first (if not already done)
- [ ] Apply `potluck-forms-migration.sql`
- [ ] Add new types to `types/supabase.ts`
- [ ] Update event detail: handle `form_type === 'potluck'` case
- [ ] Build Potluck Form Builder (admin)
- [ ] Build Potluck Sign-Up Sheet (user)
- [ ] Build Potluck Admin View (staff)
- [ ] Update Forms List to render potluck cards differently
- [ ] Test: create form, claim item, unclaim, fill all spots, add items after creation
