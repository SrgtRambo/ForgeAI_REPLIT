import { describe, expect, it } from "vitest";

import { FORGE_AI_LIMITS, toStrictSchema, validateForgeChat } from "@/lib/forge-ai-rules";
import { safeRedirect } from "@/lib/safe-redirect";

const schema = { type: "object", required: ["content"], properties: { content: { type: "string" } } };
const user = { role: "user", content: "hello" };

describe("Forge AI request rules", () => {
  it("allows 5 AI requests per minute and 30 per day per user", () => {
    expect(FORGE_AI_LIMITS.perMinute).toBe(5);
    expect(FORGE_AI_LIMITS.perDay).toBe(30);
  });

  it("rejects more than 4 messages", () => {
    expect(() => validateForgeChat({ format: schema, messages: Array(5).fill(user) })).toThrow(/message list/);
  });

  it("rejects a message longer than 24,000 characters", () => {
    expect(() =>
      validateForgeChat({ format: schema, messages: [{ role: "user", content: "x".repeat(24001) }] }),
    ).toThrow(/too long/);
  });

  it("rejects output limits outside 128–4096 tokens", () => {
    expect(() => validateForgeChat({ format: schema, messages: [user], maxOutputTokens: 5000 })).toThrow();
    expect(() => validateForgeChat({ format: schema, messages: [user], maxOutputTokens: 100 })).toThrow();
  });

  it("moves system messages into instructions", () => {
    const result = validateForgeChat({ format: schema, messages: [{ role: "system", content: "be brief" }, user] });
    expect(result.instructions).toBe("be brief");
    expect(result.messages).toEqual([user]);
  });

  it("makes every object property required and closes objects", () => {
    const strict = toStrictSchema({
      type: "object",
      required: ["a"],
      properties: { a: { type: "string" }, b: { type: "array", maxItems: 3, items: { type: "object", properties: { c: { type: "string" } } } } },
    });
    expect(strict["required"]).toEqual(["a", "b"]);
    expect(strict["additionalProperties"]).toBe(false);
    const b = (strict["properties"] as Record<string, Record<string, unknown>>)["b"]!;
    expect(b["maxItems"]).toBeUndefined();
    expect(b["description"]).toBe("At most 3 items.");
    expect((b["items"] as Record<string, unknown>)["additionalProperties"]).toBe(false);
  });
});

describe("sign-in redirect", () => {
  it("only allows same-site paths", () => {
    expect(safeRedirect("/account")).toBe("/account");
    expect(safeRedirect("https://evil.example")).toBe("/studio");
    expect(safeRedirect("//evil.example")).toBe("/studio");
    expect(safeRedirect(undefined)).toBe("/studio");
  });
});
