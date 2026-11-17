type WindowState = { count: number; resetAt: number };

const windows = new Map<string, WindowState>();

export function consumeRequestLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  let state = windows.get(key);

  if (!state || state.resetAt <= now) {
    state = { count: 0, resetAt: now + windowMs };
    windows.set(key, state);
  }

  state.count += 1;

  if (windows.size > 10_000) {
    for (const [entryKey, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(entryKey);
    }
  }

  return {
    allowed: state.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
  };
}
