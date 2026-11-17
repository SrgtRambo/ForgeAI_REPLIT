import { createFileRoute } from "@tanstack/react-router";

import { handleForgeProfile } from "@/server/forge-data";

export const Route = createFileRoute("/api/forge/profile")({
  server: {
    handlers: {
      GET: ({ request }) => handleForgeProfile(request),
      PUT: ({ request }) => handleForgeProfile(request),
    },
  },
});
