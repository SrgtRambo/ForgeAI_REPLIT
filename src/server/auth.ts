import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";

export const getCurrentForgeUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth();
  return session.userId ? { id: session.userId } : null;
});
