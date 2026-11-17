# Forge AI — Baseline (Phase 0)

## Backend test baseline (before site pipeline work)

Command: `cd backend && npm test`

- tests: 16
- pass: 16
- fail: 0
- cancelled: 0
- skipped: 0

## Environment hygiene

- `.env` is not tracked in git (only `backend/.env.example` is tracked). `.gitignore` already covers `.env`, `backend/.env`, and keeps `!.env.example` / `!backend/.env.example`.
- `git log -p --all | grep -c service_role` returned 4. All four matches are SQL `GRANT ALL ... TO service_role;` statements in schema migrations (purchases, profiles, forge_projects, ai_requests). No service role key string is exposed in history. No rotation required from this scan.

## .env.example additions (Phase 0 task 4)

Added to `backend/.env.example`:
- `UNSPLASH_ACCESS_KEY=`
- `PEXELS_API_KEY=`
- `MODEL_ANALYSIS=` (OpenRouter text model slug for analysis + spec)
- `MODEL_COPY=` (OpenRouter text model slug for copy repair)
- `MODEL_CRITIC=` (OpenRouter vision-capable model slug for QA critique)
- `ANALYSIS_DAILY_LIMIT=5`

Model slugs to verify at openrouter.ai/models before use: record here once chosen.
