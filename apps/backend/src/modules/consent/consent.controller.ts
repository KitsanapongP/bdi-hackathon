import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './consent.service.js';
import { acceptConsentSchema } from './consent.schema.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';

/** GET /api/consent/documents — list active consent documents */
export async function handleGetDocuments(req: FastifyRequest, reply: FastifyReply) {
    const docs = await service.getActiveDocuments(req.server.ctx.db);
    return reply.send(ok(docs));
}

/** GET /api/consent/me — get current user's consent status */
export async function handleGetMyConsents(req: FastifyRequest, reply: FastifyReply) {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({ ok: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    const decoded = req.user as JwtPayload;
    const consents = await service.getUserConsentStatus(req.server.ctx.db, decoded.userId);
    return reply.send(ok(consents));
}

/** POST /api/consent/accept — accept a consent document */
export async function handleAcceptConsent(req: FastifyRequest, reply: FastifyReply) {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({ ok: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    const parsed = acceptConsentSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const decoded = req.user as JwtPayload;

    try {
        await service.acceptDocument(
            req.server.ctx.db,
            decoded.userId,
            parsed.data.consentDocId,
            {
                acceptSource: 'web_form',
                acceptIp: req.ip || '0.0.0.0',
                userAgent: req.headers['user-agent'] || 'unknown',
            },
        );
        return reply.status(201).send(ok(null, 'ยอมรับข้อตกลงสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}
