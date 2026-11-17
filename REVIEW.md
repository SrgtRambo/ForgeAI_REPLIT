# Review — Forge AI Backend Pipeline

## Scope

Complete 10-phase backend build for Forge AI: an AI-powered site generation system that takes a business prompt, analyzes it, produces a site spec, renders static HTML/CSS/JS files, runs QA (accessibility + banned copy + overflow), and delivers a zip via Stripe checkout or free generation tier.

## What Was Built

| Component | File(s) | Purpose |
|-----------|---------|---------|
| Spec schema + validator | `backend/src/site/spec.js` | Validates site.spec.json structure |
| Section library | `backend/src/site/sections/` | 16 section types × variants (hero, features, testimonials, booking, team, etc.) |
| Design system | `backend/src/site/design/` | Palette, banned phrases, typography tokens |
| Analysis engine | `backend/src/site/analyze.js` | Converts business prompt → analysis JSON |
| Spec generator | `backend/src/site/build-spec-from-analysis.js` | Converts analysis → site spec |
| Image pipeline | `backend/src/site/images/` | Unsplash + Pexels providers, resolution, placeholder handling |
| Builder | `backend/src/site/build.js` | Spec → static files (HTML, CSS, JS, images, credits, README, sitemap, robots) |
| Generation engine | `backend/src/engine.js` | Multi-file planning + writing with continuation support |
| Job runner | `backend/src/jobs.js` | Background generation, zip packaging, Supabase storage upload |
| API server | `backend/src/server.js` | Express routes: catalog, checkout, generate-free, purchases, download, webhook |
| Order validation | `backend/src/orders.js` | Prompt/tier/type validation |
| Pricing | `backend/src/pricing.js` | Tiers, limits, prompt char limits |
| Packager | `backend/src/packager.js` | In-memory zip build (JSZip) |
| Database schema | `backend/schema.sql` | purchases table, RLS policies |
| QA module | `backend/src/qa/index.js` | Playwright render + axe-core + banned text + vision critic |
| Studio route | `src/routes/_authenticated/studio.tsx` | Loads Forge workspace, sync state, account slot |

## Test Coverage

129 tests across 10 test files, 0 failures.

## Locked Decisions (Do Not Revisit Without Discussion)

1. **Spec-driven rendering**: All output derives from `site.spec.json` — no ad-hoc templates.
2. **Static HTML output**: Delivered zips contain plain HTML/CSS/JS, no build step required.
3. **No stock portraits**: Team sections use illustration or avoid faces; no hotlinking.
4. **Unsplash→Pexels fallback**: If Unsplash fails, try Pexels; both use API keys, no direct image URLs in HTML.
5. **Banned phrases**: lorem ipsum, click here, unlock, seamless, revolutionary, game changer, template placeholders (`{{ }}`, `[insert]`).
6. **Hero heading ≤ 9 words**: Enforced in builder.
7. **Free tier limit**: 5 analyses per day per user.
8. **Preview in sandboxed iframe**: Generated sites preview isolated from studio.
9. **RLS on all tables**: Users only read/write their own purchases.
10. **No secrets in browser code**: API keys stay behind Supabase RLS + backend routes.

## Remaining Items (Post-Phase 10)

- Stripe payments require a paid Lovable plan or user's own Stripe key (see roadmap.md)
- `.env` must be populated with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY` before running `backend/src/server.js`
- Model slugs from `.env.example` should be verified against openrouter.ai/models
- QA vision critic requires an OpenRouter vision-capable model (`MODEL_CRITIC`)
