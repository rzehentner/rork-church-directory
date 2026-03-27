# Forms Reference

## Contents
- Form Architecture
- Field State Pattern
- Date Picker Platform Handling
- Validation Pattern
- Submission Pattern
- WARNING: No Form Library for Complex Forms
- Permission-Gated Forms
- Image Upload in Forms

---

## Form Architecture

Forms use individual `useState` per field — no form library installed. Validation is inline in the submit handler. All submissions go through service functions.

```
Screen (app/create-event.tsx)
  → Local useState per field
  → Inline validation in handleSave()
  → Service function (services/events.ts)
  → Toast feedback (useToast)
  → router.replace() on success
```

See the **zod** skill for schema-based validation if complexity grows.

---

## Field State Pattern

One `useState` per form field. Declare all at the top of the component:

```typescript
// app/create-event.tsx — real pattern
export default function CreateEventScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [isAllDay, setIsAllDay] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ScrollView>
      <TextInput value={title} onChangeText={setTitle} placeholder="Event title" />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description (optional)"
        multiline
        numberOfLines={4}
        style={[styles.input, styles.textArea]}
      />
      <Switch value={isAllDay} onValueChange={setIsAllDay} />
    </ScrollView>
  );
}
```

**Standard TextInput styling:**

```typescript
input: {
  borderWidth: 1,
  borderColor: Colors.border.light,
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  color: Colors.text.primary,
  backgroundColor: Colors.background.card,
},
textArea: {
  minHeight: 100,
  textAlignVertical: 'top', // Android alignment fix
},
```

---

## Date Picker Platform Handling

iOS, Android, and web each require different UX for date/time pickers. iOS shows a spinner requiring explicit confirm/cancel; Android dismisses on selection; web uses an HTML5 `<input>`.

```typescript
// Visibility + temp state for iOS spinner confirm flow
const [showStartDatePicker, setShowStartDatePicker] = useState(false);
const [tempStartDate, setTempStartDate] = useState(new Date());

const handleStartDateChange = (_event: any, selectedDate?: Date) => {
  if (Platform.OS !== 'ios') {
    setShowStartDatePicker(false);
    if (selectedDate) setStartDate(selectedDate);
  } else {
    if (selectedDate) setTempStartDate(selectedDate); // stage until confirmed
  }
};

const confirmStartDate = () => {
  setStartDate(tempStartDate);
  setShowStartDatePicker(false);
};
```

```typescript
{showStartDatePicker && (
  <View>
    {Platform.OS === 'ios' && (
      <View style={styles.pickerButtons}>
        <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmStartDate}>
          <Text>Confirm</Text>
        </TouchableOpacity>
      </View>
    )}
    <DateTimePicker
      value={Platform.OS === 'ios' ? tempStartDate : startDate}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={handleStartDateChange}
      minimumDate={new Date()}
    />
  </View>
)}
```

`DateTimePicker.web.tsx` auto-selects on web — no extra handling needed.

---

## Validation Pattern

Inline guard clauses with early returns. First failure wins — show one error at a time:

```typescript
const handleSave = async () => {
  if (!title.trim()) {
    showToast('error', 'Please enter a title');
    return;
  }
  if (endDate <= startDate) {
    showToast('error', 'End time must be after start time');
    return;
  }
  if (selectedTags.length === 0) {
    showToast('error', 'Select at least one audience tag');
    return;
  }
  // validation passed — proceed
};
```

For service-layer ID validation, use `isValidUUID()` from `utils/validation.ts`:

```typescript
if (!isValidUUID(eventId)) throw new Error('Invalid event ID');
```

---

## Submission Pattern

Primary record creation first; secondary operations (image, tags) in independent try-catches:

```typescript
const handleSave = async () => {
  // 1. Validate
  if (!title.trim()) { showToast('error', 'Title required'); return; }

  setIsLoading(true);
  try {
    // 2. Primary record — abort everything if this fails
    const event = await createEvent({
      title: title.trim(),
      description: description.trim() || null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      is_all_day: isAllDay,
      location: location.trim() || null,
    });

    // 3. Secondary ops — partial success is acceptable
    if (selectedTags.length > 0) {
      await setEventTags(event.id, selectedTags);
    }
    if (imageUri) {
      try {
        await uploadEventImage(imageUri, event.id);
      } catch {
        showToast('warning', 'Event created but image upload failed');
      }
    }

    // 4. Success
    showToast('success', 'Event created');
    router.replace('/(tabs)/events');
  } catch (error) {
    console.error('Create event failed:', error);
    showToast('error', 'Failed to create event');
  } finally {
    setIsLoading(false);
  }
};
```

Disable the submit button while loading:

```typescript
<TouchableOpacity
  onPress={handleSave}
  disabled={isLoading || !title.trim()}
  style={[styles.saveButton, (isLoading || !title.trim()) && styles.saveButtonDisabled]}
>
  {isLoading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text>Save</Text>}
</TouchableOpacity>
```

---

## WARNING: No Form Library for Complex Forms

**Detected:** No `react-hook-form` or equivalent. Forms use individual `useState` per field.

**Impact for forms with 6+ fields:**
1. Validation scattered across inline checks in `handleSave` — only the first failure shows.
2. No field-level error states — users don't know which field failed.
3. No touched/dirty tracking — submit button can't tell if form changed.
4. Growing forms require proportionally more `useState` declarations.

**Recommended solution for complex forms:**

```bash
bun add react-hook-form
```

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
});

const { control, handleSubmit, formState: { errors, isDirty } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { title: '', description: '' },
});

<Controller
  control={control}
  name="title"
  render={({ field: { onChange, value } }) => (
    <TextInput value={value} onChangeText={onChange} />
  )}
/>
{errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
```

**For simple forms (1-3 fields):** individual `useState` is fine. Reach for react-hook-form when field count grows or field-level errors matter.

See the **zod** skill for schema patterns.

---

## Permission-Gated Forms

Check permissions on mount, redirect if unauthorized:

```typescript
const { isAdminOrLeader } = useMeContext();

useEffect(() => {
  if (!isAdminOrLeader) {
    showToast('error', 'Permission denied');
    router.back();
  }
}, [isAdminOrLeader]);

if (!isAdminOrLeader) return null; // prevent flash of form before redirect
```

---

## Image Upload in Forms

Use the `ImageUploader` component — it handles permissions, picking, resizing (1200px max), and compression (0.7 quality):

```typescript
<ImageUploader
  currentImageUrl={imageUri}
  onUpload={async (file) => {
    const url = await uploadEventImage(file, eventId);
    setImageUri(url);
    return url;
  }}
  size={200}
  aspectRatio={{ width: 16, height: 9 }}
/>
```

The `onUpload` callback receives the processed local file URI. It must return the remote URL after uploading. Handle upload errors separately from the main form submission — image failure should not block record creation.
