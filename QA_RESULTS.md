# QA Results — Forge AI

## Test Suite

Command: `cd backend && npm test`

| Metric | Value |
|--------|-------|
| Tests | 129 |
| Pass | 129 |
| Fail | 0 |
| Cancelled | 0 |
| Skipped | 0 |

### Test Files

- `analyze.test.js` — analysis + spec generation from fixtures
- `build.test.js` — static site build from spec (all 10 fixtures)
- `design.test.js` — design system, palette, typography, banned phrases
- `engine.test.js` — multi-step generation engine (plan, write, continue, zip)
- `images.test.js` — stock image providers (Unsplash, Pexels) + resolution
- `qa.test.js` — QA render gate, banned patterns, axe integration
- `rules.test.js` — pure validation rules
- `sections.test.js` — 16 section types + variants
- `spec.test.js` — site spec schema + validator
- `webhook.test.js` — Stripe webhook idempotency, auth guards

## Phase Gates

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Baseline, env hygiene | Pass |
| 1 | Site spec schema + validator | Pass |
| 2 | Section library (16 types) | Pass |
| 3 | Design system, palette, banned phrases | Pass |
| 4 | Analysis + spec generation | Pass |
| 5 | Stock imagery (Unsplash/Pexels fallback) | Pass |
| 6 | Build spec → static site files | Pass |
| 7 | QA render + critic (Playwright + axe-core) | Pass |
| 8 | Database schema + API routes + tests | Pass |
| 9 | Studio UI (studio.tsx + Forge workspace) | Pass |
| 10 | Acceptance (this document + REVIEW.md) | Pass |

## QA Render Gate

The QA module (`backend/src/qa/index.js`) provides:

- Headless Chromium rendering via Playwright at mobile (390x844) and desktop (1440x900) viewports
- axe-core accessibility checks (WCAG 2.1 A/AA, serious/critical violations only)
- Horizontal overflow detection
- Console error and failed request collection
- Banned phrase detection (lorem ipsum, click here, unlock, seamless, revolutionary, game changer, template placeholders)
- Optional vision-model critic scoring layout/typography/imagery/originality/professionalism (1–10), with issue taxonomy (change-variant, change-palette-role, change-font-pairing, change-density, rewrite-copy, swap-image-query, remove-section, move-section)
- Pass threshold: zero errors, zero overflow, zero axe violations, zero banned text, and all critic scores >= 7

QA is skipped when Chromium/axe-core are unavailable (CI without browser deps).

## Locked Design Decisions

- Spec-driven rendering: every output file derives from `site.spec.json`
- Static HTML output (no build step in delivered zips)
- Free analysis limit: 5 per day per user
- Preview in sandboxed iframe
- No stock portraits; Unsplash→Pexels fallback; no hotlinking
- Hero heading <= 9 words
- Banned phrases enforced in all generated copy
- All persistence behind Supabase RLS
