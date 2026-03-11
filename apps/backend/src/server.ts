import { loadEnv } from './config/env.js';
import { createDB, pingDB } from './config/db.js';
import { buildApp } from './app.js';

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM');
});

async function main() {
  const env = loadEnv();

  console.log('Starting server with DB config:', {
    DB_HOST: env.DB_HOST,
    DB_PORT: env.DB_PORT,
    DB_USER: env.DB_USER,
    DB_NAME: env.DB_NAME,
  });

  const db = createDB(env);
  await pingDB(db);

  const app = buildApp({ env, db });

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  app.log.info(`✅ Server running on port ${env.PORT}`);
}

main().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});