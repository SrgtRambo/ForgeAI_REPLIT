function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function formatStudioLoadError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (!error || typeof error !== "object") return "The studio could not load your saved projects.";

  const payload = error as Record<string, unknown>;
  const message = text(payload["message"]) ?? text(payload["error"]);
  const details = text(payload["details"]);
  const code = text(payload["code"]);
  return [message, code && `Code: ${code}`, details].filter(Boolean).join(" · ")
    || "The studio could not load your saved projects.";
}
