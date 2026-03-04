The agent file has been written to `.claude/agents/code-reviewer.md`. Here's what was customized for EBC Connect:

**Frontmatter** — skills set to `typescript, react-native, expo, expo-router, supabase, tanstack-query, zod, frontend-design` (product/marketing/SEO skills excluded as irrelevant to code review).

**10-section review checklist** covering:
1. **TypeScript strict mode** — no `any`, proper Supabase generated types, `as const` usage, Zod for RPC result validation
2. **File naming** — kebab-case screens, PascalCase components, `-context` suffix hooks, `.styles.ts` style files, `.web.tsx` platform splits
3. **Code naming** — `handle`/`on`/`is`/`has` prefixes, `SCREAMING_SNAKE_CASE` for fixed arrays
4. **Import order** — exact 8-layer order with `@/` alias enforcement, no relative cross-directory paths
5. **Export patterns** — default for screens/components, named for services/types/contexts
6. **Architecture** — `createContextHook` pattern, provider nesting order, service-layer throw convention, RPC-heavy mutations, diff-based tag sync, view-first Supabase queries
7. **Platform safety** — biometric/push/SecureStore native-only guards, `.web.tsx` for DateTimePicker, `Alert.alert` vs modal split
8. **Security** — UUID validation, no hardcoded secrets, no `EXPO_PUBLIC_` on secrets, RLS as authoritative control
9. **Error handling** — layer-by-layer (throw → catch → Alert) with no swallowed errors
10. **Performance** — no inline objects in lists, `useCallback`/`useMemo`, `FlatList` over `ScrollView`, memoized context values

Also includes a **quick violation reference table** with 10 of the most common EBC Connect-specific violations and their correct patterns.