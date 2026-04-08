import { loadEnv } from '../config/env.js';
import { createDB, pingDB } from '../config/db.js';
import { processQueuedEmailRetries } from '../modules/notifications/notifications.service.js';

async function main() {
  const env = loadEnv();
  const db = createDB(env);

  try {
    await pingDB(db);
    const result = await processQueuedEmailRetries(db, Number(process.env.SMTP_RETRY_BATCH_SIZE ?? 200));
    console.log('[email-retry] done', result);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('[email-retry] failed', error);
  process.exit(1);
});
