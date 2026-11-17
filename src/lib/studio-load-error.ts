type SupabaseError = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function formatStudioLoadError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (!error || typeof error !== "object") {
    return typeof error === "string" && error.trim()
      ? error.trim()
      : "The studio could not load your saved projects.";
  }

  const supabaseError = error as SupabaseError;
  const message = text(supabaseError.message);
  const code = text(supabaseError.code);
  const normalized = message?.toLowerCase() ?? "";

  if (
    code === "PGRST205" ||
    (normalized.includes("could not find the table") && normalized.includes("forge_projects")) ||
    normalized.includes('relation "public.forge_projects" does not exist')
  ) {
    return "Forge project storage is missing from Supabase. The connected Lovable project needs its Forge database schema applied before Studio can load.";
  }

  if (code === "42501" || normalized.includes("row-level security")) {
    return "Supabase denied access to your saved projects. Check the Forge project table's user access policies.";
  }

  const details = text(supabaseError.details);
  const hint = text(supabaseError.hint);
  const parts = [message, code && `Code: ${code}`, details, hint].filter(Boolean);
  return parts.join(" · ") || "The studio could not load your saved projects.";
}
