import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const backendApiPaths = [
  "/api/site",
  "/api/catalog",
  "/api/checkout",
  "/api/generate-free",
  "/api/purchases",
  "/api/stripe",
  "/api/__clerk",
];

function isBackendApiPath(pathname: string) {
  return backendApiPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

async function proxyBackendRequest(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const backendOrigin = (process.env["FORGE_BACKEND_URL"] || "http://127.0.0.1:3001").replace(/\/$/, "");
  const target = new URL(`${incoming.pathname}${incoming.search}`, backendOrigin);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.set("accept-encoding", "identity");
  headers.set("x-forwarded-host", request.headers.get("x-forwarded-host") || incoming.host);
  headers.set("x-forwarded-proto", request.headers.get("x-forwarded-proto") || incoming.protocol.slice(0, -1));

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : request.body;
  const timeout = incoming.pathname.startsWith("/api/site/") ? 240_000 : 30_000;
  const init = {
    method: request.method,
    headers,
    body,
    redirect: "manual" as const,
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeout)]),
    ...(body ? { duplex: "half" as const } : {}),
  } as RequestInit;

  return fetch(target, init);
}

// Hosting compresses every response at the edge. Never compress a body (gzip, brotli,
// CompressionStream) or set content-encoding here or in a server route: the body gets encoded
// twice and renders garbled.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (isBackendApiPath(url.pathname)) {
        return await proxyBackendRequest(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
