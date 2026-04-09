import type { FastifyPluginAsync } from 'fastify';
import { ok } from '../../shared/response.js';
import { processQueuedEmailRetries } from '../notifications/notifications.service.js';

type RetryQueuedEmailsQuery = {
  token?: string;
  limit?: string;
};

export const cronRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: RetryQueuedEmailsQuery }>('/notifications/retry-emails', async (req, reply) => {
    const expectedToken = app.ctx.env.CRON_RETRY_TOKEN.trim();
    if (!expectedToken) {
      return reply.status(503).send({ ok: false, message: 'CRON_RETRY_TOKEN is not configured' });
    }

    const headerToken = String(req.headers['x-cron-token'] || '').trim();
    const queryToken = String(req.query.token || '').trim();
    const providedToken = headerToken || queryToken;
    if (!providedToken || providedToken !== expectedToken) {
      return reply.status(401).send({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const requestedLimit = Number(req.query.limit || process.env.SMTP_RETRY_BATCH_SIZE || 200);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(1000, Math.floor(requestedLimit))) : 200;
    const result = await processQueuedEmailRetries(app.ctx.db, limit);
    return reply.send(ok(result, 'processed queued notification emails'));
  });
};
