import { SignIn, SignUp } from "@clerk/tanstack-react-start";

import { ForgeLogo } from "@/components/forge-logo";
import { safeRedirect } from "@/lib/safe-redirect";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background bg-forge-glow">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
        <ForgeLogo />
        <main className="my-auto animate-rise py-10">{children}</main>
        <p className="text-center text-xs text-muted-foreground">
          Your projects are private to your account.{" "}
          <a href="/" className="underline hover:text-foreground">Learn more</a>
        </p>
      </div>
    </div>
  );
}

export function ForgeSignInPage({ redirect }: { redirect?: string }) {
  const destination = `${basePath}${safeRedirect(redirect)}`;
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={destination}
      />
    </AuthShell>
  );
}

export function ForgeSignUpPage({ redirect }: { redirect?: string }) {
  const destination = `${basePath}${safeRedirect(redirect)}`;
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={destination}
      />
    </AuthShell>
  );
}
