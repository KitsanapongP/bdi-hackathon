import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './events.service.js';
import { ok } from '../../shared/response.js';

export async function handleGetSchedules(req: FastifyRequest, reply: FastifyReply) {
    const schedule = await service.getFullSchedule(req.server.ctx.db);
    return reply.send(ok(schedule));
}
