import { createFileRoute } from "@tanstack/react-router";

import { ForgeSignUpPage } from "@/components/auth/clerk-pages";

export const Route = createFileRoute("/sign-up")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Create your Forge AI account" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const { redirect } = Route.useSearch();
  return <ForgeSignUpPage redirect={redirect} />;
}
