import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from '../modules/auth/auth.types.js';

/**
 * Fastify preHandler hook — checks that the authenticated user
 * has either 'judge' or 'admin' role in access_allowlist (via JWT accessRole claim).
 * Must be used AFTER authRequired middleware.
 */
export async function isJudge(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as JwtPayload | undefined;

    if (!user || (user.accessRole !== 'judge' && user.accessRole !== 'admin')) {
        return reply.status(403).send({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็นกรรมการหรือแอดมิน)' });
    }
}
