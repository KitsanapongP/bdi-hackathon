import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';

import type { Env } from './config/env.js';
import type { DB } from './config/db.js';

import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { sysConfigRoutes } from './modules/sys-config/sys-config.routes.js';
import { consentRoutes } from './modules/consent/consent.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { eventsRoutes } from './modules/events/events.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { teamsRoutes } from './modules/teams/teams.routes.js';
import { sysLogsRoutes } from './modules/sys-logs/sys-logs.routes.js';
import { contentRoutes } from './modules/content/content.routes.js';
import { verificationRoutes } from './modules/verification/verification.routes.js';

export type AppContext = { env: Env; db: DB };

export function buildApp(ctx: AppContext) {
  const corsOrigins = ctx.env.CORS_ORIGIN
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const loggerTargets: any[] = [
    {
      target: 'pino-roll',
      options: {
        file: path.join(process.cwd(), 'logs', 'app'),
        size: '10m',
        frequency: 'daily',
        mkdir: true,
      },
    },
  ];

  if (ctx.env.NODE_ENV !== 'production') {
    loggerTargets.unshift({
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        singleLine: true,
        ignore: 'pid,hostname',
      },
    });
  }
  const app = Fastify({
    logger: {
      transport: {
        targets: loggerTargets,
      },
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
            remoteAddress: request.ip,
            query: request.query,
            params: request.params,
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
    },
  });

  app.decorate('ctx', ctx);

  app.register(cors, {
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.register(sensible);
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 10,
    },
  });

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

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'content', 'sponsors'),
    prefix: '/static/content/sponsors/',
    cacheControl: true,
    maxAge: '7d',
    immutable: false,
    etag: true,
    lastModified: true,
  });


  app.register(healthRoutes, { prefix: '/api/health' });
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(sysConfigRoutes, { prefix: '/api/sys-config' });
  app.register(consentRoutes, { prefix: '/api/consent' });
  app.register(userRoutes, { prefix: '/api/user' });
  app.register(eventsRoutes, { prefix: '/api/events' });
  app.register(adminRoutes, { prefix: '/api/admin' });
  app.register(teamsRoutes, { prefix: '/api/teams' });
  app.register(sysLogsRoutes, { prefix: '/api/sys-logs' });
  app.register(contentRoutes, { prefix: '/api/content' });
  app.register(verificationRoutes, { prefix: '/api/verification' });

  // Log incoming request body
  app.addHook('preHandler', async (request, reply) => {
    if (request.body) {
      request.log.info({ body: request.body }, 'Request Payload');
    }
  });

  // Log outgoing response body
  app.addHook('onSend', async (request, reply, payload) => {
    // Only log JSON payloads to avoid logging huge files/HTML
    if (typeof payload === 'string' && payload.startsWith('{')) {
      try {
        const parsed = JSON.parse(payload);
        request.log.info({ response: parsed }, 'Response Payload');
      } catch (err) {
        request.log.info({ response: payload }, 'Response Payload (Raw)');
      }
    }

    return payload;
  });

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
