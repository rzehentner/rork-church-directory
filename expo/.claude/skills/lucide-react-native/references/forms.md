# Forms Reference

## Contents
- Icon Placement in Form Fields
- Submit Button Icons
- Form Action Icons (Add/Remove)
- Validation State Icons
- WARNING: Icons Without Accessible Labels

---

## Icon Placement in Form Fields

Form screens in this codebase place icons as leading indicators inside input rows. Icons sit in a `View` container alongside `TextInput`, not inside the input itself.

```tsx
// app/create-event.tsx — Location field with icon
import { MapPin } from 'lucide-react-native';

<View style={styles.inputRow}>
  <MapPin size={18} color={Colors.text.secondary} />
  <TextInput
    style={styles.input}
    placeholder="Location"
    value={location}
    onChangeText={setLocation}
  />
</View>
```

**Common form field icons:**

| Field Type | Icon | Size |
|------------|------|------|
| Location/Address | `MapPin` | 18 |
| Date/Time | `Calendar`, `Clock` | 18 |
| Email | `Mail` | 18 |
| Password | `Lock` | 18 |
| Tags | `Tag` | 16 |
| People/Members | `Users`, `User` | 18 |
| Search | `Search` | 20 |

## Submit Button Icons

Submit and send buttons use icons alongside text. The icon color matches the button text.

```tsx
// app/create-announcement.tsx — Send button
import { Send } from 'lucide-react-native';

<TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
  <Send size={18} color={Colors.white} />
  <Text style={styles.submitButtonText}>Post Announcement</Text>
</TouchableOpacity>
```

```tsx
// app/create-signup-form.tsx — Create button
import { Send } from 'lucide-react-native';

<TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
  <Send size={16} color={Colors.white} />
  <Text style={styles.publishButtonText}>Publish Form</Text>
</TouchableOpacity>
```

**DO:** Place the icon before the text label. Use `size={16-18}` for button icons. Match `color` to text color.

**DON'T:** Use only an icon with no text label for primary form actions — users need text for critical actions.

## Form Action Icons (Add/Remove)

Forms with dynamic fields use `Plus` for add and `Trash2` for remove:

```tsx
// app/create-potluck-form.tsx — Add item row
import { Plus, Trash2 } from 'lucide-react-native';

<TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
  <Plus size={18} color={Colors.navy} />
  <Text style={styles.addButtonText}>Add Item</Text>
</TouchableOpacity>

// Remove item
<TouchableOpacity onPress={() => handleRemoveItem(index)}>
  <Trash2 size={16} color={Colors.status.error} />
</TouchableOpacity>
```

**Convention:**
- `Plus` → Add/create actions, color: `Colors.navy`
- `Trash2` → Delete/remove actions, color: `Colors.status.error`
- `Edit` / `Edit2` → Edit actions, color: `Colors.navy`
- `X` → Dismiss/close, color: `Colors.text.muted`

## Validation State Icons

Icons indicate validation states in form fields and response views:

```tsx
// app/signup-form.tsx — Field status icons
import { AlertCircle, CheckCircle, Clock } from 'lucide-react-native';

// Capacity warning
{isNearCapacity && (
  <View style={styles.warningRow}>
    <AlertCircle size={16} color={Colors.status.warning} />
    <Text style={styles.warningText}>Almost full</Text>
  </View>
)}

// Success state
{isSubmitted && (
  <View style={styles.successRow}>
    <CheckCircle size={20} color={Colors.status.success} />
    <Text>Successfully signed up</Text>
  </View>
)}
```

**Validation icon mapping:**

| State | Icon | Color |
|-------|------|-------|
| Warning | `AlertCircle` | `Colors.status.warning` |
| Error | `AlertTriangle`, `XCircle` | `Colors.status.error` |
| Success | `CheckCircle` | `Colors.status.success` |
| Pending | `Clock` | `Colors.text.muted` |

See the **zod** skill for validation schema patterns that drive these states.

## WARNING: Icons Without Accessible Labels

**The Problem:**

```tsx
// BAD — Icon-only button with no accessibility info
<TouchableOpacity onPress={handleDelete}>
  <Trash2 size={18} color={Colors.status.error} />
</TouchableOpacity>
```

**Why This Breaks:**
1. Screen readers announce nothing — the button is invisible to accessibility tools
2. Violates WCAG 2.1 — interactive elements need accessible names
3. Users with motor impairments can't identify the action

**The Fix:**

```tsx
// GOOD — Add accessibilityLabel for screen readers
<TouchableOpacity
  onPress={handleDelete}
  accessibilityLabel="Delete item"
  accessibilityRole="button"
>
  <Trash2 size={18} color={Colors.status.error} />
</TouchableOpacity>
```

**When You Might Be Tempted:** Every icon-only button. If there's no visible text label next to the icon, `accessibilityLabel` is mandatory.

---

## Form Icon Checklist

Copy this checklist when adding icons to forms:

- [ ] Use `Colors` constant for all icon colors
- [ ] Size form field icons at 16-18px
- [ ] Add `accessibilityLabel` to every icon-only `TouchableOpacity`
- [ ] Place icon before text in submit buttons
- [ ] Use `Plus` for add, `Trash2` for delete, `Send` for submit
- [ ] Show validation icons (`AlertCircle`, `CheckCircle`) for form feedback
