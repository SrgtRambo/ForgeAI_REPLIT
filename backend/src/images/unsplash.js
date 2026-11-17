// Unsplash stock image provider.
// https://unsplash.com/developers

const ENDPOINT = 'https://api.unsplash.com/search/photos';

const ORIENTATION_MAP = {
  landscape: 'landscape',
  portrait: 'portrait',
  square: 'squarish',
};

export function createUnsplashProvider({ accessKey, timeoutMs = 10_000 }) {
  if (!accessKey) return null;

  async function search({ query, orientation, perPage = 10 }) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', String(perPage));
    if (ORIENTATION_MAP[orientation]) url.searchParams.set('orientation', ORIENTATION_MAP[orientation]);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) throw new Error(`Unsplash ${response.status}`);
        return [];
      }
      const data = await response.json();
      return Array.isArray(data.results) ? data.results : [];
    } finally {
      clearTimeout(timer);
    }
  }

  async function downloadLocation(photo) {
    const url = photo.links?.download_location;
    if (!url) return null;
    try {
      await fetch(`${url}?client_id=${accessKey}`);
    } catch {
      // Best-effort: Unsplash requires this hit but we don't need the result.
    }
  }

  return { search, downloadLocation };
}
