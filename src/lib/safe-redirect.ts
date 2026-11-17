/** Only allow same-origin relative paths as post-sign-in destinations. */
export function safeRedirect(value: unknown, fallback = "/studio"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/^\/(?:auth|sign-in|sign-up)(?:\/|$)/.test(value)) return fallback;
  return value;
}
