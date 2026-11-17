// Minimal OpenRouter chat client with timeouts and retries on transient failures.

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export class ModelError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createOpenRouterChat({ apiKey, referer = 'https://forgeai.app', title = 'Forge AI', timeoutMs = 180_000, retries = 3 }) {
  return async function chat({ model, messages, maxTokens, json = false, temperature = 0.4, signal }) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (signal?.aborted) throw new ModelError('Request was cancelled.', 499);
      if (attempt) await sleep(Math.min(2000 * 2 ** (attempt - 1), 15_000));
      let response;
      try {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
        response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': referer,
            'X-Title': title,
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(json ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: requestSignal,
        });
      } catch (error) {
        if (signal?.aborted) throw new ModelError('Request was cancelled.', 499);
        lastError = new ModelError(`Could not reach OpenRouter: ${error.message}`, 0);
        continue;
      }
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);
        lastError = new ModelError(`OpenRouter returned ${response.status}: ${detail}`, response.status);
        if (RETRYABLE.has(response.status)) continue;
        throw lastError;
      }
      const data = await response.json();
      if (data?.error) {
        lastError = new ModelError(`OpenRouter error: ${data.error.message ?? 'unknown'}`, data.error.code ?? 502);
        continue;
      }
      const choice = data?.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== 'string') {
        lastError = new ModelError('OpenRouter returned an empty reply.', 502);
        continue;
      }
      return { content, finishReason: choice.finish_reason ?? 'stop' };
    }
    throw lastError;
  };
}
