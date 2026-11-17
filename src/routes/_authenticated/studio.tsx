import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClerk, useUser } from "@clerk/react";

import { createForgeCloud, loadForgeProjects, type SyncState } from "@/lib/forge-cloud";
import { profileQueryOptions } from "@/lib/profile";
import { formatStudioLoadError } from "@/lib/studio-load-error";

const FORGE_VERSION = "4";
const FORGE_SCRIPTS = ["architect.js", "ai-provider.js", "generator.js", "testing.js", "sample-projects.js", "app.js"];

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Forge AI" },
      { name: "description", content: "Plan, generate, preview, and test custom business software with Forge AI." },
      { property: "og:title", content: "Studio — Forge AI" },
      { property: "og:description", content: "Plan, generate, preview, and test custom business software with Forge AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQueryOptions(context.user.id)),
  component: StudioPage,
});

function loadScript(src: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset["forge"] = "true";
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error("Could not load " + src));
    document.body.appendChild(script);
  });
}

function StudioPage() {
  const { user } = Route.useRouteContext();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const profile = Route.useLoaderData();
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [sync, setSync] = useState<{ state: SyncState; message?: string | undefined }>({ state: "saved" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const host = hostRef.current;
    let cancelled = false;
    const added: HTMLElement[] = [];
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `/forge/forge.css?v=${FORGE_VERSION}`;
    document.head.appendChild(link);
    added.push(link);

    (async () => {
      const [markup, projects] = await Promise.all([
        fetch(`/forge/workspace.html?v=${FORGE_VERSION}`).then((r) => {
          if (!r.ok) throw new Error("Could not load the Forge workspace.");
          return r.text();
        }),
        loadForgeProjects(),
      ]);
      if (cancelled || !host) return;
      host.innerHTML = markup;
      window.ForgeCloud = createForgeCloud(projects, (state, message) => setSync({ state, message }));
      for (const file of FORGE_SCRIPTS) {
        if (cancelled) return;
        added.push(await loadScript(`/forge/${file}?v=${FORGE_VERSION}`));
      }
      if (cancelled) return;
      setSlot(document.getElementById("forgeAccountSlot"));
      setStatus("ready");
    })().catch((error: unknown) => {
      if (cancelled) return;
      console.error("[forge] studio failed to load", error);
      setLoadError(formatStudioLoadError(error));
      setStatus("error");
    });

    const warn = (event: BeforeUnloadEvent) => {
      if (window.ForgeCloud?.hasPendingChanges()) {
        void window.ForgeCloud.flush();
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", warn);
      void window.ForgeCloud?.flush();
      added.forEach((node) => node.remove());
      if (host) host.innerHTML = "";
      setSlot(null);
    };
  }, [user.id]);

  async function signOut() {
    await window.ForgeCloud?.flush();
    await queryClient.cancelQueries();
    queryClient.clear();
    window.ForgeCloud = undefined;
    await clerkSignOut({ redirectUrl: "/" });
  }

  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? "";
  const name = clerkUser?.fullName || email || profile.companyName || "Your account";
  const syncLabel = sync.state === "saving" ? "SAVING…" : sync.state === "error" ? "NOT SAVED — RETRYING ON NEXT CHANGE" : "ALL CHANGES SAVED";

  return (
    <>
      {status === "loading" && (
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Opening your studio…
        </div>
      )}
      {status === "error" && (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
          <h1 className="text-xl font-semibold">Your studio didn't load</h1>
          <p className="max-w-md text-sm text-muted-foreground">{loadError}</p>
          <button className="text-sm text-primary underline" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}
      <div ref={hostRef} />
      {slot &&
        createPortal(
          <>
            <span className={`sync-state${sync.state === "error" ? " error" : ""}`} title={sync.message} role="status">
              {syncLabel}
            </span>
            <span className="account-name" title={email || undefined}>
              {name}
            </span>
            <a className="btn" href="/account" onClick={(e) => { e.preventDefault(); void navigate({ to: "/account" }); }}>
              Account
            </a>
            <button type="button" className="btn" onClick={() => void signOut()}>
              Sign out
            </button>
          </>,
          slot,
        )}
    </>
  );
}
