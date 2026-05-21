import type { FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, loginSchema, registerVerifySchema, registerResendSchema, registerVerifyLinkSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js';
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const data = await service.requestRegistrationVerification(req.server.ctx.db, parsed.data, {
            acceptIp: req.ip || '0.0.0.0',
            userAgent: String(req.headers['user-agent'] || 'unknown'),
            origin: String(req.headers.origin || ''),
        });
        return reply.send(ok(data, 'ส่งรหัสยืนยันไปยังอีเมลแล้ว'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** POST /api/auth/register/verify */
export async function handleRegisterVerify(req: FastifyRequest, reply: FastifyReply) {
    const parsed = registerVerifySchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = await service.verifyRegistrationCode(req.server.ctx.db, parsed.data);

        const payload: JwtPayload = {
            userId: user.userId,
            email: user.email ?? '',
            userName: user.userName,
            accessRole: user.accessRole,
        };
        const token = req.server.jwt.sign(payload, { expiresIn: '7d' });

        setTokenCookie(reply, token);
        return reply.send(ok(user, 'ยืนยันอีเมลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** POST /api/auth/register/verify-link */
export async function handleRegisterVerifyLink(req: FastifyRequest, reply: FastifyReply) {
    const parsed = registerVerifyLinkSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = await service.verifyRegistrationLink(req.server.ctx.db, parsed.data);

        const payload: JwtPayload = {
            userId: user.userId,
            email: user.email ?? '',
            userName: user.userName,
            accessRole: user.accessRole,
        };
        const token = req.server.jwt.sign(payload, { expiresIn: '7d' });

        setTokenCookie(reply, token);
        return reply.send(ok(user, 'ยืนยันอีเมลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** POST /api/auth/register/resend */
export async function handleRegisterResend(req: FastifyRequest, reply: FastifyReply) {
    const parsed = registerResendSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const data = await service.resendRegistrationVerification(req.server.ctx.db, parsed.data, {
            origin: String(req.headers.origin || ''),
        });
        return reply.send(ok(data, 'ส่งรหัสยืนยันใหม่เรียบร้อย'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** POST /api/auth/forgot-password */
export async function handleForgotPassword(req: FastifyRequest, reply: FastifyReply) {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const data = await service.requestPasswordReset(req.server.ctx.db, parsed.data, {
            origin: String(req.headers.origin || ''),
        });
        return reply.send(ok(data, 'หากอีเมลนี้ได้ลงทะเบียนในระบบ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้ทางอีเมล'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

/** POST /api/auth/reset-password */
export async function handleResetPassword(req: FastifyRequest, reply: FastifyReply) {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await service.resetPasswordWithToken(req.server.ctx.db, parsed.data);
        reply.clearCookie(COOKIE_NAME, { path: '/' });
        return reply.send(ok(null, 'ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง'));
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        return reply.status(401).send({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
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
