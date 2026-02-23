import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';

import type { Env } from './config/env.js';
import type { DB } from './config/db.js';

import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { sysConfigRoutes } from './modules/sys-config/sys-config.routes.js';
import { consentRoutes } from './modules/consent/consent.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';

export type AppContext = { env: Env; db: DB };

export function buildApp(ctx: AppContext) {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss',
          singleLine: true,
          ignore: 'pid,hostname',
        },
      },
    },
  });

  app.decorate('ctx', ctx);

  app.register(cors, { origin: true, credentials: true });
  app.register(sensible);

  // Cookie plugin (must be registered before JWT)
  app.register(cookie);

  // JWT plugin — reads token from HttpOnly cookie named "access_token"
  app.register(jwt, {
    secret: ctx.env.JWT_SECRET,
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  app.get('/', async () => ({ ok: true, service: 'hackathon-backend' }));

  // avoid browser favicon 404 spam
  app.get('/favicon.ico', async (_req, reply) => reply.code(204).send());

  app.register(healthRoutes, { prefix: '/api/health' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(sysConfigRoutes, { prefix: '/api/sys-config' });
  app.register(consentRoutes, { prefix: '/api/consent' });
  app.register(userRoutes, { prefix: '/api/user' });
  app.register(eventsRoutes, { prefix: '/api/events' });

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);

    const statusCode =
      typeof (err as any)?.statusCode === 'number' ? (err as any).statusCode : 500;

    const message = err instanceof Error ? err.message : 'Internal Server Error';

    reply.status(statusCode).send({ ok: false, message });
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext;
  }
}
