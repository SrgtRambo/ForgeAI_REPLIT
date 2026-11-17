import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@clerk/tanstack-react-start/server";

import { forgeProjects, profiles } from "../../drizzle/schema";
import { getDb } from "./db";
import { readJsonBody, RequestBodyError } from "./request-body";
import { consumeRequestLimit } from "./request-limits";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const MAX_PROJECT_SYNC_BYTES = 12 * 1024 * 1024;
const MAX_PROJECT_BYTES = 7_500_000;

function json(status: number, value: unknown) {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

async function currentUserId() {
  const session = await auth();
  return session.userId;
}

function limited(userId: string, route: string, limit: number) {
  const result = consumeRequestLimit(`${route}:${userId}`, limit, 60_000);
  return result.allowed ? null : json(429, { error: "Too many requests. Wait a moment and try again.", retryAfterSeconds: result.retryAfterSeconds });
}

function bodyErrorResponse(error: unknown) {
  if (error instanceof RequestBodyError) return json(error.status, { error: error.message });
  return json(400, { error: "Request body must be valid JSON." });
}

export async function handleForgeProfile(request: Request) {
  const userId = await currentUserId();
  if (!userId) return json(401, { error: "Sign in to view your account." });

  if (request.method === "GET") {
    const rateLimit = limited(userId, "profile-read", 120);
    if (rateLimit) return rateLimit;
    const db = getDb();
    await db.insert(profiles).values({ userId }).onConflictDoNothing();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return json(200, { id: userId, companyName: profile?.companyName ?? "" });
  }

  if (request.method !== "PUT") return json(405, { error: "Method not allowed." });
  const rateLimit = limited(userId, "profile-write", 20);
  if (rateLimit) return rateLimit;

  let body: unknown;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    return bodyErrorResponse(error);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "Profile details are invalid." });
  }
  const companyName = (body as Record<string, unknown>)["companyName"];
  if (typeof companyName !== "string" || companyName.length > 160) {
    return json(400, { error: "Company name must be 160 characters or fewer." });
  }

  const normalizedCompanyName = companyName.trim();
  const db = getDb();
  await db
    .insert(profiles)
    .values({ userId, companyName: normalizedCompanyName })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { companyName: normalizedCompanyName, updatedAt: new Date() },
    });
  return json(200, { id: userId, companyName: normalizedCompanyName });
}

export async function handleForgeProjects(request: Request) {
  const userId = await currentUserId();
  if (!userId) return json(401, { error: "Sign in to access your Forge projects." });

  if (request.method === "GET") {
    const rateLimit = limited(userId, "projects-read", 120);
    if (rateLimit) return rateLimit;
    const rows = await getDb()
      .select({ data: forgeProjects.data })
      .from(forgeProjects)
      .where(eq(forgeProjects.userId, userId))
      .orderBy(desc(forgeProjects.updatedAt))
      .limit(500);
    return json(200, { projects: rows.map((row) => row.data) });
  }

  if (request.method !== "POST") return json(405, { error: "Method not allowed." });
  const rateLimit = limited(userId, "projects-sync", 60);
  if (rateLimit) return rateLimit;

  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_PROJECT_SYNC_BYTES);
  } catch (error) {
    return bodyErrorResponse(error);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(400, { error: "Project changes are invalid." });
  }

  const payload = body as Record<string, unknown>;
  const rawUpserts = payload["upserts"];
  const rawRemoved = payload["removed"];
  if (!Array.isArray(rawUpserts) || !Array.isArray(rawRemoved) || rawUpserts.length > 100 || rawRemoved.length > 500) {
    return json(400, { error: "Project changes exceed the allowed limits." });
  }

  const upserts: Array<{ projectId: string; name: string; stage: string; data: Record<string, unknown> }> = [];
  const changedIds = new Set<string>();

  for (const item of rawUpserts) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return json(400, { error: "A project change is invalid." });
    }
    const project = item as Record<string, unknown>;
    const id = project["id"];
    const name = project["name"];
    const stage = project["stage"];
    if (typeof id !== "string" || id.length < 1 || id.length > 120 || changedIds.has(id)) {
      return json(400, { error: "A project identifier is invalid or duplicated." });
    }
    if (project["data"] === null || typeof project["data"] !== "object" || Array.isArray(project["data"])) {
      return json(400, { error: "Project data must be a JSON object." });
    }
    const serialized = JSON.stringify(project["data"]);
    if (new TextEncoder().encode(serialized).byteLength > MAX_PROJECT_BYTES) {
      return json(413, { error: "A project is too large to save." });
    }

    changedIds.add(id);
    upserts.push({
      projectId: id,
      name: typeof name === "string" ? name.slice(0, 200) : "Untitled project",
      stage: typeof stage === "string" ? stage.slice(0, 80) : "",
      data: project["data"] as Record<string, unknown>,
    });
  }

  const removed = rawRemoved.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 120);
  if (removed.length !== rawRemoved.length || new Set(removed).size !== removed.length || removed.some((id) => changedIds.has(id))) {
    return json(400, { error: "A removed project identifier is invalid or duplicated." });
  }

  await getDb().transaction(async (tx) => {
    if (upserts.length) {
      await tx
        .insert(forgeProjects)
        .values(upserts.map((project) => ({
          userId,
          projectId: project.projectId,
          name: project.name,
          stage: project.stage,
          data: project.data,
        })))
        .onConflictDoUpdate({
          target: [forgeProjects.userId, forgeProjects.projectId],
          set: {
            name: sql`excluded.name`,
            stage: sql`excluded.stage`,
            data: sql`excluded.data`,
            updatedAt: new Date(),
          },
        });
    }
    if (removed.length) {
      await tx
        .delete(forgeProjects)
        .where(and(eq(forgeProjects.userId, userId), inArray(forgeProjects.projectId, removed)));
    }
  });

  return json(200, { saved: upserts.length, removed: removed.length });
}
