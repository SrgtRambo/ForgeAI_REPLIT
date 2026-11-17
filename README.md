# Forge AI

Forge AI lets customers create software and websites from a private studio. The app uses TanStack Start for the web experience, Replit-managed Clerk for customer accounts, Replit PostgreSQL for user data, and OpenRouter for server-side AI requests.

## Running on Replit

The workspace starts the web app and backend as separate workflows:

- Web app: `bun run dev -- --host 0.0.0.0 --port 5000`
- Backend: `npm --prefix backend run dev`

Replit supplies `DATABASE_URL` for its PostgreSQL database. The schema source is `drizzle/schema.ts`; migrations are generated in `drizzle/migrations/`. Customer sign-in is managed through Replit's Auth pane. The backend also needs the `OPENROUTER_API_KEY` secret. Do not put private keys in browser code or commit them.

Account and project records from the previous workspace are not copied automatically. New customers create a Forge account; the app stores new projects in Replit PostgreSQL.

## Local development

Install the root packages with Bun and backend packages with npm:

```sh
bun install
npm --prefix backend install
bun run dev
npm --prefix backend run dev
```

For local use, configure `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `OPENROUTER_API_KEY` in the environment. Optional Stripe checkout requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. See `backend/.env.example` for backend settings.

## Checks

```sh
bun test
bun run build
npm --prefix backend test
```

## Data and AI boundaries

- Customer authentication is handled by Clerk session cookies; browser code does not pass bearer tokens.
- Project and profile queries are scoped to the signed-in Clerk user.
- OpenRouter credentials stay on the server.
- Site generation is disabled unless `ALLOW_SITE_GENERATION=true`; per-user and global limits are configurable in `backend/.env.example`.
- Stripe checkout is optional. Purchases and private project archives use the Replit PostgreSQL database when Stripe is configured.
