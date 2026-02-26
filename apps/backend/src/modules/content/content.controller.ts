import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok } from '../../shared/response.js';
import * as service from './content.service.js';

export async function handleGetRewards(req: FastifyRequest, reply: FastifyReply) {
    const rewards = await service.getRewards(req.server.ctx.db);
    return reply.send(ok(rewards));
}
