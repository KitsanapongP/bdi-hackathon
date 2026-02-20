import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './user.service.js';
import {
    updateProfileSchema,
    updatePrivacySchema,
    createSocialLinkSchema,
    updateSocialLinkSchema,
    updatePublicProfileSchema,
} from './user.schema.js';
import type { JwtPayload } from '../auth/auth.types.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';

/** Helper: extract authenticated userId from JWT */
function getUserId(req: FastifyRequest): number {
    return (req.user as JwtPayload).userId;
}

/* ═══════════════════════════════════════════════════
   1.6  Profile
   ═══════════════════════════════════════════════════ */

/** GET /api/user/profile */
export async function handleGetProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
        const profile = await service.getProfile(req.server.ctx.db, getUserId(req));
        return reply.send(ok(profile));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

/** PUT /api/user/profile */
export async function handleUpdateProfile(req: FastifyRequest, reply: FastifyReply) {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }

    try {
        const profile = await service.updateProfile(req.server.ctx.db, getUserId(req), parsed.data);
        return reply.send(ok(profile, 'อัปเดตโปรไฟล์สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

/* ═══════════════════════════════════════════════════
   1.7  Privacy settings
   ═══════════════════════════════════════════════════ */

/** GET /api/user/privacy */
export async function handleGetPrivacy(req: FastifyRequest, reply: FastifyReply) {
    const privacy = await service.getPrivacy(req.server.ctx.db, getUserId(req));
    return reply.send(ok(privacy));
}

/** PUT /api/user/privacy */
export async function handleUpdatePrivacy(req: FastifyRequest, reply: FastifyReply) {
    const parsed = updatePrivacySchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }

    const privacy = await service.updatePrivacy(req.server.ctx.db, getUserId(req), parsed.data);
    return reply.send(ok(privacy, 'อัปเดตการตั้งค่าความเป็นส่วนตัวสำเร็จ'));
}

/* ═══════════════════════════════════════════════════
   1.8  Social links
   ═══════════════════════════════════════════════════ */

/** GET /api/user/social-links */
export async function handleGetSocialLinks(req: FastifyRequest, reply: FastifyReply) {
    const links = await service.getSocialLinks(req.server.ctx.db, getUserId(req));
    return reply.send(ok(links));
}

/** POST /api/user/social-links */
export async function handleCreateSocialLink(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createSocialLinkSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }

    try {
        const link = await service.createSocialLink(req.server.ctx.db, getUserId(req), parsed.data);
        return reply.status(201).send(ok(link, 'เพิ่ม social link สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

/** PUT /api/user/social-links/:id */
export async function handleUpdateSocialLink(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const linkId = Number(id);
    if (Number.isNaN(linkId)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    const parsed = updateSocialLinkSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }

    try {
        const link = await service.updateSocialLink(req.server.ctx.db, linkId, getUserId(req), parsed.data);
        return reply.send(ok(link, 'อัปเดต social link สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

/** DELETE /api/user/social-links/:id */
export async function handleDeleteSocialLink(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const linkId = Number(id);
    if (Number.isNaN(linkId)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        await service.deleteSocialLink(req.server.ctx.db, linkId, getUserId(req));
        return reply.send(ok(null, 'ลบ social link สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

/* ═══════════════════════════════════════════════════
   1.9  Public profile
   ═══════════════════════════════════════════════════ */

/** GET /api/user/public-profile */
export async function handleGetMyPublicProfile(req: FastifyRequest, reply: FastifyReply) {
    const profile = await service.getPublicProfile(req.server.ctx.db, getUserId(req));
    return reply.send(ok(profile));
}

/** PUT /api/user/public-profile */
export async function handleUpdatePublicProfile(req: FastifyRequest, reply: FastifyReply) {
    const parsed = updatePublicProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }

    try {
        const profile = await service.updatePublicProfile(req.server.ctx.db, getUserId(req), parsed.data);
        return reply.send(ok(profile, 'อัปเดต public profile สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

/** GET /api/user/public-profile/:userId — view someone else's public profile */
export async function handleGetPublicProfile(req: FastifyRequest, reply: FastifyReply) {
    const { userId } = req.params as { userId: string };
    const uid = Number(userId);
    if (Number.isNaN(uid)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    const profile = await service.getPublicProfile(req.server.ctx.db, uid);
    if (!profile) {
        return reply.status(404).send({ ok: false, message: 'ไม่พบ public profile' });
    }
    return reply.send(ok(profile));
}

/** GET /api/user/looking-for-team — list users looking for team */
export async function handleLookingForTeam(req: FastifyRequest, reply: FastifyReply) {
    const profiles = await service.findLookingForTeam(req.server.ctx.db);
    return reply.send(ok(profiles));
}
