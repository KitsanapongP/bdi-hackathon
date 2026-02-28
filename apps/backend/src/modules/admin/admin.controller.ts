import type { FastifyRequest, FastifyReply } from 'fastify';
import { allowlistSchema, updateAllowlistSchema } from './admin.schema.js';
import * as service from './admin.service.js';
import * as contentService from '../content/content.service.js';
import * as authService from '../auth/auth.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import type { JwtPayload } from '../auth/auth.types.js';

export async function handleGetAdminMe(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as JwtPayload;
    const freshUser = await authService.getUserById(req.server.ctx.db, user.userId);
    return reply.send(ok({
        userId: freshUser.userId,
        userName: freshUser.userName,
        email: freshUser.email,
        accessRole: freshUser.accessRole,
        is_admin: freshUser.accessRole === 'admin',
    }));
}

export async function handleGetAllowlist(req: FastifyRequest, reply: FastifyReply) {
    try {
        const list = await service.getAllowlist(req.server.ctx.db);
        return reply.send(ok(list));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateAllowlist(req: FastifyRequest, reply: FastifyReply) {
    const parsed = allowlistSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = req.user as JwtPayload;
        const result = await service.createAllowlistEntry(req.server.ctx.db, parsed.data, user.userId);
        return reply.status(201).send(ok(result, 'เพิ่มสิทธิ์สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateAllowlist(req: FastifyRequest<{ Params: { allowId: string } }>, reply: FastifyReply) {
    const allowId = parseInt(req.params.allowId, 10);
    if (isNaN(allowId)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    const parsed = updateAllowlistSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await service.updateAllowlistEntry(req.server.ctx.db, allowId, parsed.data);
        return reply.send(ok(result, 'อัปเดตสิทธิ์สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetAllRewardsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const rewards = await contentService.getAllRewardsAdmin(req.server.ctx.db);
        return reply.send(ok(rewards));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateRewardAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await contentService.createRewardAdmin(req.server.ctx.db, req.body as any);
        return reply.status(201).send(ok(result, 'เพิ่มรางวัลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateRewardAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        const result = await contentService.updateRewardAdmin(req.server.ctx.db, id, req.body as any);
        return reply.send(ok(result, 'อัปเดตรางวัลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteRewardAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        await contentService.deleteRewardAdmin(req.server.ctx.db, id);
        return reply.send(ok({ success: true }, 'ลบรางวัลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}
