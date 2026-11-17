import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; mode?: string } => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
    ...(typeof search["mode"] === "string" ? { mode: search["mode"] } : {}),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: search.mode === "signup" ? "/sign-up" : "/sign-in",
      search: search.redirect ? { redirect: search.redirect } : {},
      replace: true,
    });
  },
});
