import { createFileRoute } from "@tanstack/react-router";

import { ForgeSignInPage } from "@/components/auth/clerk-pages";

export const Route = createFileRoute("/sign-in/$")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
  }),
  component: SignInPage,
});

function SignInPage() {
  const { redirect } = Route.useSearch();
  return <ForgeSignInPage redirect={redirect} />;
}
