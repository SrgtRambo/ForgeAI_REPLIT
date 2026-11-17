# Forge AI backend (generation engine)

A Node.js service used by Forge AI's in-app Website Builder. It also contains optional paid software delivery:

1. A signed-in Forge AI customer describes a business in the Website Builder.
2. The service validates the Supabase access token and sends a bounded request to OpenRouter.
3. Forge builds the site files and runs browser checks when Chromium is installed.
4. The app saves the result to the customer's existing private Forge project list and can download a ZIP.
5. Optional Stripe checkout and background software delivery remain off until Stripe is configured.

## What changed from the first version

| Before | Now |
| --- | --- |
| Whole project in one AI reply capped at 4096 tokens, so apps were cut off | Plan first, then one call per file, with automatic "continue" calls if a file is still cut off |
| `npm install` + `npm run build` inside the webhook (60–90 s, Stripe gives up after ~20 s) | Webhook replies immediately; work runs in a job queue that resumes after restarts |
| `express.json()` ran before the webhook, so Stripe signature checks always failed | Webhook reads the raw body |
| Anyone could fetch any download by id | Downloads require sign-in and only work for your own purchases |
| AI could write any path (e.g. `../../etc`) | Paths are checked; only safe file types, max size per file |
| One generic prompt | Seven presets: `website`, `restaurant`, `services`, `saas`, `social`, `spreadsheet`, `software` |
| 24-hour link saved in the database (goes stale) | New link created on each download |
| Stripe metadata carried the whole prompt (500-char limit) | Only ids go to Stripe |

## Run it (Replit or VS Code)

```bash
cd backend
npm ci
cp .env.example .env    # on Replit, add these as Secrets instead
npm run dev             # http://localhost:3001/health
npm test                # node --test test/*.test.js
```

### Secrets you need

| Name | Where to get it |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Use the same Supabase project as Forge AI. The website builder saves through the signed-in app; run `sql/schema.sql` only for optional purchases and downloads. |
| `OPENROUTER_API_KEY` | openrouter.ai/keys |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe dashboard (optional at first) |

Website generation is controlled by `ALLOW_SITE_GENERATION`; it is rate-limited to one build per minute and three per day per user, with a 20-build daily service cap. Payments and free software generation stay off unless explicitly configured.

### Stripe webhook

Point a Stripe webhook at `https://YOUR-SERVER/api/stripe/webhook` with the events
`checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`.
Locally: `stripe listen --forward-to localhost:3001/api/stripe/webhook`.

## API

All `/api/*` routes except the webhook and catalog need `Authorization: Bearer <supabase access token>`.

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/health` | `{ ok, payments, freeGeneration, siteGeneration, jobs }` |
| GET | `/api/catalog` | Types and tiers with prices |
| POST | `/api/site/generate` | `{ businessName, industry?, location?, description, brandColors? }` → generated files and QA summary |
| POST | `/api/checkout` | `{ prompt, type, tier }` → `{ url, purchaseId }` (send the customer to `url`) |
| POST | `/api/generate-free` | Same body, only when `ALLOW_FREE_GENERATION=true` → `{ purchaseId }` |
| GET | `/api/purchases` | Your purchases with `status` and `progress` |
| GET | `/api/purchases/:id` | One purchase |
| GET | `/api/purchases/:id/download` | `{ url }` once `status` is `ready` |
| POST | `/api/stripe/webhook` | Stripe only |

Purchase status flow: `pending` → `queued` → `processing` → `ready` (or `failed` / `cancelled`).

## Prices and limits

Set in `src/pricing.js`: Standard $9.99 (up to 8 files), Pro $19.99 (up to 16 files).
Models per tier: `MODEL_STANDARD`, `MODEL_PRO` in `.env`. The Website Builder uses `MODEL_ANALYSIS` and `MODEL_COPY`.

## Hosting notes

Runs as one long-lived Node process (Replit Deployments "Reserved VM", Railway, Render, Fly.io).
It is not suited to serverless/edge hosting because jobs run in the background after the reply.
Run a single instance: the job queue lives in memory and resumes unfinished jobs on start.
