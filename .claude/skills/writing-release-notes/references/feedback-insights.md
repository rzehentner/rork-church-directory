# Feedback & Insights Reference

## Contents
- Feedback Channels in EBC Connect
- In-App Feedback Surfaces
- Admin Approval as Feedback Loop
- Prayer Engagement as Signal
- RSVP Data as Feature Signal
- Announcement Reach as Communication Signal
- WARNING: No In-App Feedback Mechanism
- Incorporating Feedback into Release Notes
- DO/DON'T Patterns

## Feedback Channels in EBC Connect

EBC Connect has **no built-in feedback mechanism** — no in-app survey, rating prompt, or feedback form. User feedback comes through indirect signals and out-of-band channels (email, in-person conversations at church).

Release notes should be informed by these indirect signals rather than quantitative analytics.

## In-App Feedback Surfaces

The closest thing to user feedback within the app:

**Prayer requests** — users submit free-text prayer requests. While not product feedback, the volume and tone indicate engagement.

**Signup form submissions** — the `signup_submissions` table tracks form completions. Drop-off (forms viewed vs. completed) could indicate UX friction.

**Settings screen** — displays developer contact info:

```typescript
// app/(tabs)/settings.tsx
<Text>Developed by: Robert Zehentner (Pine Belt Data)</Text>
<Text>Contact: rob@pinebeltrides.com</Text>
```

```typescript
// app/developer-info.tsx
<Text>Lead Developer</Text>
<Text>Caleb McWhorter</Text>
<Text>caleb@ednabc.org</Text>
```

These are the only paths for users to reach developers. Release notes should mention new contact methods if they change.

## Admin Approval as Feedback Loop

The admin panel's approval queue (`app/(tabs)/admin.tsx`) surfaces new user registrations:

```typescript
// Admin sees: name, email, registration date, whether a person record exists
// Actions: Approve (assigns 'member' role) or Reject (deletes profile)
```

Approval velocity is a proxy for growth. If approvals spike after a release, the release drove sign-ups. Mention this in internal release retrospectives.

## Prayer Engagement as Signal

Prayer interaction data reveals feature engagement:

```typescript
// prayer_requests_with_counts view
// total_prayers: how many people prayed for this request
// has_prayed: whether the current user has prayed
```

High prayer counts indicate community engagement. If a release improves the prayer experience, compare pre/post prayer counts per request.

## RSVP Data as Feature Signal

RSVP rates per event indicate how well events drive engagement:

```typescript
// events_for_me view
// my_rsvp_status: 'going' | 'maybe' | 'not_going' | null
// attendance_count: total confirmed attendees
```

If a release adds inline RSVP (removing the need to open event details), compare RSVP rates before and after.

## Announcement Reach as Communication Signal

Read rates on announcements measure communication effectiveness:

```sql
-- Unread rate for a specific announcement
SELECT
  (SELECT COUNT(*) FROM announcement_reads WHERE announcement_id = ?) as read_count,
  (SELECT COUNT(*) FROM profiles WHERE role IN ('member', 'leader', 'admin')) as total_members;
```

If release note announcements have low read rates, consider:
- Publishing at a different time (Sunday morning vs. weekday)
- Using push notifications alongside the announcement
- Keeping the title more attention-grabbing

## WARNING: No In-App Feedback Mechanism

**Detected:** No feedback form, rating prompt, NPS survey, or support ticket system in the app.

**Impact:**
- No structured way to collect user reactions to new features
- Cannot validate release note claims with user sentiment
- Feature prioritization relies on developer intuition or in-person feedback

**Recommended approach for release feedback:**
1. Publish a "What's New" announcement with a call-to-action: "Have feedback? Email us at [contact]"
2. Track announcement read rate as a proxy for awareness
3. Monitor indirect signals (RSVP rates, prayer counts, form submissions) for behavior changes

## Incorporating Feedback into Release Notes

Use indirect signals to prioritize what to highlight:

**High engagement features** (many RSVPs, prayers, form submissions) deserve prominent placement in release notes — users care about these.

**Low engagement features** may need more explanation in release notes — users might not know they exist.

**Admin-reported friction** (approval queue issues, tag management pain) should inform "improvements" bullets.

### Template: Feedback-Informed Release Notes

```markdown
## What's New

**Most Requested** (based on church feedback)
- [Feature that addresses common verbal feedback]

**Popular Features, Now Better**
- [Improvement to high-engagement feature, cite engagement if appropriate]

**For Church Leaders**
- [Admin/leader tool improvement based on their workflow feedback]
```

## DO/DON'T Patterns

### DO: Reference the feedback source when relevant

```markdown
// GOOD — grounds the release note in reality
- Based on your feedback: events now show a calendar view for easier browsing
```

### DON'T: Fabricate user demand

```markdown
// BAD — no data supports "most requested"
- Our most requested feature is here!
// (unless you genuinely received multiple requests)
```

### DO: Include a feedback channel in release announcements

```typescript
// In-app announcement body
'We\'d love to hear what you think about the new calendar view. '
+ 'Email us at caleb@ednabc.org with feedback or suggestions.'
```

### DON'T: Use release notes to solicit App Store reviews

App Store guidelines prohibit incentivizing reviews. Keep release notes focused on features.

### DO: Track pre/post metrics for major releases

```markdown
// Internal tracking (not in user-facing notes)
Before release: avg 3 RSVPs per event
After release: avg 8 RSVPs per event (inline RSVP working)
→ Next release notes: "RSVP improvements continue..."
```

See the **mapping-user-journeys** skill for understanding how users flow through the app. See the **designing-inapp-guidance** skill for writing copy that surfaces feedback prompts naturally.
