All 7 files have been written. Here's a summary of what was generated for `.claude/skills/react-native/`:

**SKILL.md** — Quick overview with new-screen and context patterns, key concepts table, common patterns, a new screen checklist, and cross-references to related skills.

**references/hooks.md** — `createContextHook` pattern (with real `auth-context.tsx` code), provider nesting order, `MeContext` for derived state, WARNING for stale closures in `useCallback`, WARNING for missing listener cleanup, and the confirmation dialog pattern.

**references/components.md** — StyleSheet patterns (separated files vs inline), `.web.tsx` platform split for `DateTimePicker`, WARNING for hardcoded hex colors vs `Colors.*`, WARNING for component definitions inside render, component catalog, and icon usage rules.

**references/data-fetching.md** — Service layer pattern with UUID validation and throw conventions, Supabase view/table fallback, RPC calls, bulk diff pattern, React Query for server state, WARNING against `useEffect` data fetching with 5 specific failure modes, WARNING about partial React Query adoption, optimistic update pattern, and error handling chain.

**references/state.md** — State categories table, full provider nesting with real `_layout.tsx` structure, `AuthProvider` + `UserProvider` + `MeProvider` patterns from actual code, WARNING for prop drilling, WARNING for storing derived values in state, platform-aware state, and memoized context return values.

**references/forms.md** — Individual field state pattern, iOS/Android/web date picker handling, inline validation with early returns, submission pattern with primary-then-secondary-ops structure, WARNING about missing form library for complex forms, permission-gated form pattern, and `ImageUploader` usage.

**references/performance.md** — `useMemo` for filtered lists, `useCallback` for stable references, memoized context return values, Skeleton loader with `useNativeDriver: true`, FlatList optimization checklist, WARNING for inline object props, WARNING for component definitions in render, `expo-image` vs React Native `Image`, parallel fetching, caching with `staleTime`, and bundle size guidance.