import { loadEnv } from './config/env.js';
import { createDB, pingDB } from './config/db.js';
import { buildApp } from './app.js';

async function main() {
  const env = loadEnv();
  const db = createDB(env);

  // Fail fast if DB config is wrong
  await pingDB(db);

  const app = buildApp({ env, db });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`✅ Server running on port ${env.PORT}`);
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
