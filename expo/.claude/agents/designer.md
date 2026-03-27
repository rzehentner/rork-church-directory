The `designer.md` subagent has been written to `.claude/agents/designer.md`. Here's what it covers:

**Brand system** — Full `Colors.*` token reference (primary palette + all semantic categories: `text`, `background`, `border`, `status`, `switch`). Hard rule: zero hardcoded hex values.

**Style file convention** — Enforces the `styles/*.styles.ts` pattern, correct import order (styles imported last), and the `StyleSheet.create()` template anchored to `Colors`.

**Design scales** — Spacing (multiples of 4, xs→4xl), typography (h1→body→label with string fontWeight literals), border radius, and a 3-level shadow/elevation system.

**Button variants** — Primary (navy), secondary (gold border), destructive, ghost, and disabled — with exact StyleSheet values.

**lucide-react-native** — Size scale table (12→48px by context), usage patterns including toggle fill, status mapping, and the typed `as const` config object pattern.

**Cross-platform rules** — `Platform.OS` usage, `DateTimePicker` platform split, safe area insets, and `KeyboardAvoidingView` behavior differences.

**Accessibility checklist** — 44pt touch targets, contrast ratios for the navy/gold/cream palette (including the gold-on-white failure case), ARIA role requirements, and error state guidance.

**10 CRITICAL rules** — Including no hardcoded hex, string fontWeight literals, no `Dimensions` inside `StyleSheet.create()`, and always read existing style files before editing.