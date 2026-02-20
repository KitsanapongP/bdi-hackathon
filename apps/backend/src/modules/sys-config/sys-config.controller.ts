import type { FastifyRequest, FastifyReply } from 'fastify';
import { updateConfigSchema } from './sys-config.schema.js';
import * as service from './sys-config.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';

/** GET /api/sys-config */
export async function handleGetAll(req: FastifyRequest, reply: FastifyReply) {
    const configs = await service.getAllConfigs(req.server.ctx.db);
    return reply.send(ok(configs));
}

/** GET /api/sys-config/:key */
export async function handleGetByKey(
    req: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply,
) {
    try {
        const config = await service.getConfigByKey(req.server.ctx.db, req.params.key);
        return reply.send(ok(config));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** PUT /api/sys-config/:key */
export async function handleUpdateConfig(
    req: FastifyRequest<{ Params: { key: string } }>,
    reply: FastifyReply,
) {
    const parsed = updateConfigSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const config = await service.updateConfig(
            req.server.ctx.db,
            req.params.key,
            parsed.data.configValue,
        );
        return reply.send(ok(config, 'อัพเดท config สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}
