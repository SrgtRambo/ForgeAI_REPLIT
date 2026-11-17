// In-process job runner. Webhooks only mark a purchase "queued"; the slow work happens here,
// after Stripe has already received its 200 response.
import { GenerationError, generateProject } from './engine.js';
import { buildZip } from './packager.js';

export function createJobRunner({ db, config, chat, log = console }) {
  const queue = [];
  const active = new Set();

  async function run(purchaseId) {
    // Atomic claim: only one worker can move a purchase from queued to processing.
    const purchase = await db.claimQueuedPurchase(purchaseId);
    if (!purchase) return;

    let lastWrite = 0;
    const onProgress = async (progress, message) => {
      const now = Date.now();
      if (now - lastWrite < 1500 && progress < 100) return;
      lastWrite = now;
      await db.updatePurchaseProgress(purchaseId, progress, message);
    };

    try {
      const project = await generateProject({
        chat,
        model: config.models[purchase.tier] ?? config.models.standard,
        prompt: purchase.prompt,
        type: purchase.type,
        tier: purchase.tier,
        onProgress,
      });
      await onProgress(92, 'Packaging your files');
      const zip = await buildZip(project.name, project.files);
      if (zip.byteLength > 20 * 1024 * 1024) throw new Error('Generated archive exceeds the storage limit.');
      await db.markPurchaseReady({
        purchaseId,
        projectName: project.name,
        fileCount: Object.keys(project.files).length,
        archive: zip,
      });
      log.info?.(`[jobs] ${purchaseId} ready (${Object.keys(project.files).length} files)`);
    } catch (err) {
      log.error?.(`[jobs] ${purchaseId} failed:`, err?.name || 'Error');
      const message = err instanceof GenerationError
        ? `${err.message} Contact support for a free retry.`
        : 'Generation failed because of a server problem. Contact support for a free retry.';
      await db.markPurchaseFailed(purchaseId, message.slice(0, 500));
    }
  }

  function pump() {
    while (active.size < config.jobConcurrency && queue.length) {
      const id = queue.shift();
      const job = run(id)
        .catch((err) => log.error?.(`[jobs] ${id} crashed:`, err))
        .finally(() => {
          active.delete(job);
          pump();
        });
      active.add(job);
    }
  }

  return {
    enqueue(purchaseId) {
      if (!queue.includes(purchaseId)) queue.push(purchaseId);
      pump();
    },
    /** Re-queues work interrupted by a restart. Assumes a single server instance. */
    async recover() {
      const rows = await db.recoverPurchases();
      for (const row of rows) this.enqueue(row.id);
      return rows.length;
    },
    get size() {
      return queue.length + active.size;
    },
    async idle() {
      while (queue.length || active.size) await Promise.all([...active]);
    },
  };
}
