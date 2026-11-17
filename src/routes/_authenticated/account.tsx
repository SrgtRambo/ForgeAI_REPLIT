import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { UserProfile, useClerk, useUser } from "@clerk/react";

import { ForgeLogo } from "@/components/forge-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileQueryOptions, saveCompanyName } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Your account — Forge AI" },
      { name: "description", content: "Manage your Forge AI profile, password, and sign-in." },
      { property: "og:title", content: "Your account — Forge AI" },
      { property: "og:description", content: "Manage your Forge AI profile, password, and sign-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions(context.user.id)),
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { data: profile } = useSuspenseQuery(profileQueryOptions(user.id));
  const queryClient = useQueryClient();
  const [company, setCompany] = useState(profile.companyName);

  const saveProfile = useMutation({
    mutationFn: () => saveCompanyName(company.trim().slice(0, 160)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Company saved");
    },
    onError: (error) => toast.error("Couldn't save your company: " + error.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await clerkSignOut({ redirectUrl: "/" });
  }

  function onProfile(event: FormEvent) {
    event.preventDefault();
    saveProfile.mutate();
  }

  return (
    <div className="min-h-screen bg-background bg-forge-glow">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <ForgeLogo />
        <Button asChild variant="forge" size="sm">
          <Link to="/studio">Back to studio</Link>
        </Button>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-6 px-5 pb-16">
        <div className="animate-rise">
          <h1 className="text-3xl font-bold">Your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {clerkUser?.primaryEmailAddress?.emailAddress}</p>
        </div>

        <section className="rounded-2xl border border-border bg-card/80 p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your account details are managed securely by Forge sign-in.</p>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onProfile}>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" maxLength={160} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Summit Plumbing" />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="forge" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? "Saving…" : "Save company"}
              </Button>
            </div>
          </form>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-border bg-card/80 p-6">
          <h2 className="mb-5 text-lg font-semibold">Sign-in and security</h2>
          <UserProfile routing="hash" />
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/80 p-6">
          <div>
            <h2 className="text-lg font-semibold">Sign out</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your projects stay saved to your account.</p>
          </div>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </section>
      </main>
    </div>
  );
}
