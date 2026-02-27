import type { FastifyPluginAsync } from 'fastify';
import type { RowDataPacket } from 'mysql2/promise';

export const publicStaticRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/sponsors', async (req, reply) => {
    const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM static_sponsors WHERE is_active = 1 ORDER BY sort_order ASC, sponsor_id ASC`);
    return reply.send({ ok: true, data: rows });
  });
  fastify.get('/rewards', async (req, reply) => {
    const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM static_rewards WHERE is_active = 1 ORDER BY rank_order ASC, reward_id ASC`);
    return reply.send({ ok: true, data: rows });
  });
  fastify.get('/about', async (req, reply) => {
    const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM static_abouts WHERE is_active = 1 ORDER BY about_id DESC`);
    return reply.send({ ok: true, data: rows[0] ?? null });
  });
  fastify.get('/contacts', async (req, reply) => {
    const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM static_contacts WHERE is_active = 1 ORDER BY sort_order ASC, contact_id ASC`);
    return reply.send({ ok: true, data: rows });
  });
  fastify.get('/winners', async (req, reply) => {
    const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM static_winners WHERE is_active = 1 AND is_published = 1 ORDER BY sort_order ASC, winner_id ASC`);
    return reply.send({ ok: true, data: rows });
  });
};
