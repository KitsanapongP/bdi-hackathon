import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler hook — verifies JWT token from cookie.
 * If invalid or missing, returns 401 Unauthorized.
 */
export async function authRequired(req: FastifyRequest, reply: FastifyReply) {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({ ok: false, message: 'กรุณาเข้าสู่ระบบ' });
    }
}
