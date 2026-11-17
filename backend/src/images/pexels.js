// Pexels stock image provider.
// https://www.pexels.com/api/

const ENDPOINT = 'https://api.pexels.com/v1/search';

const ORIENTATION_MAP = {
  landscape: 'landscape',
  portrait: 'portrait',
  square: 'square',
};

export function createPexelsProvider({ apiKey, timeoutMs = 10_000 }) {
  if (!apiKey) return null;

  async function search({ query, orientation, perPage = 10 }) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', String(perPage));
    if (ORIENTATION_MAP[orientation]) url.searchParams.set('orientation', ORIENTATION_MAP[orientation]);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: apiKey },
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) throw new Error(`Pexels ${response.status}`);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data.photos) ? data.photos : [];
    } finally {
      clearTimeout(timer);
    }
  }

  return { search };
}
