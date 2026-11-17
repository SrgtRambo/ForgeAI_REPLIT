// Image resolution: Unsplash first, Pexels second. Downloads the chosen photo
// and records credit metadata for assets/CREDITS.md.
// If no usable photo is found, returns a designed-placeholder result.
// Also handles customer uploads and URL-sourced images.

import sharp from 'sharp';

const MIN_WIDTH = 2000;
const DOWNLOAD_WIDTH = 1600;
const MAX_BYTES = 10 * 1024 * 1024;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateOrLoopback(hostname) {
  return PRIVATE_IP_RANGES.some((re) => re.test(hostname));
}

async function fetchWithRetry({ url, headers, timeoutMs = 10_000, retries = 2 }) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers, signal: controller.signal });
      if (RETRYABLE_STATUS.has(response.status)) {
        lastError = new Error(`${response.status} retryable`);
        await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 5000)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, Math.min(1000 * 2 ** attempt, 5000)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function downloadImage(url, destPath, { maxWidth = DOWNLOAD_WIDTH, quality = 82 }) {
  const response = await fetchWithRetry({ url });
  const contentType = response.headers.get('content-type') || '';
  if (!/image\/(jpeg|png|webp)/i.test(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    throw new Error(`Image too large: ${body.byteLength} bytes`);
  }
  await sharp(body)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality })
    .toFile(destPath);
  return { path: destPath, bytes: body.byteLength };
}

export function createImageResolver({ unsplash, pexels }) {
  async function resolveImage(slot) {
    const { id, query, aspect } = slot;
    const providers = [];
    if (unsplash) providers.push(unsplash);
    if (pexels) providers.push(pexels);

    let lastError = null;
    for (const provider of providers) {
      try {
        const results = await provider.search({ query, orientation: aspect });
        const usable = results.find((photo) => photo.width && photo.width >= MIN_WIDTH);
        if (usable) {
          return { provider, photo: usable };
        }
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    return { provider: null, photo: null, error: lastError };
  }

  return { resolveImage };
}

export async function resolveAndDownload({ slot, destPath, unsplash, pexels }) {
  const resolver = createImageResolver({ unsplash, pexels });
  const result = await resolver.resolveImage(slot);

  if (!result.photo) {
    return {
      slotId: slot.id,
      source: 'none',
      filePath: null,
      credit: { provider: 'none', photographer: '', photographerUrl: '', sourceUrl: '', license: 'designed placeholder' },
      placeholder: true,
      error: result.error,
    };
  }

  const photo = result.photo;
  const providerName = result.provider === unsplash ? 'unsplash' : 'pexels';

  let downloadUrl = null;
  if (providerName === 'unsplash') {
    downloadUrl = photo.urls?.full || photo.urls?.regular;
    await unsplash.downloadLocation(photo);
  } else {
    downloadUrl = photo.src?.large || photo.src?.original;
  }

  if (!downloadUrl) {
    return { slotId: slot.id, source: 'none', filePath: null, credit: {}, placeholder: true };
  }

  await downloadImage(downloadUrl, destPath);

  const credit =
    providerName === 'unsplash'
      ? {
          provider: 'Unsplash',
          photographer: photo.user?.name || 'Unknown',
          photographerUrl: photo.user?.links?.html || '',
          sourceUrl: photo.links?.html || downloadUrl,
          license: 'Unsplash License',
        }
      : {
          provider: 'Pexels',
          photographer: photo.photographer || 'Unknown',
          photographerUrl: `https://www.pexels.com/@${photo.photographer?.toLowerCase()?.replace(/\s+/g, '-')}`,
          sourceUrl: photo.url || downloadUrl,
          license: 'Pexels License',
        };

  return {
    slotId: slot.id,
    source: 'stock',
    filePath: destPath,
    credit,
    placeholder: false,
  };
}

/** Process a customer-uploaded image buffer: re-encode to JPEG, strip EXIF. */
export async function processUpload(buffer, destPath, { maxWidth = DOWNLOAD_WIDTH, quality = 82 } = {}) {
  const metadata = await sharp(buffer).metadata();
  if (!/jpeg|png|webp/.test(metadata.format)) {
    throw new Error(`Unsupported image format: ${metadata.format}`);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(`Image too large: ${buffer.byteLength} bytes`);
  }
  await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality })
    .toFile(destPath);
  return { path: destPath, source: 'upload', credit: { provider: 'customer', photographer: 'Provided by customer', photographerUrl: '', sourceUrl: '', license: 'Customer upload' } };
}

/** Process an image from a URL: fetch with validation, reject private/loopback IPs, re-encode. */
export async function processImageUrl(imageUrl, destPath, { maxWidth = DOWNLOAD_WIDTH, quality = 82 } = {}) {
  const parsed = new URL(imageUrl);
  if (isPrivateOrLoopback(parsed.hostname)) {
    throw new Error('Private or loopback addresses are not allowed.');
  }

  const response = await fetchWithRetry({ url: imageUrl });
  const contentType = response.headers.get('content-type') || '';
  if (!isAcceptableImageType(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    throw new Error(`Image too large: ${body.byteLength} bytes`);
  }

  await sharp(body)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality })
    .toFile(destPath);

  return {
    path: destPath,
    source: 'url',
    credit: { provider: 'url', photographer: '', photographerUrl: '', sourceUrl: imageUrl, license: 'Customer-provided URL' },
  };
}

export function isPrivateAddress(hostname) {
  return isPrivateOrLoopback(hostname);
}

export function isAcceptableImageType(contentType) {
  return /image\/(jpeg|png|webp)/i.test(contentType ?? '');
}

export { MAX_BYTES };
