// Bridges the Forge workspace scripts to the signed-in user's private project storage.

type ForgeProject = { id: string; name?: string; stage?: string; [key: string]: unknown };
export type SyncState = "saved" | "saving" | "error";

export interface ForgeCloudBridge {
  initialProjects: ForgeProject[];
  sync: (projects: ForgeProject[]) => void;
  flush: () => Promise<void>;
  hasPendingChanges: () => boolean;
}

declare global {
  interface Window {
    ForgeCloud?: ForgeCloudBridge | undefined;
  }
}

export async function loadForgeProjects(): Promise<ForgeProject[]> {
  const response = await fetch("/api/forge/projects", { credentials: "same-origin" });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !Array.isArray(result.projects)) {
    throw new Error(result?.error || "Could not load your Forge projects.");
  }
  return result.projects as ForgeProject[];
}

export function createForgeCloud(
  initialProjects: ForgeProject[],
  onState: (state: SyncState, message?: string) => void,
): ForgeCloudBridge {
  const saved = new Map<string, string>();
  initialProjects.forEach((project) => saved.set(project.id, JSON.stringify(project)));
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> = Promise.resolve();

  async function push(serialized: string) {
    const list = JSON.parse(serialized) as ForgeProject[];
    const seen = new Set<string>();
    const upserts: Array<{ id: string; name: string; stage: string; data: ForgeProject }> = [];
    for (const project of list) {
      if (!project || typeof project.id !== "string") continue;
      seen.add(project.id);
      const text = JSON.stringify(project);
      if (saved.get(project.id) === text) continue;
      upserts.push({
        id: project.id,
        name: String(project.name ?? "Untitled project").slice(0, 200),
        stage: String(project.stage ?? "").slice(0, 80),
        data: project,
      });
    }
    const removed = [...saved.keys()].filter((id) => !seen.has(id));
    if (!upserts.length && !removed.length) return;
    const response = await fetch("/api/forge/projects", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ upserts, removed }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error(result?.error || "Could not save your Forge projects.");
    for (const row of upserts) saved.set(row.id, JSON.stringify(row.data));
    removed.forEach((id) => saved.delete(id));
  }

  function flush() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const next = pending;
    pending = null;
    if (next === null) return running;
    running = running
      .then(() => push(next))
      .then(() => {
        if (pending === null) onState("saved");
      })
      .catch((error: unknown) => {
        console.error("[forge] save failed", error);
        if (pending === null) pending = next;
        onState("error", error instanceof Error ? error.message : "Unknown error");
      });
    return running;
  }

  return {
    initialProjects,
    sync(projects) {
      pending = JSON.stringify(projects);
      onState("saving");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), 700);
    },
    flush,
    hasPendingChanges: () => pending !== null,
  };
}
