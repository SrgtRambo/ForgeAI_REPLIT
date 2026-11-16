<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Forge AI calls go through the server-only OpenRouter route.
  Keep `OPENROUTER_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project architecture

- The Forge workspace is the original vanilla-JS app in `public/forge/` (markup in `workspace.html`, scripts loaded in order by `src/routes/_authenticated/studio.tsx`); keep it vanilla and bump `FORGE_VERSION` in the studio route when those files change, because they are cached static assets.
- Forge scripts never touch the database or AI directly: they go through `window.ForgeCloud` (`src/lib/forge-cloud.ts`), which diff-syncs the in-memory project list to `forge_projects` and supplies the bearer token, so all persistence stays behind RLS.
- AI calls go only through `/api/forge/chat` (`src/lib/forge-ai.server.ts`), which verifies the bearer token, claims a per-user quota via the `claim_ai_request` SQL function, and calls OpenRouter server-side. The client validates structured output before using it.
- Request validation and limits live in `src/lib/forge-ai-rules.ts` (pure, unit-tested in `src/test/`); client output-token caps are visible-output budgets and the server adds fixed reasoning headroom because reasoning shares the same budget.
