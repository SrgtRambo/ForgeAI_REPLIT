// Forge AI backend: Stripe checkout -> webhook marks purchase paid -> background job generates,
// zips and stores the project -> the signed-in customer downloads it.
import express from 'express';
import Stripe from 'stripe';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { publishableKeyFromHost } from '@clerk/shared/keys';
import { pathToFileURL } from 'node:url';

import { loadConfig } from './config.js';
import { createDatabase } from './database.js';
import { createJobRunner } from './jobs.js';
import { createOpenRouterChat } from './openrouter.js';
import { OrderError, validateOrder } from './orders.js';
import { ARCHETYPES } from './archetypes.js';
import { TIERS } from './pricing.js';
import { createSitePipeline } from './site/pipeline.js';
import { createSiteUsageLimiter } from './site/usage-limits.js';
import { validateSiteRequest } from './site/request.js';
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from './middlewares/clerkProxyMiddleware.js';

export function createApp({
  config,
  db,
  stripe,
  jobs,
  sitePipeline = null,
  clerkAuthMiddleware,
  getAuthFromRequest = getAuth,
}) {
  const app = express();
  app.disable('x-powered-by');
  const siteLimiter = createSiteUsageLimiter(config.siteLimits);
  const checkoutLimiter = createSiteUsageLimiter({
    perUserMinute: 3,
    perUserDay: 20,
    perIpDay: 30,
    globalPerDay: 100,
  });
  const freeGenerationLimiter = createSiteUsageLimiter({
    perUserMinute: 1,
    perUserDay: 3,
    perIpDay: 5,
    globalPerDay: 10,
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
  app.use(clerkAuthMiddleware ?? clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? '',
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })));

  // Stripe signs the exact raw bytes, so this route must run before express.json().
  const rawJson = express.raw({ type: 'application/json', limit: '1mb' });
  const handleStripeWebhook = async (req, res) => {
    if (!stripe) return res.status(503).json({ error: 'Payments are not configured.' });
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature check failed: ${err.message}` });
    }
    try {
      const session = event.data.object;
      const purchaseId = session?.metadata?.purchase_id;
      if (
        purchaseId &&
        (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') &&
        session.payment_status === 'paid'
      ) {
        // Conditional update makes Stripe's retries harmless: only the first one queues work.
        const data = await db.markPaidAndQueue(purchaseId);
        if (data) jobs.enqueue(data.id);
      } else if (purchaseId && event.type === 'checkout.session.expired') {
        await db.cancelPendingPurchase(purchaseId);
      }
      // Respond right away; generation runs in the background.
      res.json({ received: true });
    } catch (err) {
      console.error('[webhook] failed', err);
      res.status(500).json({ error: 'Webhook processing failed.' });
    }
  };

  app.post('/api/stripe/webhook', rawJson, handleStripeWebhook);
  app.post('/webhook', rawJson, handleStripeWebhook);

  app.use(express.json({ limit: '64kb' }));

  const requireUser = async (req, res, next) => {
    try {
      const session = getAuthFromRequest(req);
      if (!session?.userId) return res.status(401).json({ error: 'Sign in first.' });
      const claims = session.sessionClaims;
      req.user = {
        id: session.userId,
        email: typeof claims?.email === 'string' ? claims.email : undefined,
      };
      return next();
    } catch {
      return res.status(503).json({ error: 'Sign-in service is temporarily unavailable.' });
    }
  };

  const handle = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof OrderError) return res.status(err.status).json({ error: err.message });
      console.error('[api]', err?.name || 'Error');
      res.status(500).json({ error: 'Something went wrong. Try again.' });
    }
  };

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      payments: Boolean(stripe),
      freeGeneration: config.allowFreeGeneration,
      siteGeneration: Boolean(config.siteGenerationEnabled && sitePipeline),
      jobs: jobs.size,
    });
  });

  app.get('/api/catalog', (_req, res) => {
    res.json({
      types: Object.entries(ARCHETYPES).map(([id, a]) => ({ id, label: a.label })),
      tiers: Object.entries(TIERS).map(([id, t]) => ({ id, label: t.label, priceCents: t.priceCents, maxFiles: t.maxFiles })),
    });
  });

  app.post('/api/site/generate', requireUser, async (req, res) => {
    if (!config.siteGenerationEnabled || !sitePipeline) {
      return res.status(503).json({ error: 'Website generation is not configured yet.' });
    }

    let input;
    try {
      input = validateSiteRequest(req.body);
    } catch (error) {
      return res.status(error.status || 400).json({ error: error.message });
    }

    const limit = siteLimiter.consume({ userId: req.user.id, ip: req.ip });
    if (!limit.allowed) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      return res.status(429).json({
        error: limit.reason === 'daily-cap'
          ? 'Website generation is temporarily at its daily capacity. Try again tomorrow.'
          : 'You have reached the website generation limit. Please try again later.',
      });
    }

    const controller = new AbortController();
    const cancelIfDisconnected = () => {
      if (!res.writableFinished) controller.abort();
    };
    res.once('close', cancelIfDisconnected);
    try {
      const result = await sitePipeline(input, { signal: controller.signal });
      return res.json(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error?.status === 429) {
        return res.status(429).json({ error: error.message });
      }
      if (error?.status === 401) {
        return res.status(503).json({ error: 'The OpenRouter connection needs attention.' });
      }
      if (error?.status === 402) {
        return res.status(503).json({ error: 'OpenRouter has no available credits for website generation.' });
      }
      if (error?.status === 408) {
        return res.status(504).json({ error: error.message });
      }
      console.error('[site-generation]', error?.name || 'Error');
      return res.status(502).json({ error: 'The website could not be generated. Try a shorter description.' });
    } finally {
      res.off('close', cancelIfDisconnected);
    }
  });

  app.post(
    '/api/checkout',
    requireUser,
    handle(async (req, res) => {
      if (!stripe) return res.status(503).json({ error: 'Payments are not set up yet.' });
      const limit = checkoutLimiter.consume({ userId: req.user.id, ip: req.ip });
      if (!limit.allowed) {
        res.setHeader('Retry-After', String(limit.retryAfterSeconds));
        return res.status(429).json({ error: 'Too many checkout attempts. Try again later.' });
      }
      const order = validateOrder(req.body);
      const purchase = await db.createPurchase({
        userId: req.user.id,
        type: order.type,
        tier: order.tier,
        prompt: order.prompt,
        amountCents: order.amountCents,
        status: 'pending',
      });
      const tier = TIERS[order.tier];
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        managed_payments: { enabled: false },
        ...(req.user.email ? { customer_email: req.user.email } : {}),
        client_reference_id: purchase.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: order.amountCents,
              product_data: { name: `Forge AI ${ARCHETYPES[order.type].label} — ${tier.label}` },
            },
          },
        ],
        // Only ids go to Stripe; the prompt stays in our database.
        metadata: { purchase_id: purchase.id, user_id: req.user.id },
        success_url: `${config.frontendUrl}/purchases?purchase=${purchase.id}&paid=1`,
        cancel_url: `${config.frontendUrl}/purchases?purchase=${purchase.id}&cancelled=1`,
      });
      await db.attachStripeSession(purchase.id, session.id);
      res.json({ url: session.url, purchaseId: purchase.id });
    }),
  );

  app.post(
    '/api/generate-free',
    requireUser,
    handle(async (req, res) => {
      if (!config.allowFreeGeneration) return res.status(403).json({ error: 'Free generation is turned off.' });
      if (jobs.size >= config.maxQueuedJobs) {
        return res.status(429).json({ error: 'The generation queue is busy. Try again later.' });
      }
      const limit = freeGenerationLimiter.consume({ userId: req.user.id, ip: req.ip });
      if (!limit.allowed) return res.status(429).json({ error: 'You have reached the free generation limit.' });
      const order = validateOrder(req.body);
      const purchase = await db.createPurchase({
        userId: req.user.id,
        type: order.type,
        tier: order.tier,
        prompt: order.prompt,
        amountCents: 0,
        status: 'queued',
      });
      jobs.enqueue(purchase.id);
      res.status(202).json({ purchaseId: purchase.id });
    }),
  );

  app.get(
    '/api/purchases',
    requireUser,
    handle(async (req, res) => {
      res.json({ purchases: await db.listPurchasesForUser(req.user.id) });
    }),
  );

  app.get(
    '/api/purchases/:id',
    requireUser,
    handle(async (req, res) => {
      const purchase = await db.getPurchaseForUser(req.params.id, req.user.id);
      if (!purchase) return res.status(404).json({ error: 'Purchase not found.' });
      res.json({ purchase });
    }),
  );

  app.get(
    '/api/purchases/:id/download',
    requireUser,
    handle(async (req, res) => {
      const purchase = await db.getPurchaseDownload(req.params.id, req.user.id);
      if (!purchase) return res.status(404).json({ error: 'Purchase not found.' });
      if (purchase.status !== 'ready' || !purchase.archive) {
        return res.status(409).json({ error: 'Your project is not ready yet.' });
      }
      const filename = String(purchase.project_name || 'forge-project')
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'forge-project';
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.zip"`);
      res.setHeader('Content-Length', String(purchase.archive.length));
      res.send(purchase.archive);
    }),
  );

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  return app;
}

async function main() {
  const config = loadConfig();
  const db = createDatabase({ databaseUrl: config.databaseUrl });
  const stripe = config.paymentsEnabled ? new Stripe(config.stripeSecretKey) : null;
  const chat = createOpenRouterChat({ apiKey: config.openrouterKey, referer: config.frontendUrl });
  const jobs = createJobRunner({ db, config, chat });
  const siteChat = createOpenRouterChat({
    apiKey: config.openrouterKey,
    referer: config.frontendUrl,
    timeoutMs: 60_000,
    retries: 1,
  });
  const sitePipeline = config.siteGenerationEnabled && config.openrouterKey
    ? createSitePipeline({
      chat: siteChat,
      modelAnalysis: config.models.analysis,
      modelCopy: config.models.copy,
    })
    : null;
  const app = createApp({ config, db, stripe, jobs, sitePipeline });
  app.listen(config.port, async () => {
    console.log(`Forge AI backend listening on ${config.baseUrl}`);
    if (!stripe) console.log('Payments are off (add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to turn them on).');
    if (config.siteGenerationEnabled && !sitePipeline) {
      console.warn('Website generation is off because OpenRouter is not configured.');
    }

    const resumed = await jobs.recover().catch((err) => (console.error('[jobs] recover failed', err), 0));
    if (resumed) console.log(`Resumed ${resumed} unfinished job(s).`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
