import { createFileRoute } from "@tanstack/react-router";

import { handleForgeProjects } from "@/server/forge-data";

export const Route = createFileRoute("/api/forge/projects")({
  server: {
    handlers: {
      GET: ({ request }) => handleForgeProjects(request),
      POST: ({ request }) => handleForgeProjects(request),
    },
  },
});
