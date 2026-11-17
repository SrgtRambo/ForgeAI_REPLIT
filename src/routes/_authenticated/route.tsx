import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getCurrentForgeUser } from "@/server/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getCurrentForgeUser();
    if (!user) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    return { user };
  },
  component: () => <Outlet />,
});
