// Forge AI backend: Stripe checkout -> webhook marks purchase paid -> background job generates,
// zips and stores the project -> the signed-in customer downloads it.
import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

import { loadConfig } from './config.js';
import { createJobRunner } from './jobs.js';
import { createOpenRouterChat } from './openrouter.js';
import { OrderError, validateOrder } from './orders.js';
import { ARCHETYPES } from './archetypes.js';
import { TIERS } from './pricing.js';
import { createSitePipeline } from './site/pipeline.js';
import { createSiteUsageLimiter } from './site/usage-limits.js';
import { validateSiteRequest } from './site/request.js';

const PURCHASE_FIELDS =
  'id, type, tier, prompt, amount_cents, status, progress, progress_message, project_name, file_count, error, license_key, created_at, updated_at';

export function createApp({ config, db, stripe, jobs, sitePipeline = null }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  const siteLimiter = createSiteUsageLimiter(config.siteLimits);
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
        const { data } = await db
          .from('purchases')
          .update({ status: 'queued', progress_message: 'Payment received' })
          .eq('id', purchaseId)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();
        if (data) jobs.enqueue(data.id);
      } else if (purchaseId && event.type === 'checkout.session.expired') {
        await db.from('purchases').update({ status: 'cancelled' }).eq('id', purchaseId).eq('status', 'pending');
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
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return res.status(401).json({ error: 'Sign in first.' });
    try {
      const { data, error } = await db.auth.getUser(token);
      if (error || !data?.user) return res.status(401).json({ error: 'Your session expired. Sign in again.' });
      req.user = data.user;
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

    try {
      const result = await sitePipeline(input);
      return res.json(result);
    } catch (error) {
      if (error?.status === 429) {
        return res.status(429).json({ error: error.message });
      }
      if (error?.status === 401) {
        return res.status(503).json({ error: 'The OpenRouter connection needs attention.' });
      }
      if (error?.status === 402) {
        return res.status(503).json({ error: 'OpenRouter has no available credits for website generation.' });
      }
      console.error('[site-generation]', error?.name || 'Error');
      return res.status(502).json({ error: 'The website could not be generated. Try a shorter description.' });
    }
  });

  app.post(
    '/api/checkout',
    requireUser,
    handle(async (req, res) => {
      if (!stripe) return res.status(503).json({ error: 'Payments are not set up yet.' });
      const order = validateOrder(req.body);
      const { data: purchase, error } = await db
        .from('purchases')
        .insert({
          user_id: req.user.id,
          email: req.user.email,
          type: order.type,
          tier: order.tier,
          prompt: order.prompt,
          amount_cents: order.amountCents,
          status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw error;
      const tier = TIERS[order.tier];
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        managed_payments: { enabled: false },
        customer_email: req.user.email,
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
      await db.from('purchases').update({ stripe_session_id: session.id }).eq('id', purchase.id);
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
      const { data, error } = await db
        .from('purchases')
        .insert({
          user_id: req.user.id,
          email: req.user.email,
          type: order.type,
          tier: order.tier,
          prompt: order.prompt,
          amount_cents: 0,
          status: 'queued',
        })
        .select('id')
        .single();
      if (error) throw error;
      jobs.enqueue(data.id);
      res.status(202).json({ purchaseId: data.id });
    }),
  );

  app.get(
    '/api/purchases',
    requireUser,
    handle(async (req, res) => {
      const { data, error } = await db
        .from('purchases')
        .select(PURCHASE_FIELDS)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      res.json({ purchases: data });
    }),
  );

  app.get(
    '/api/purchases/:id',
    requireUser,
    handle(async (req, res) => {
      const { data } = await db
        .from('purchases')
        .select(PURCHASE_FIELDS)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (!data) return res.status(404).json({ error: 'Purchase not found.' });
      res.json({ purchase: data });
    }),
  );

  app.get(
    '/api/purchases/:id/download',
    requireUser,
    handle(async (req, res) => {
      const { data } = await db
        .from('purchases')
        .select('status, storage_path')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (!data) return res.status(404).json({ error: 'Purchase not found.' });
      if (data.status !== 'ready' || !data.storage_path) {
        return res.status(409).json({ error: 'Your project is not ready yet.' });
      }
      // A fresh short-lived link on every request, so links never go stale in the database.
      const { data: signed, error } = await db.storage
        .from(config.storageBucket)
        .createSignedUrl(data.storage_path, 60 * 60, { download: true });
      if (error) throw error;
      res.json({ url: signed.signedUrl, expiresInSeconds: 3600 });
    }),
  );

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  return app;
}

async function main() {
  const config = loadConfig();
  const db = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = config.paymentsEnabled ? new Stripe(config.stripeSecretKey) : null;
  const chat = createOpenRouterChat({ apiKey: config.openrouterKey, referer: config.frontendUrl });
  const jobs = createJobRunner({ db, config, chat });
  const sitePipeline = config.siteGenerationEnabled && config.openrouterKey
    ? createSitePipeline({
      chat,
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

    // Ensure storage bucket exists
    try {
      const { data: buckets } = await db.storage.listBuckets();
      if (!buckets?.some((b) => b.name === config.storageBucket)) {
        await db.storage.createBucket(config.storageBucket, { public: false });
        console.log(`[storage] Created bucket "${config.storageBucket}"`);
      }
    } catch (e) {
      console.warn('[storage] bucket check:', e.message);
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
