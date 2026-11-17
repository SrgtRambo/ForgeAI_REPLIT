import { describe, expect, it } from "vitest";

import { formatStudioLoadError } from "@/lib/studio-load-error";

describe("formatStudioLoadError", () => {
  it("preserves useful server error details", () => {
    expect(
      formatStudioLoadError({
        code: "DB_UNAVAILABLE",
        message: "Could not load saved projects",
        details: "The database is unavailable",
      }),
    ).toBe("Could not load saved projects · Code: DB_UNAVAILABLE · The database is unavailable");
  });

  it("uses an API error message instead of [object Object]", () => {
    expect(formatStudioLoadError({ error: "Your session expired." })).toBe("Your session expired.");
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
