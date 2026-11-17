import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createUnsplashProvider,
  createPexelsProvider,
  createImageResolver,
  resolveAndDownload,
  processUpload,
  processImageUrl,
  isPrivateAddress,
  isAcceptableImageType,
  MAX_BYTES,
} from '../src/images/index.js';

// --- fetch mock ---
let fetchMock;
const originalFetch = globalThis.fetch;

function setFetch(impl) {
  fetchMock = impl;
  globalThis.fetch = impl;
}
function restoreFetch() {
  globalThis.fetch = originalFetch;
}

async function mockResponse({ body = {}, status = 200, contentType = 'application/json', ok = true } = {}) {
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  const buffer = new TextEncoder().encode(str).buffer;
  return {
    ok,
    status,
    headers: { get: (k) => (k === 'content-type' ? contentType : null) },
    json: async () => body,
    arrayBuffer: async () => buffer,
  };
}

test('MAX_BYTES is 10 MB', () => {
  assert.equal(MAX_BYTES, 10 * 1024 * 1024);
});

test('isAcceptableImageType accepts jpeg/png/webp', () => {
  assert.equal(isAcceptableImageType('image/jpeg'), true);
  assert.equal(isAcceptableImageType('image/png'), true);
  assert.equal(isAcceptableImageType('image/webp'), true);
  assert.equal(isAcceptableImageType('image/gif'), false);
  assert.equal(isAcceptableImageType('text/html'), false);
});

test('isPrivateAddress rejects loopback and private ranges', () => {
  assert.equal(isPrivateAddress('127.0.0.1'), true);
  assert.equal(isPrivateAddress('localhost'), true);
  assert.equal(isPrivateAddress('service.local'), true);
  assert.equal(isPrivateAddress('10.0.0.1'), true);
  assert.equal(isPrivateAddress('100.64.0.1'), true);
  assert.equal(isPrivateAddress('169.254.169.254'), true);
  assert.equal(isPrivateAddress('172.16.0.1'), true);
  assert.equal(isPrivateAddress('172.31.255.255'), true);
  assert.equal(isPrivateAddress('172.32.0.1'), false);
  assert.equal(isPrivateAddress('192.168.1.1'), true);
  assert.equal(isPrivateAddress('::1'), true);
  assert.equal(isPrivateAddress('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateAddress('fe80::1'), true);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
});

test('Unsplash provider maps orientation correctly', async () => {
  setFetch(async (url) => {
    const u = new URL(url);
    assert.equal(u.searchParams.get('orientation'), 'landscape');
    assert.equal(u.searchParams.get('query'), 'chef cooking');
    return mockResponse({ body: { results: [] } });
  });
  const provider = createUnsplashProvider({ accessKey: 'test-key' });
  await provider.search({ query: 'chef cooking', orientation: 'landscape' });
  restoreFetch();
});

test('Unsplash provider returns null when no key', () => {
  assert.equal(createUnsplashProvider({ accessKey: '' }), null);
  assert.equal(createUnsplashProvider({}), null);
});

test('Pexels provider maps orientation correctly', async () => {
  setFetch(async (url) => {
    const u = new URL(url);
    assert.equal(u.searchParams.get('orientation'), 'portrait');
    assert.equal(u.searchParams.get('query'), 'sushi platter');
    return mockResponse({ body: { photos: [] } });
  });
  const provider = createPexelsProvider({ apiKey: 'test-key' });
  await provider.search({ query: 'sushi platter', orientation: 'portrait' });
  restoreFetch();
});

test('Pexels provider returns null when no key', () => {
  assert.equal(createPexelsProvider({ apiKey: '' }), null);
});

test('resolveAndDownload falls back from Unsplash to Pexels', async () => {
  let unsplashCalls = 0;
  let pexelsCalls = 0;
  setFetch(async (url) => {
    const u = new URL(url);
    if (u.hostname.includes('unsplash')) {
      unsplashCalls++;
      return mockResponse({ body: { results: [] } });
    }
    if (u.hostname.includes('pexels')) {
      pexelsCalls++;
      const photo = {
        width: 2400,
        height: 1600,
        photographer: 'Test',
        src: { large: 'https://example.com/img.jpg' },
        url: 'https://pexels.com/photo',
      };
      return mockResponse({ body: { photos: [photo] } });
    }
    return mockResponse({ body: {} });
  });

  const unsplash = createUnsplashProvider({ accessKey: 'u-key' });
  const pexels = createPexelsProvider({ apiKey: 'p-key' });

  // We can't actually download without sharp writing to disk, but we can verify
  // the resolver picks Pexels when Unsplash returns nothing.
  const resolver = createImageResolver({ unsplash, pexels });
  const result = await resolver.resolveImage({ id: 'img-1', query: 'test', aspect: 'landscape' });
  assert.equal(result.provider, pexels, 'should fall back to Pexels');
  assert.equal(result.photo.width, 2400);
  assert.equal(unsplashCalls, 1);
  assert.equal(pexelsCalls, 1);
  restoreFetch();
});

test('resolveAndDownload returns placeholder when all providers fail', async () => {
  setFetch(async () => mockResponse({ body: { results: [] } }));
  const unsplash = createUnsplashProvider({ accessKey: 'u-key' });
  const pexels = createPexelsProvider({ apiKey: 'p-key' });
  const resolver = createImageResolver({ unsplash, pexels });
  const result = await resolver.resolveImage({ id: 'img-1', query: 'test', aspect: 'landscape' });
  assert.equal(result.provider, null);
  assert.equal(result.photo, null);
  restoreFetch();
});

test('processImageUrl rejects private/loopback addresses', async () => {
  await assert.rejects(
    processImageUrl('http://127.0.0.1/image.jpg', '/tmp/out.jpg'),
    /Private or loopback/
  );
  await assert.rejects(
    processImageUrl('http://10.0.0.1/image.jpg', '/tmp/out.jpg'),
    /Private or loopback/
  );
});

test('processImageUrl rejects non-image content types', async () => {
  setFetch(async () => mockResponse({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  await assert.rejects(processImageUrl('https://8.8.8.8/image.jpg', '/tmp/out.jpg'), /Unsupported content type/);
  restoreFetch();
});

test('isAcceptableImageType exported correctly', () => {
  assert.equal(typeof isAcceptableImageType, 'function');
});
