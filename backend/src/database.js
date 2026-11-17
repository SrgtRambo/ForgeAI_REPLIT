import postgres from 'postgres';

const PURCHASE_FIELDS =
  'id, type, tier, amount_cents, status, progress, progress_message, project_name, file_count, error, license_key, created_at, updated_at';

export function createDatabase({ databaseUrl = process.env.DATABASE_URL, postgresClient = postgres } = {}) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const sql = postgresClient(databaseUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return {
    async createPurchase({ userId, type, tier, prompt, amountCents, status }) {
      const [purchase] = await sql`
        insert into purchases (user_id, type, tier, prompt, amount_cents, status)
        values (${userId}, ${type}, ${tier}, ${prompt}, ${amountCents}, ${status})
        returning id
      `;
      return purchase;
    },

    async attachStripeSession(purchaseId, sessionId) {
      await sql`update purchases set stripe_session_id = ${sessionId}, updated_at = now() where id = ${purchaseId}`;
    },

    async markPaidAndQueue(purchaseId) {
      const [purchase] = await sql`
        update purchases
        set status = 'queued', progress_message = 'Payment received', updated_at = now()
        where id = ${purchaseId} and status = 'pending'
        returning id
      `;
      return purchase ?? null;
    },

    async cancelPendingPurchase(purchaseId) {
      await sql`
        update purchases
        set status = 'cancelled', updated_at = now()
        where id = ${purchaseId} and status = 'pending'
      `;
    },

    async claimQueuedPurchase(purchaseId) {
      const [purchase] = await sql`
        update purchases
        set status = 'processing', progress = 1, progress_message = 'Starting', error = null, updated_at = now()
        where id = ${purchaseId} and status = 'queued'
        returning *
      `;
      return purchase ?? null;
    },

    async updatePurchaseProgress(purchaseId, progress, message) {
      await sql`
        update purchases
        set progress = ${progress}, progress_message = ${message}, updated_at = now()
        where id = ${purchaseId}
      `;
    },

    async markPurchaseReady({ purchaseId, projectName, fileCount, archive }) {
      await sql`
        update purchases
        set status = 'ready',
            progress = 100,
            progress_message = 'Ready to download',
            project_name = ${projectName},
            file_count = ${fileCount},
            archive = ${archive},
            updated_at = now()
        where id = ${purchaseId}
      `;
    },

    async markPurchaseFailed(purchaseId, message) {
      await sql`
        update purchases
        set status = 'failed', error = ${message}, updated_at = now()
        where id = ${purchaseId}
      `;
    },

    async recoverPurchases() {
      await sql`update purchases set status = 'queued', updated_at = now() where status = 'processing'`;
      return sql`select id from purchases where status = 'queued' order by created_at`;
    },

    async listPurchasesForUser(userId) {
      return sql`
        select ${sql.unsafe(PURCHASE_FIELDS)}
        from purchases
        where user_id = ${userId}
        order by created_at desc
        limit 100
      `;
    },

    async getPurchaseForUser(purchaseId, userId) {
      const [purchase] = await sql`
        select ${sql.unsafe(PURCHASE_FIELDS)}
        from purchases
        where id = ${purchaseId} and user_id = ${userId}
        limit 1
      `;
      return purchase ?? null;
    },

    async getPurchaseDownload(purchaseId, userId) {
      const [purchase] = await sql`
        select status, project_name, archive
        from purchases
        where id = ${purchaseId} and user_id = ${userId}
        limit 1
      `;
      return purchase ?? null;
    },

    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
