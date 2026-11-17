import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

import { createApp } from '../src/server.js';

const SECRET = 'whsec_test_secret';
const stripe = new Stripe('sk_test_dummy');

function fakeDb(result) {
  return {
    db: {
      markPaidAndQueue: async () => result(),
      cancelPendingPurchase: async () => {},
    },
  };
}

const passThroughClerk = (_req, _res, next) => next();
function createTestApp(options) {
  return createApp({
    ...options,
    clerkAuthMiddleware: passThroughClerk,
    getAuthFromRequest: () => null,
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

function signedEvent(type, paymentStatus = 'paid') {
  const payload = JSON.stringify({
    id: 'evt_1', object: 'event', type,
    data: { object: { id: 'cs_1', payment_status: paymentStatus, metadata: { purchase_id: 'p1' } } },
  });
  return { payload, signature: stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

const config = { corsOrigins: [], stripeWebhookSecret: SECRET, allowFreeGeneration: false, frontendUrl: 'http://x' };

test('webhook rejects requests without a valid Stripe signature', async () => {
  const enqueued = [];
  const { db } = fakeDb(() => ({ id: 'p1' }));
  const app = createTestApp({ config, db, stripe, jobs: { enqueue: (id) => enqueued.push(id), size: 0 } });
  await withServer(app, async (base) => {
    const res = await fetch(`${base}/api/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=bad' }, body: '{}',
    });
    assert.equal(res.status, 400);
  });
  assert.deepEqual(enqueued, []);
});

test('a paid checkout queues the job once and replies immediately', async () => {
  const enqueued = [];
  let firstDelivery = true;
  // The conditional update matches only on the first delivery, like the real database.
  const { db } = fakeDb(() => (firstDelivery ? ((firstDelivery = false), { id: 'p1' }) : null));
  const app = createTestApp({ config, db, stripe, jobs: { enqueue: (id) => enqueued.push(id), size: 0 } });
  await withServer(app, async (base) => {
    for (let i = 0; i < 2; i++) {
      const { payload, signature } = signedEvent('checkout.session.completed');
      const res = await fetch(`${base}/api/stripe/webhook`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload,
      });
      assert.equal(res.status, 200);
    }
  });
  assert.deepEqual(enqueued, ['p1']);
});

test('an unpaid checkout does not queue work', async () => {
  const enqueued = [];
  const { db } = fakeDb(() => ({ id: 'p1' }));
  const app = createTestApp({ config, db, stripe, jobs: { enqueue: (id) => enqueued.push(id), size: 0 } });
  await withServer(app, async (base) => {
    const { payload, signature } = signedEvent('checkout.session.completed', 'unpaid');
    const res = await fetch(`${base}/api/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload,
    });
    assert.equal(res.status, 200);
  });
  assert.deepEqual(enqueued, []);
});

test('purchase routes require sign-in', async () => {
  const { db } = fakeDb(() => null);
  const app = createTestApp({ config, db, stripe, jobs: { enqueue() {}, size: 0 } });
  await withServer(app, async (base) => {
    assert.equal((await fetch(`${base}/api/purchases`)).status, 401);
    assert.equal((await fetch(`${base}/api/purchases/p1/download`)).status, 401);
    assert.equal((await fetch(`${base}/api/checkout`, { method: 'POST' })).status, 401);
  });
});
