# QA Results — Forge AI

## Completed checks

| Check | Result |
| --- | --- |
| Web production build | Passed |
| TypeScript check (`bunx tsc --noEmit`) | Passed |
| Web tests (`bun run test`) | 12 passed |
| Backend tests (`npm --prefix backend test`) | 141 passed |
| Replit workflows | Web app and backend running |
| Public backend catalog through the app proxy | HTTP 200 |
| Unauthenticated profile/project, website-generation, and Forge AI routes | HTTP 401 |
| Replit PostgreSQL schema | `profiles`, `forge_projects`, `ai_requests`, and `purchases` exist |

The database started empty, so there were no existing account or project rows to migrate. Customers will need to create Forge accounts again.

## Signed-in flow

The branded Clerk sign-in page loads at a mobile viewport. The preview is using Clerk development mode. I could not perform a real sign-in, save a project as a customer, or send a live OpenRouter request because the preview browser has no customer session. The auth-protected routes and simulated generation flows are covered by the checks above.

## Not enabled or not verified

- Stripe checkout and paid delivery are off until Stripe credentials are configured.
- The optional free project queue is off; website generation is enabled.
- A real signed-in OpenRouter generation still needs a customer-session test.
- Backend package installation reported three high-severity audit advisories; these remain for the separate dependency-security follow-up.
- The full lint command timed out while scanning the workspace. A targeted run reported formatting differences, so lint is not marked as passed.
