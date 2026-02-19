import type { FastifyPluginAsync } from 'fastify';
import { pingDB } from '../../config/db.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ ok: true }));

  app.get('/db', async () => {
    await pingDB(app.ctx.db);
    return { ok: true, db: 'connected' };
  });
};
