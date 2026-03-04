# Feedback & Insights Reference

## Contents
- Current Feedback Channels
- In-App Feedback Surfaces
- Support Signal Detection
- User Friction Signals from Code
- Building a Feedback Loop

## Current Feedback Channels

### WARNING: No In-App Feedback Mechanism

**Detected:** No feedback form, bug report button, in-app survey, or support contact in the settings screen or any other surface.

**Impact:** Users who encounter friction have no way to report it except contacting church staff directly. Bugs go unreported, and feature requests are lost.

### Recommended Solution

Add a feedback option to the settings screen (`app/(tabs)/settings.tsx`):

```typescript
// app/(tabs)/settings.tsx — add feedback row to settings list
<TouchableOpacity
  style={styles.settingRow}
  onPress={() => Linking.openURL('mailto:support@ebcconnect.app?subject=App Feedback')}
>
  <MessageSquare size={20} color={Colors.navy} />
  <Text style={styles.settingLabel}>Send Feedback</Text>
  <ChevronRight size={16} color={Colors.steelBlue} />
</TouchableOpacity>
```

For richer feedback, consider a modal form that captures:
- Feedback type (bug, feature request, question)
- Message text
- Screenshot (via `expo-media-library`)
- Device info (via `expo-device`)
- Current screen name

## In-App Feedback Surfaces

The app has implicit feedback surfaces that can be analyzed for user satisfaction signals:

### Toast Dismissal as Signal

```typescript
// hooks/toast-context.tsx — toast system provides indirect feedback
// Track which error toasts appear most frequently
showError('Failed to save changes');       // → save reliability issue
showWarning('You are offline');            // → connectivity UX issue
showError('Failed to load directory');     // → data access issue
```

**Insight pattern:** Aggregate error toast frequency by message to identify the most common friction points. This requires the analytics system described in the **product-analytics** reference.

### Alert Confirmation Patterns

```typescript
// Count how often users encounter destructive confirmations
// High frequency = feature is used often OR workflow forces unnecessary deletions

// app/(tabs)/prayers.tsx
Alert.alert('Delete Prayer Request', 'Are you sure?', [
  { text: 'Cancel', style: 'cancel' },  // Cancel rate = friction signal
  { text: 'Delete', style: 'destructive', onPress: handleDelete },
]);
```

### Empty State Encounters

```typescript
// How often do users see empty states?
// High frequency = content creation is too hard or discovery is broken

// If notifications empty state appears often, push notification setup may be failing
// If events empty state appears, family/tag targeting may be too restrictive
```

## User Friction Signals from Code

These code patterns indicate likely friction points users experience but may not report:

### Signal 1: Multi-Step Operations Without Rollback

```typescript
// app/create-event.tsx — chain of async operations
const event = await createEvent(data);           // Step 1: create
await setEventTags(event.id, selectedTags);      // Step 2: tags (non-fatal)
await uploadEventImage(event.id, selectedImage); // Step 3: image (non-fatal)
await scheduleReminder(event.id, reminderDate);  // Step 4: reminder
```

**Signal:** If step 1 succeeds but step 3 fails, user has an event without its image. They may not notice until viewing the event detail.

### Signal 2: Debounce-Free Search

```typescript
// app/potluck-sheet.tsx — directory search on every keystroke
const handleSearch = async (text: string) => {
  setSearchQuery(text);
  const { data } = await supabase
    .from('persons')
    .select('*')
    .ilike('first_name', `%${text}%`);
  setSearchResults(data);
};
```

**Signal:** Users on slow connections see flickering results. Fast typers trigger many unnecessary queries. This feels broken even though results eventually appear.

### Signal 3: Type-Cast Navigation

```typescript
// Throughout the app — router.push with 'as any'
router.push('/notifications' as any);
router.push('/(tabs)/events' as any);
router.push(`/event-detail?id=${event.id}` as any);
```

**Signal:** While this doesn't directly affect users, it indicates navigation routes aren't typed. If a route is renamed or removed, no compile-time error catches the broken link. See the **expo-router** skill for typed route patterns.

### Signal 4: Platform-Inconsistent Date Pickers

```typescript
// components/DateTimePicker.tsx — native implementation
// components/DateTimePicker.web.tsx — web implementation
// Different UX on each platform with separate state management
```

**Signal:** Date selection behaves differently on web vs native, confusing users who switch platforms.

## Building a Feedback Loop

### Step 1: Instrument Friction Points

Add event tracking to known friction points:

```typescript
// Track when users encounter errors
trackEvent('error.displayed', {
  screen: 'create-event',
  message: 'Failed to upload image',
  step: 3,
});

// Track when users abandon multi-step flows
trackEvent('flow.abandoned', {
  flow: 'event_creation',
  lastCompletedStep: 'tags',
});
```

### Step 2: Monitor Support Signals

If using a Supabase-native feedback table:

```sql
-- Create feedback table
CREATE TABLE user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('bug', 'feature', 'question')),
  message TEXT NOT NULL,
  screen TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Step 3: Close the Loop

```typescript
// Show users that feedback is valued
// After submitting feedback, show a toast:
showSuccess('Thanks for your feedback! We read every message.');

// For bugs, auto-attach context:
const feedbackPayload = {
  type: 'bug',
  message: userMessage,
  screen: currentRoute,
  device_info: {
    platform: Platform.OS,
    brand: Device.brand,
    modelName: Device.modelName,
    osVersion: Device.osVersion,
  },
};
```

## Feedback System Checklist

Copy this checklist and track progress:
- [ ] Add "Send Feedback" row to settings screen
- [ ] Create feedback table in Supabase with RLS policy
- [ ] Build feedback modal with type selector and message field
- [ ] Auto-attach device info and current screen
- [ ] Track error toast frequency for friction analysis
- [ ] Track empty state encounters as content gap signals
- [ ] Track flow abandonment in multi-step forms
- [ ] Implement admin view for feedback in admin panel
