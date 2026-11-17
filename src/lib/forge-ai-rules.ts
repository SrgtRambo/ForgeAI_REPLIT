// Pure request rules for the Forge AI chat route. Kept free of server imports so they can be unit tested.

export const FORGE_AI_LIMITS = {
  perMinute: 5,
  perDay: 30,
  maxMessages: 4,
  maxMessageChars: 24000,
  maxSchemaChars: 32000,
  minOutputTokens: 128,
  maxOutputTokens: 4096,
  defaultOutputTokens: 2048,
  // Reasoning tokens share the output budget, so add headroom on top of the visible-output limit.
  reasoningHeadroomTokens: 6000,
} as const;

export class ForgeRequestError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type ForgeChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ValidatedForgeChat = {
  instructions: string;
  messages: { role: "user" | "assistant"; content: string }[];
  schema: Record<string, unknown>;
  maxOutputTokens: number;
};

type JsonSchema = Record<string, unknown>;

const DROPPED_KEYWORDS = new Set([
  "minItems",
  "maxItems",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "pattern",
  "format",
  "default",
  "$schema",
]);

/** Convert a loose JSON schema into the strict form structured output requires. */
export function toStrictSchema(input: unknown): JsonSchema {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ForgeRequestError("A structured JSON response format is required.");
  }
  const source = input as JsonSchema;
  const out: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    if (DROPPED_KEYWORDS.has(key) || key === "required" || key === "additionalProperties") continue;
    if (key === "properties" && value && typeof value === "object") {
      out["properties"] = Object.fromEntries(
        Object.entries(value as JsonSchema).map(([name, child]) => [name, toStrictSchema(child)]),
      );
    } else if (key === "items") {
      out["items"] = toStrictSchema(value);
    } else {
      out[key] = value;
    }
  }
  // Strict mode can't enforce item counts, so state them for the model instead.
  const min = source["minItems"], max = source["maxItems"];
  if (typeof min === "number" || typeof max === "number") {
    const bound =
      typeof min === "number" && typeof max === "number"
        ? `Between ${min} and ${max} items.`
        : typeof max === "number"
          ? `At most ${max} items.`
          : `At least ${min} items.`;
    out["description"] = [typeof source["description"] === "string" ? source["description"] : "", bound].filter(Boolean).join(" ");
  }
  if (out["type"] === "object") {
    const properties = (out["properties"] as JsonSchema | undefined) ?? {};
    out["properties"] = properties;
    out["required"] = Object.keys(properties);
    out["additionalProperties"] = false;
  }
  return out;
}

export function validateForgeChat(payload: unknown): ValidatedForgeChat {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ForgeRequestError("Invalid model request.");
  }
  const body = payload as Record<string, unknown>;
  const rawMessages = body["messages"];
  if (
    !Array.isArray(rawMessages) ||
    rawMessages.length < 1 ||
    rawMessages.length > FORGE_AI_LIMITS.maxMessages
  ) {
    throw new ForgeRequestError("The model request has an invalid message list.");
  }
  const messages: ForgeChatMessage[] = rawMessages.map((message) => {
    const m = message as Record<string, unknown> | null;
    if (
      !m ||
      !["system", "user", "assistant"].includes(String(m["role"])) ||
      typeof m["content"] !== "string" ||
      m["content"].length > FORGE_AI_LIMITS.maxMessageChars
    ) {
      throw new ForgeRequestError("A model message is invalid or too long.");
    }
    return { role: m["role"] as ForgeChatMessage["role"], content: m["content"] };
  });
  const conversation = messages.filter(
    (m): m is { role: "user" | "assistant"; content: string } => m["role"] !== "system",
  );
  if (!conversation.length) throw new ForgeRequestError("The model request needs a user message.");

  const format = body["format"];
  if (!format || typeof format !== "object" || Array.isArray(format)) {
    throw new ForgeRequestError("A structured JSON response format is required.");
  }
  if (JSON.stringify(format).length > FORGE_AI_LIMITS.maxSchemaChars) {
    throw new ForgeRequestError("The response schema is too large.");
  }
  const schema = toStrictSchema(format);
  if (schema["type"] !== "object") throw new ForgeRequestError("The response schema must describe an object.");

  const requested =
    body["maxOutputTokens"] === undefined ? FORGE_AI_LIMITS.defaultOutputTokens : body["maxOutputTokens"];
  if (
    !Number.isInteger(requested) ||
    (requested as number) < FORGE_AI_LIMITS.minOutputTokens ||
    (requested as number) > FORGE_AI_LIMITS.maxOutputTokens
  ) {
    throw new ForgeRequestError("The model output limit must be between 128 and 4096 tokens.");
  }

  return {
    instructions: messages
      .filter((m) => m["role"] === "system")
      .map((m) => m["content"])
      .join("\n\n"),
    messages: conversation,
    schema,
    maxOutputTokens: (requested as number) + FORGE_AI_LIMITS.reasoningHeadroomTokens,
  };
}
