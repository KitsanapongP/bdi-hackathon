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
import { submissionsRoutes } from './modules/submissions/submissions.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { privilegesRoutes } from './modules/privileges/privileges.routes.js';
import { cronRoutes } from './modules/cron/cron.routes.js';
import { publicReviewRoutes } from './modules/public-review/public-review.routes.js';
import { AppError } from './shared/errors.js';

export type AppContext = { env: Env; db: DB };

function pickConfiguredFrontendBaseUrl(env: Env): string {
  const configuredFrontend = String(env.FRONTEND_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configuredFrontend) return configuredFrontend;

  return String(env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .find((value) => /^https?:\/\//i.test(value)) || '';
}

function buildBackendReviewFallbackHtml(shareId: string): string {
  const safeShareIdJson = JSON.stringify(shareId);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>Team Review</title>
  <style>
    body{margin:0;background:#f4f8fb;color:#10243f;font-family:Arial,sans-serif}
    main{max-width:1120px;margin:0 auto;padding:22px}
    section{background:#fff;border:1px solid #d9e5f1;border-radius:10px;padding:16px;margin:0 0 14px}
    h1{margin:4px 0 0;font-size:28px}h2{margin:0 0 12px;font-size:18px}h3{margin:0 0 8px;font-size:16px}
    .muted{color:#617996}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .card{border:1px solid #e0eaf5;background:#fbfdff;border-radius:8px;padding:12px}.row{display:flex;gap:8px;flex-wrap:wrap}
    a{color:#165bb4;font-weight:700;text-decoration:none}.btn{display:inline-block;border:1px solid #cfe0f4;border-radius:8px;padding:8px 10px;background:#fff;margin-right:8px}
    iframe,video,img{width:100%;height:260px;border:1px solid #dce7f3;border-radius:8px;background:#fff;margin-top:10px}
    img{object-fit:contain}.fallback{height:180px;display:grid;place-content:center;text-align:center;color:#617996;border:1px solid #dce7f3;border-radius:8px;background:#fff;margin-top:10px}
    @media(max-width:760px){main{padding:12px}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main id="app"><section><p class="muted">Loading team review...</p></section></main>
  <script>
    const shareId = ${safeShareIdJson};
    const app = document.getElementById('app');
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = (v) => v ? new Date(v).toLocaleString() : '-';
    const kind = (f) => {
      const t = String(f.contentType || '').toLowerCase();
      const n = String(f.fileName || '').toLowerCase();
      if (t.startsWith('image/')) return 'image';
      if (t.startsWith('video/')) return 'video';
      if (t.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
      return 'file';
    };
    const preview = (f) => {
      const k = kind(f);
      if (k === 'image') return '<img src="'+esc(f.url)+'" alt="'+esc(f.fileName)+'" />';
      if (k === 'video') return '<video src="'+esc(f.url)+'" controls preload="metadata"></video>';
      if (k === 'pdf') return '<iframe src="'+esc(f.url)+'" title="'+esc(f.fileName)+'"></iframe>';
      return '<div class="fallback">This file type may not preview in the browser.</div>';
    };
    fetch('/api/public-review/teams/' + encodeURIComponent(shareId))
      .then((r) => r.json().then((p) => ({ ok: r.ok, payload: p })))
      .then(({ ok, payload }) => {
        if (!ok || !payload.ok) throw new Error(payload.message || 'Unable to load review');
        const d = payload.data;
        const team = d.team || {};
        const links = d.submissionLinks || [];
        const files = d.submissionFiles || [];
        const members = d.members || [];
        const advisors = d.advisors || [];
        app.innerHTML =
          '<section><span class="muted">'+esc(team.teamCode || '-')+'</span><h1>'+esc(team.teamNameTh || team.teamNameEn || 'Team Review')+'</h1><p class="muted">Status: '+esc(team.status || '-')+' / Leader: '+esc(team.leaderName || '-')+' / Updated: '+esc(fmt(team.updatedAt))+'</p></section>' +
          '<section><h2>Members</h2><div class="grid">'+(members.map((m) => '<div class="card"><b>'+esc(m.name)+'</b><p class="muted">'+esc([m.role,m.email,m.phone,m.institution].filter(Boolean).join(' / ') || '-')+'</p>'+(m.documentUrl ? '<a class="btn" target="_blank" href="'+esc(m.documentUrl)+'">Open ID Bundle</a>' : '')+'</div>').join('') || '<p class="muted">No members</p>')+'</div></section>' +
          '<section><h2>Advisors</h2><div class="grid">'+(advisors.map((a) => '<div class="card"><b>'+esc(a.name)+'</b><p class="muted">'+esc([a.email,a.phone,a.institution].filter(Boolean).join(' / ') || '-')+'</p></div>').join('') || '<p class="muted">No advisors</p>')+'</div></section>' +
          '<section><h2>Submission Links</h2><div class="row">'+(links.map((l) => '<a class="btn" target="_blank" href="'+esc(l.url)+'">'+esc(l.taskName || 'Open Link')+'</a>').join('') || '<p class="muted">No links</p>')+'</div></section>' +
          '<section><h2>Submission Files</h2><div class="grid">'+(files.map((f) => '<article class="card"><h3>'+esc(f.fileName)+'</h3><p class="muted">'+esc(f.taskName || '-')+' / '+esc(fmt(f.uploadedAt))+'</p>'+preview(f)+'<p><a class="btn" target="_blank" href="'+esc(f.url)+'">Open</a><a class="btn" href="'+esc(f.downloadUrl || f.url)+'">Download</a></p></article>').join('') || '<p class="muted">No files</p>')+'</div></section>';
      })
      .catch((err) => { app.innerHTML = '<section><h1>Review not found</h1><p class="muted">'+esc(err.message)+'</p></section>'; });
  </script>
</body>
</html>`;
}

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

  app.get('/review/team/:shareId', async (request, reply) => {
    const shareId = String((request.params as { shareId?: string }).shareId || '').trim();
    const frontendBaseUrl = pickConfiguredFrontendBaseUrl(ctx.env);
    const currentOrigin = `${request.protocol || 'https'}://${String(request.headers.host || '').trim()}`.replace(/\/+$/, '');

    if (frontendBaseUrl && frontendBaseUrl !== currentOrigin) {
      return reply.redirect(`${frontendBaseUrl}/review/team/${encodeURIComponent(shareId)}`, 302);
    }

    reply.header('Content-Type', 'text/html; charset=utf-8');
    reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return reply.send(buildBackendReviewFallbackHtml(shareId));
  });

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'content', 'sponsors'),
    prefix: '/static/content/sponsors/',
    cacheControl: true,
    maxAge: '7d',
    immutable: false,
    etag: true,
    lastModified: true,
  });

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'content', 'carousels'),
    prefix: '/static/content/carousels/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '7d',
    immutable: false,
    etag: true,
    lastModified: true,
  });

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'content', 'user_manuals'),
    prefix: '/static/content/user_manuals/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '7d',
    immutable: false,
    etag: true,
    lastModified: true,
  });

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'content', 'venues'),
    prefix: '/static/content/venues/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '7d',
    immutable: false,
    etag: true,
    lastModified: true,
  });

  app.register(fastifyStatic, {
    root: path.join(process.cwd(), 'public', 'uploads', 'avatars'),
    prefix: '/static/uploads/avatars/',
    decorateReply: false,
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
  app.register(submissionsRoutes, { prefix: '/api/submissions' });
  app.register(notificationsRoutes, { prefix: '/api/notifications' });
  app.register(privilegesRoutes, { prefix: '/api/privileges' });
  app.register(cronRoutes, { prefix: '/api/cron' });
  app.register(publicReviewRoutes, { prefix: '/api/public-review' });

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

    const rawStatusCode =
      typeof (err as any)?.statusCode === 'number' ? Number((err as any).statusCode) : 500;
    const statusCode = rawStatusCode >= 400 && rawStatusCode < 600 ? rawStatusCode : 500;

    let message = 'ขออภัย เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง';

    if (statusCode < 500) {
      if (err instanceof AppError) {
        message = err.message;
      } else if (statusCode === 401) {
        message = 'ไม่มีสิทธิ์เข้าถึง';
      } else if (statusCode === 403) {
        message = 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้';
      } else if (statusCode === 404) {
        message = 'ไม่พบข้อมูลที่ต้องการ';
      } else {
        message = 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
      }
    }

    reply.status(statusCode).send({ ok: false, message });
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    ctx: AppContext;
  }
}
