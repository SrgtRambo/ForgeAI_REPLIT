# Forge AI backend

The Express service powers Forge AI's in-app website generator and optional paid software delivery. It runs alongside the TanStack web app on port 3001.

## Request flow

1. A signed-in Forge customer sends a same-origin request with their Clerk session cookie.
2. The server verifies the customer session and validates a bounded generation request.
3. The site pipeline calls OpenRouter, builds the files, and runs browser/accessibility checks when Chromium is available.
4. Generated sites return to the authenticated Forge workspace. Optional paid projects are queued and stored privately in Replit PostgreSQL.

## Run and test

On Replit, the backend workflow starts this service. For local development:

```sh
npm install
cp .env.example .env
npm run dev
npm test
```

The test command is `node --test test/*.test.js`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string; Replit supplies this automatically. |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Replit-managed Clerk customer authentication. |
| `OPENROUTER_API_KEY` | Server-side model access. |
| `ALLOW_SITE_GENERATION` | Set to `true` to enable website generation. |
| `ALLOW_FREE_GENERATION` | Set to `true` to enable the optional free-project queue. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Optional payment checkout and webhook support. |

See `.env.example` for additional model and rate-limit settings. Keep all private keys in Replit Secrets or a local, uncommitted `.env` file.

The default site limits are one build per minute and three per day per customer, with an overall daily service cap. Site-generation requests have strict validation, body-size limits, and an OpenRouter timeout.

## API

The backend trusts Clerk's server-verified session cookie; it does not accept client-supplied bearer tokens.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service and feature status |
| GET | `/api/catalog` | Available generation types and tiers |
| POST | `/api/site/generate` | Generate a website from validated business details |
| POST | `/api/checkout` | Start optional Stripe checkout |
| POST | `/api/generate-free` | Queue a free project when enabled |
| GET | `/api/purchases` | List the signed-in customer's purchases |
| GET | `/api/purchases/:id` | Read one of the customer's purchases |
| GET | `/api/purchases/:id/download` | Stream the customer's private ZIP when ready |
| POST | `/api/stripe/webhook` | Receive signed Stripe events |

Purchase status moves through `pending`, `queued`, `processing`, and `ready` (or `failed` / `cancelled`). The background queue is in memory and recovers unfinished database jobs on startup, so run a single backend instance.
