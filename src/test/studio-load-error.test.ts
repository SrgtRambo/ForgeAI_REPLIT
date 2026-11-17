import { describe, expect, it } from "vitest";

import { formatStudioLoadError } from "@/lib/studio-load-error";

describe("formatStudioLoadError", () => {
  it("explains when the Forge projects table is missing", () => {
    expect(
      formatStudioLoadError({
        code: "PGRST205",
        message: "Could not find the table 'public.forge_projects' in the schema cache",
      }),
    ).toContain("Forge project storage is missing from Supabase");
  });

  it("shows useful Supabase error details instead of [object Object]", () => {
    expect(
      formatStudioLoadError({
        code: "XX000",
        message: "Request failed",
        details: "The database is unavailable",
      }),
    ).toBe("Request failed · Code: XX000 · The database is unavailable");
  });

  it("preserves ordinary error messages", () => {
    expect(formatStudioLoadError(new Error("Could not load the Forge workspace."))).toBe(
      "Could not load the Forge workspace.",
    );
  });

  it("uses a safe fallback for unknown values", () => {
    expect(formatStudioLoadError({})).toBe("The studio could not load your saved projects.");
  });
});
