// Helpers for cleaning model output.

/** Removes a single surrounding Markdown code fence, if the model added one. */
export function stripCodeFence(text) {
  const str = String(text ?? '');
  const match = str.match(/^\s*```[\w.+-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```\s*$/);
  if (match) return match[1];
  return str.replace(/^\s*```[\w.+-]*[ \t]*\r?\n/, '').replace(/\r?\n?```\s*$/, '');
}

/** Parses the first JSON object in a model reply, tolerating fences and stray prose. */
export function extractJson(text) {
  const cleaned = stripCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) throw new SyntaxError('The model reply did not contain a JSON object.');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}
