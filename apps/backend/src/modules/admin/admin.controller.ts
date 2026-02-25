import type { FastifyRequest, FastifyReply } from 'fastify';
import { allowlistSchema, updateAllowlistSchema } from './admin.schema.js';
import * as service from './admin.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import type { JwtPayload } from '../auth/auth.types.js';

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
