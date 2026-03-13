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

export async function handleGetCarousels(req: FastifyRequest, reply: FastifyReply) {
    const carousels = await service.getCarousels(req.server.ctx.db);
    return reply.send(ok(carousels));
}

export async function handleGetPageByCode(
    req: FastifyRequest<{ Params: { pageCode: string } }>,
    reply: FastifyReply
) {
    const page = await service.getPublishedPageByCode(req.server.ctx.db, req.params.pageCode);
    return reply.send(ok(page));
}

export async function handleGetContacts(req: FastifyRequest, reply: FastifyReply) {
    const contacts = await service.getContacts(req.server.ctx.db);
    return reply.send(ok(contacts));
}

export async function handleGetParticipationOverview(req: FastifyRequest, reply: FastifyReply) {
    const overview = await service.getParticipationOverview(req.server.ctx.db);
    return reply.send(ok(overview));
}

export async function handleGetAllRewardsAdmin(req: FastifyRequest, reply: FastifyReply) {
    const rewards = await service.getAllRewardsAdmin(req.server.ctx.db);
    return reply.send(ok(rewards));
}

export async function handleGetRewardByIdAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const reward = await service.getRewardByIdAdmin(req.server.ctx.db, Number(req.params.id));
    return reply.send(ok(reward));
}

export async function handleCreateRewardAdmin(
    req: FastifyRequest<{
        Body: {
            rank: string;
            title: string;
            titleTh: string;
            amount: number | null;
            currency: string | null;
            prizeTextTh: string | null;
            prizeTextEn: string | null;
            descriptionTh: string | null;
            descriptionEn: string | null;
            sortOrder: number;
            isActive: boolean;
        };
    }>,
    reply: FastifyReply
) {
    const reward = await service.createRewardAdmin(req.server.ctx.db, req.body);
    return reply.send(ok(reward));
}

export async function handleUpdateRewardAdmin(
    req: FastifyRequest<{
        Params: { id: string };
        Body: {
            rank?: string;
            title?: string;
            titleTh?: string;
            amount?: number | null;
            currency?: string | null;
            prizeTextTh?: string | null;
            prizeTextEn?: string | null;
            descriptionTh?: string | null;
            descriptionEn?: string | null;
            sortOrder?: number;
            isActive?: boolean;
        };
    }>,
    reply: FastifyReply
) {
    const reward = await service.updateRewardAdmin(req.server.ctx.db, Number(req.params.id), req.body);
    return reply.send(ok(reward));
}

export async function handleDeleteRewardAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    await service.deleteRewardAdmin(req.server.ctx.db, Number(req.params.id));
    return reply.send(ok({ success: true }));
}
