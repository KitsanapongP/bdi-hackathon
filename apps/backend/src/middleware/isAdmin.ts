import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload } from '../modules/auth/auth.types.js';
import type { RowDataPacket } from 'mysql2/promise';

export async function isAdmin(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as JwtPayload | undefined;
    if (!user) {
        return reply.status(401).send({ ok: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(
        `SELECT 1 FROM access_allowlist WHERE user_id = :userId AND access_role = 'admin' AND is_active = 1 LIMIT 1`,
        { userId: user.userId }
    );

    if (!rows.length) {
        return reply.status(403).send({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
}
