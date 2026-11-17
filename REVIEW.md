# Forge AI implementation notes

## Current architecture

- Replit-managed Clerk handles customer sign-in and session management.
- Replit PostgreSQL stores profiles, private Forge projects, AI usage records, purchases, and generated ZIP archives.
- The web app uses authenticated, same-origin APIs for project and profile storage.
- The backend validates website-generation requests, applies usage limits, and calls OpenRouter server-side.
- Stripe checkout and paid project delivery are optional and stay disabled until Stripe credentials are configured.

## Security boundaries

- Customer identity is verified on the server; project queries include the authenticated user ID.
- OpenRouter and Stripe credentials are server-only.
- Project/profile and generation endpoints enforce request size limits and rate limits.
- The generated website files are served as a ZIP only to the owning customer.

## Verification

See `QA_RESULTS.md` for the latest test and build results. Replit's signed-in Clerk UI cannot be authenticated in the public preview screenshot, so account-gated pages require API or automated test coverage as well.
