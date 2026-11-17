import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/server.js';

function fakeDb(rows = {}) {
  let nextId = 0;
  return {
    db: {
      async createPurchase(values) {
        const id = `p${++nextId}`;
        rows[id] = { ...values, id, status: values.status, progress: 0, created_at: new Date().toISOString() };
        return { id };
      },
      async attachStripeSession(id, sessionId) { rows[id].stripe_session_id = sessionId; },
      async markPaidAndQueue(id) {
        if (rows[id]?.status !== 'pending') return null;
        rows[id].status = 'queued';
        return { id };
      },
      async cancelPendingPurchase(id) { if (rows[id]?.status === 'pending') rows[id].status = 'cancelled'; },
      async listPurchasesForUser(userId) { return Object.values(rows).filter((row) => row.userId === userId); },
      async getPurchaseForUser(id, userId) { return rows[id]?.userId === userId ? rows[id] : null; },
      async getPurchaseDownload(id, userId) { return rows[id]?.userId === userId ? rows[id] : null; },
    },
    rows,
  };
}

const passThroughClerk = (_req, _res, next) => next();
function createTestApp(options) {
  return createApp({
    ...options,
    clerkAuthMiddleware: passThroughClerk,
    getAuthFromRequest: (req) => req.headers.cookie?.includes('forge-test=valid')
      ? { userId: 'u1', sessionClaims: { email: 'a@b.com' } }
      : null,
  });
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

const stripe = { checkout: { sessions: { create: async () => ({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1' }) } } };

const config = {
  corsOrigins: [],
  stripeWebhookSecret: 'whsec_test',
  allowFreeGeneration: true,
  frontendUrl: 'http://localhost:8080',
  openrouterKey: 'x',
  siteLimits: { perUserMinute: 1, perUserDay: 3, perIpDay: 5, globalPerDay: 10 },
};

test('GET /api/catalog lists types and tiers without auth', async () => {
  const { db } = fakeDb();
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/catalog`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.types.some((t) => t.id === 'website'));
    assert.ok(body.tiers.some((t) => t.id === 'standard'));
  });
});

test('POST /api/checkout requires sign-in', async () => {
  const { db } = fakeDb();
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/api/checkout`, { method: 'POST', body: JSON.stringify({ prompt: 'x'.repeat(20), type: 'website', tier: 'standard' }), headers: { 'content-type': 'application/json' } })).status, 401);
  });
});

test('POST /api/checkout rejects a short prompt', async () => {
  const { db } = fakeDb();
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/checkout`, {
      method: 'POST',
      headers: { Cookie: 'forge-test=valid', 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'hi', type: 'website', tier: 'standard' }),
    });
    assert.equal(res.status, 400);
  });
});

test('POST /api/site/generate requires an authenticated user', async () => {
  const { db } = fakeDb();
  const app = createTestApp({
    config: { ...config, siteGenerationEnabled: true },
    db,
    stripe,
    jobs: { enqueue() {}, size: 0 },
    sitePipeline: async () => { throw new Error('Must not run'); },
  });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/site/generate`, { method: 'POST' });
    assert.equal(res.status, 401);
  });
});

test('POST /api/site/generate validates input, calls the builder, and enforces limits', async () => {
  const { db } = fakeDb();
  const input = {
    businessName: 'Summit Plumbing',
    industry: 'Home services',
    description: 'A clear website for local plumbing repairs and fixture installation.',
  };
  const received = [];
  const app = createTestApp({
    config: {
      ...config,
      siteGenerationEnabled: true,
      siteLimits: { perUserMinute: 1, perUserDay: 3, perIpDay: 5, globalPerDay: 10 },
    },
    db,
    stripe,
    jobs: { enqueue() {}, size: 0 },
    sitePipeline: async (value) => {
      received.push(value);
      return { id: 'site-1', name: value.businessName, files: { 'index.html': '<!doctype html>' }, qa: { status: 'passed' } };
    },
  });
  await withServer(app, async (base) => {
    const options = {
      method: 'POST',
      headers: { Cookie: 'forge-test=valid', 'content-type': 'application/json' },
      body: JSON.stringify(input),
    };
    const first = await fetch(`${base}/api/site/generate`, options);
    assert.equal(first.status, 200);
    assert.equal((await first.json()).qa.status, 'passed');

    const limited = await fetch(`${base}/api/site/generate`, options);
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
  assert.equal(received.length, 1);
  assert.deepEqual(received[0].brandColors, []);
});

test('POST /api/generate-free queues a free job', async () => {
  const enqueued = [];
  const { db } = fakeDb();
  const app = createTestApp({ config, db, stripe, jobs: { enqueue: (id) => enqueued.push(id), size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/generate-free`, {
      method: 'POST',
      headers: { Cookie: 'forge-test=valid', 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'A plumbing site'.repeat(2), type: 'website', tier: 'standard' }),
    });
    assert.equal(res.status, 202);
    const body = await res.json();
    assert.ok(body.purchaseId);
  });
  assert.ok(enqueued.length >= 1);
});

test('GET /api/purchases requires sign-in', async () => {
  const { db } = fakeDb();
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/api/purchases`)).status, 401);
  });
});

test('GET /api/purchases/:id/download returns 409 when not ready', async () => {
  const { db } = fakeDb({ p1: { status: 'processing', userId: 'u1', archive: null } });
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/purchases/p1/download`, { headers: { Cookie: 'forge-test=valid' } });
    assert.equal(res.status, 409);
  });
});

test('GET /api/purchases/:id/download streams the private archive when ready', async () => {
  const archive = Buffer.from('zip-data');
  const { db } = fakeDb({ p1: { status: 'ready', userId: 'u1', project_name: 'Site', archive } });
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/purchases/p1/download`, { headers: { Cookie: 'forge-test=valid' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/zip');
    assert.equal(res.headers.get('content-disposition'), 'attachment; filename="Site.zip"');
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), archive);
  });
});
