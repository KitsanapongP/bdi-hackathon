import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok } from '../../shared/response.js';
import * as service from './content.service.js';

export async function handleGetRewards(req: FastifyRequest, reply: FastifyReply) {
    const rewards = await service.getRewards(req.server.ctx.db);
    return reply.send(ok(rewards));
}


export async function handleGetSponsors(req: FastifyRequest<{ Querystring: { tier?: string } }>, reply: FastifyReply) {
    const sponsors = await service.getSponsors(req.server.ctx.db, req.query?.tier);
    return reply.send(ok(sponsors));
}
