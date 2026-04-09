import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler hook — verifies JWT token from cookie.
 * If invalid or missing, returns 401.
 */
export async function authRequired(req: FastifyRequest, reply: FastifyReply) {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
}
