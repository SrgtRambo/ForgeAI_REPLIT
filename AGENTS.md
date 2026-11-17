# Forge AI workspace guide

## Runtime

- The web app uses TanStack Start and Vite; its workflow listens on port 5000.
- The Express API runs separately on port 3001. The web app proxies its API routes so browser requests remain same-origin.
- Replit-managed Clerk provides customer accounts. Replit PostgreSQL, exposed as `DATABASE_URL`, stores profiles, projects, AI usage, purchases, and private generated archives.
- OpenRouter calls are made only by server-side code.

## Project conventions

- The original Forge workspace remains vanilla JavaScript under `public/forge/`. When its cached assets change, bump `FORGE_VERSION` in the Studio route.
- Forge browser scripts use `window.ForgeCloud`; that bridge calls authenticated same-origin APIs and never handles database credentials.
- Keep project reads and writes scoped to the authenticated Clerk user. Use session cookies and server-side `auth()`; do not add browser bearer tokens.
- `drizzle/schema.ts` is the database schema source. Generate migrations with Drizzle Kit and apply schema changes to the development database before using them.
- AI request validation and output limits live in `src/lib/forge-ai-rules.ts`; its pure rules have tests in `src/test/`.
- The custom website generator runs in `backend/`, with OpenRouter secrets held server-side. Preserve its input validation, quotas, timeout handling, and generated-site QA checks.
- Do not log customer prompts, profile data, generated source, or credentials.

## Validation

- Run `bun test` and `bun run build` for the web app.
- Run `npm --prefix backend test` for the API and generation pipeline.
- Keep the `Start application` and `Start backend` workflows separate; do not create duplicate services.
