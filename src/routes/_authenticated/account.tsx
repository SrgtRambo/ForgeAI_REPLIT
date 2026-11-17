import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ForgeLogo } from "@/components/forge-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { profileQueryOptions } from "@/lib/profile";

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
  const { data: profile } = useSuspenseQuery(profileQueryOptions(user.id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [company, setCompany] = useState(profile.company_name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const values = { display_name: displayName.trim().slice(0, 120), company_name: company.trim().slice(0, 160) };
      const { error } = await supabase.auth.updateUser({ data: values });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile saved");
    },
    onError: (error) => toast.error("Couldn't save your profile: " + error.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error("Choose a new password with at least 8 characters.");
      const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setPasswordError(null);
      toast.success("Password changed");
    },
    onError: (error) => setPasswordError(error.message),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  function onProfile(event: FormEvent) {
    event.preventDefault();
    saveProfile.mutate();
  }
  function onPassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    changePassword.mutate();
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
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {user.email}</p>
        </div>

        <section className="rounded-2xl border border-border bg-card/80 p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Shown in your studio. Only you can see it.</p>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onProfile}>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Your name</Label>
              <Input id="displayName" maxLength={120} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jordan Lee" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" maxLength={160} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Summit Plumbing" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="forge" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card/80 p-6">
          <h2 className="text-lg font-semibold">Change password</h2>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={onPassword}>
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            {passwordError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{passwordError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline" disabled={changePassword.isPending}>
                {changePassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
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
