import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@clerk/react";

import heroImage from "@/assets/forge-hero.jpg";
import { ForgeLogo } from "@/components/forge-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge AI — custom software your company is missing" },
      {
        name: "description",
        content:
          "Describe your business problem and Forge AI designs, builds, and tests a custom app for it. Your projects stay private to your account.",
      },
      { property: "og:title", content: "Forge AI — custom software your company is missing" },
      {
        property: "og:description",
        content: "Describe your business problem and Forge AI designs, builds, and tests a custom app for it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  { n: "01", title: "Discovery", body: "Answer a few questions about how your business runs today. Forge AI asks smart follow-ups." },
  { n: "02", title: "Architecture", body: "Review a blueprint of screens, data, and workflows before anything is built." },
  { n: "03", title: "Generate", body: "Forge AI writes the app — page, styling, and behavior — and opens a live preview." },
  { n: "04", title: "Test & ship", body: "Built-in checks catch common problems. Download the project when you're happy." },
];

function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = isLoaded && isSignedIn;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <ForgeLogo />
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/account">Account</Link>
              </Button>
              <Button asChild variant="forge" size="sm">
                <Link to="/studio">Open studio</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild variant="forge" size="sm">
                <Link to="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={heroImage} alt="" width={1536} height={1024} className="h-full w-full object-cover opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>
          <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-16 sm:pt-28">
            <p className="animate-rise text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground">
              Your AI software studio
            </p>
            <h1 className="animate-rise mt-4 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
              Forge the software <span className="text-ember">your company is missing.</span>
            </h1>
            <p className="animate-rise mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              Describe the problem. Forge AI plans, builds, and tests a custom app around the way your team actually works — no
              developers required.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap gap-3">
              <Button asChild variant="forge" size="xl">
                {signedIn ? <Link to="/studio">Open your studio →</Link> : <Link to="/sign-up">Start building free →</Link>}
              </Button>
              {!signedIn && (
                <Button asChild variant="outline" size="xl">
                  <Link to="/sign-in">I have an account</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <article key={step.n} className="bg-card p-6">
                <span className="font-mono text-xs text-primary">{step.n}</span>
                <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Private by default", "Every project is tied to your account. No one else can see or change it."],
              ["Saved automatically", "Requirements, blueprints, source, and version history sync as you work."],
              ["Yours to keep", "Download any project as a ZIP and run it anywhere — no lock-in."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-border bg-card/60 p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Forge AI
      </footer>
    </div>
  );
}
