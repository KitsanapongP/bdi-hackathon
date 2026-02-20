import type { FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, loginSchema } from './auth.schema.js';
import * as service from './auth.service.js';
import type { JwtPayload } from './auth.types.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function setTokenCookie(reply: FastifyReply, token: string) {
    reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE_SECONDS,
    });
}

/** POST /api/auth/register */
export async function handleRegister(req: FastifyRequest, reply: FastifyReply) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = await service.registerUser(req.server.ctx.db, parsed.data);

        const payload: JwtPayload = {
            userId: user.userId,
            email: user.email ?? '',
            userName: user.userName,
            accessRole: user.accessRole,
        };
        const token = req.server.jwt.sign(payload, { expiresIn: '7d' });

        setTokenCookie(reply, token);
        return reply.status(201).send(ok(user, 'สมัครสมาชิกสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** POST /api/auth/login */
export async function handleLogin(req: FastifyRequest, reply: FastifyReply) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = await service.loginUser(req.server.ctx.db, parsed.data);

        const payload: JwtPayload = {
            userId: user.userId,
            email: user.email ?? '',
            userName: user.userName,
            accessRole: user.accessRole,
        };
        const token = req.server.jwt.sign(payload, { expiresIn: '7d' });

        setTokenCookie(reply, token);
        return reply.send(ok(user, 'เข้าสู่ระบบสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** GET /api/auth/me */
export async function handleMe(req: FastifyRequest, reply: FastifyReply) {
    try {
        await req.jwtVerify();
    } catch {
        return reply.status(401).send({ ok: false, message: 'กรุณาเข้าสู่ระบบ' });
    }

    const decoded = req.user as JwtPayload;
    const user = await service.getUserById(req.server.ctx.db, decoded.userId);
    return reply.send(ok(user));
}

/** POST /api/auth/logout */
export async function handleLogout(_req: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return reply.send({ ok: true, message: 'ออกจากระบบสำเร็จ' });
}
