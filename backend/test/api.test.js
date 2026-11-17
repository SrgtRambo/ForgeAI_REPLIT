import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/server.js';

function fakeDb(rows = {}, updates = []) {
  const chain = {
    insert(values) {
      const id = `p_${Math.random().toString(36).slice(2, 8)}`;
      rows[id] = { ...values, id, status: 'pending', progress: 0, created_at: new Date().toISOString() };
      return chain;
    },
    select() { return chain; },
    eq() { return chain; },
    order() { return chain; },
    limit() { return chain; },
    maybeSingle: async () => {
      const key = Object.keys(rows)[0];
      return { data: rows[key] ?? null, error: null };
    },
    single: async () => {
      const key = Object.keys(rows)[0];
      return { data: rows[key] ?? null, error: rows[key] ? null : new Error('not found') };
    },
    update(values) {
      Object.assign(updates, values);
      return chain;
    },
    then: (resolve) => resolve({ data: null, error: null }),
  };
  return {
    db: {
      from: () => chain,
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }) },
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
          upload: async () => ({ data: null, error: null }),
        }),
        listBuckets: async () => ({ data: [], error: null }),
        createBucket: async () => ({ data: null, error: null }),
      },
    },
    rows,
    updates,
  };
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
  supabaseUrl: 'http://x',
  supabaseServiceKey: 'x',
  openrouterKey: 'x',
  storageBucket: 'projects',
};

test('GET /api/catalog lists types and tiers without auth', async () => {
  const { db } = fakeDb();
  const app = createApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
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
  const app = createApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/api/checkout`, { method: 'POST', body: JSON.stringify({ prompt: 'x'.repeat(20), type: 'website', tier: 'standard' }), headers: { 'content-type': 'application/json' } })).status, 401);
  });
});

test('POST /api/checkout rejects a short prompt', async () => {
  const { db } = fakeDb();
  const app = createApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/checkout`, {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'hi', type: 'website', tier: 'standard' }),
    });
    assert.equal(res.status, 400);
  });
});

test('POST /api/generate-free queues a free job', async () => {
  const enqueued = [];
  const { db } = fakeDb();
  const app = createApp({ config, db, stripe, jobs: { enqueue: (id) => enqueued.push(id), size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/generate-free`, {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'content-type': 'application/json' },
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
  const app = createApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/api/purchases`)).status, 401);
  });
});

test('GET /api/purchases/:id/download returns 409 when not ready', async () => {
  const { db } = fakeDb({ p1: { status: 'processing', storage_path: null } });
  const app = createApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/purchases/p1/download`, { headers: { Authorization: 'Bearer tok' } });
    assert.equal(res.status, 409);
  });
});

test('GET /api/purchases/:id/download returns a signed URL when ready', async () => {
  const { db } = fakeDb({ p1: { status: 'ready', storage_path: 'u1/p1.zip' } });
  const app = createApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/purchases/p1/download`, { headers: { Authorization: 'Bearer tok' } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.url);
    assert.equal(body.expiresInSeconds, 3600);
  });
});
