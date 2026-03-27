All 7 files created. Here's a summary of what was generated in `.claude/skills/inspecting-search-coverage/`:

---

**`SKILL.md`** — Quick reference with the 3 indexable surfaces (Expo web, App Store, Play Store), quick-start patterns for `<Head>` tags, and links to all references.

**`references/technical.md`** — Expo Router's `<Head>` component, static vs dynamic title strategy, deep link URL structure (`event-detail?id=`, `signup-form?formId=`), `app.json` PWA config, `robots.txt` for auth-gated routes, and a WARNING about the auth guard blocking all crawlers from reaching content.

**`references/on-page.md`** — Title tag patterns (50–60 char limit), meta description guidelines (120–155 chars), full Open Graph block using `eventImageUrl()` for `og:image`, ASO on-page fields (App Store name/subtitle/keywords table), and a WARNING about the current generic static titles.

**`references/content.md`** — Content strategy for a closed community app, keyword intent mapped to each screen, App Store long description template, copy DO/DON'T pairs emphasizing church specificity, and an audit checklist.

**`references/programmatic.md`** — Dynamic `<Head>` wired to TanStack Query data, build-time sitemap script querying Supabase for `is_public` events, deep link OG pre-population from URL params for link preview crawlers, and a WARNING against over-engineering for a private app.

**`references/schema.md`** — `Event`, `Organization`, and `MobileApplication` JSON-LD patterns, safe injection via `dangerouslySetInnerHTML`, XSS protection for Supabase string values, and a WARNING that schema on auth-gated pages is wasted (links to the auth bypass fix).

**`references/competitive.md`** — Competitor landscape (Pushpay, Church Center, Subsplash), iOS keyword field strategy, Play Store short description template, differentiation copy patterns, App Store review response guidance, and an ASO audit checklist with iterate-until-pass validation steps.