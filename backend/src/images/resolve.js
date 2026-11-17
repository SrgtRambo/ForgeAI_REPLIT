// Image resolution: Unsplash first, Pexels second. Downloads the chosen photo
// and records credit metadata for assets/CREDITS.md.
// If no usable photo is found, returns a designed-placeholder result.
// Also handles customer uploads and URL-sourced images.

import sharp from 'sharp';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MIN_WIDTH = 2000;
const DOWNLOAD_WIDTH = 1600;
const MAX_BYTES = 10 * 1024 * 1024;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const PRIVATE_IPV4_CIDRS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

function ipv4Number(address) {
  if (isIP(address) !== 4) return null;
  return address.split('.').reduce((value, part) => (value << 8n) | BigInt(part), 0n);
}

function inIpv4Range(address, base, prefix) {
  const value = ipv4Number(address);
  const network = ipv4Number(base);
  if (value === null || network === null) return false;
  const shift = BigInt(32 - prefix);
  return (value >> shift) === (network >> shift);
}

function ipv6Number(address) {
  let value = address.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':');
    const v4 = ipv4Number(value.slice(lastColon + 1));
    if (v4 === null) return null;
    value = `${value.slice(0, lastColon)}:${((v4 >> 16n) & 0xffffn).toString(16)}:${(v4 & 0xffffn).toString(16)}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return groups.reduce((result, group) => (result << 16n) | BigInt(`0x${group}`), 0n);
}

function isPrivateIpv6(address) {
  const value = ipv6Number(address);
  if (value === null) return true;
  const inRange = (base, prefix) => {
    const network = ipv6Number(base);
    return network !== null && (value >> BigInt(128 - prefix)) === (network >> BigInt(128 - prefix));
  };
  if (inRange('::', 128) || inRange('::1', 128)) return true;
  if (inRange('fc00::', 7) || inRange('fe80::', 10) || inRange('fec0::', 10) || inRange('ff00::', 8)) return true;
  if (inRange('2001::', 23) || inRange('2001:db8::', 32) || inRange('2002::', 16) ||
    inRange('64:ff9b::', 96) || inRange('64:ff9b:1::', 48)) return true;
  if (inRange('::ffff:0:0', 96)) {
    const mappedV4 = Number(value & 0xffffffffn);
    const addressV4 = [24n, 16n, 8n, 0n].map((shift) => String((BigInt(mappedV4) >> shift) & 255n)).join('.');
    return PRIVATE_IPV4_CIDRS.some(([base, prefix]) => inRangeV4(addressV4, base, prefix));
  }
  return false;
}

function inRangeV4(address, base, prefix) {
  return inIpv4Range(address, base, prefix);
}

function isPrivateOrLoopback(hostname) {
  const host = String(hostname).toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    host.endsWith('.internal') || host.endsWith('.test')) return true;
  if (isIP(host) === 4) return PRIVATE_IPV4_CIDRS.some(([base, prefix]) => inIpv4Range(host, base, prefix));
  if (isIP(host) === 6) return isPrivateIpv6(host);
  return false;
}

async function validatePublicImageUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('A valid public image URL is required.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only public HTTP or HTTPS image URLs are allowed.');
  }
  const allowedPort = parsed.protocol === 'http:' ? '80' : '443';
  if (parsed.port && parsed.port !== allowedPort) {
    throw new Error('Image URLs must use the standard HTTP or HTTPS port.');
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (isPrivateOrLoopback(host)) throw new Error('Private or loopback addresses are not allowed.');
  if (!isIP(host)) {
    let addresses;
    try {
      addresses = await lookup(host, { all: true, verbatim: true });
    } catch {
      throw new Error('The image host could not be resolved.');
    }
    if (!addresses.length || addresses.some((entry) => isPrivateOrLoopback(entry.address))) {
      throw new Error('Private or loopback addresses are not allowed.');
    }
  }
  return parsed;
}

async function fetchPublicImage(value, maxRedirects = 3) {
  let parsed = await validatePublicImageUrl(value);
  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const response = await fetch(parsed, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'image/jpeg,image/png,image/webp' },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location || redirect === maxRedirects) throw new Error('Image URL redirected too many times.');
    parsed = await validatePublicImageUrl(new URL(location, parsed).toString());
  }
  throw new Error('Image URL redirected too many times.');
}

async function readLimitedBody(response) {
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BYTES) {
    throw new Error(`Image too large: more than ${MAX_BYTES} bytes`);
  }
  if (!response.body?.getReader) {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > MAX_BYTES) throw new Error(`Image too large: ${body.byteLength} bytes`);
    return body;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`Image too large: more than ${MAX_BYTES} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
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
  const response = await fetchPublicImage(url);
  if (!response.ok) throw new Error(`Image server returned ${response.status}.`);
  const contentType = response.headers.get('content-type') || '';
  if (!/image\/(jpeg|png|webp)/i.test(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
  const body = await readLimitedBody(response);
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
  if (!Buffer.isBuffer(buffer) || buffer.byteLength > MAX_BYTES) {
    throw new Error(`Image too large: more than ${MAX_BYTES} bytes`);
  }
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
  const response = await fetchPublicImage(imageUrl);
  if (!response.ok) throw new Error(`Image server returned ${response.status}.`);
  const contentType = response.headers.get('content-type') || '';
  if (!isAcceptableImageType(contentType)) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const body = await readLimitedBody(response);

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
  return /^image\/(jpeg|png|webp)(?:\s*;|$)/i.test(contentType ?? '');
}

export { MAX_BYTES };
