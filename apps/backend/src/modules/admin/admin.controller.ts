import type { FastifyRequest, FastifyReply } from 'fastify';
import {
    allowlistSchema,
    dashboardQuerySchema,
    updateAllowlistSchema,
    idParamSchema,
    contactIdParamSchema,
    contactChannelParamSchema,
    createContactSchema,
    updateContactSchema,
    reorderContactsSchema,
    createCarouselSchema,
    updateCarouselSchema,
    reorderCarouselsSchema,
    createContactChannelSchema,
    updateContactChannelSchema,
    reorderContactChannelsSchema,
    createScheduleItemSchema,
    updateScheduleItemSchema,
    selectionTeamsQuerySchema,
    selectionResultSchema,
    updateGlobalSelectionDeadlineSchema,
} from './admin.schema.js';
import * as service from './admin.service.js';
import * as contentService from '../content/content.service.js';
import * as authService from '../auth/auth.service.js';
import * as eventService from '../events/events.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import type { JwtPayload } from '../auth/auth.types.js';

function buildAttachmentHeader(fileName: string): string {
    const safeName = encodeURIComponent(fileName || 'export.zip');
    return `attachment; filename*=UTF-8''${safeName}`;
}

export async function handleGetAdminMe(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as JwtPayload;
    const freshUser = await authService.getUserById(req.server.ctx.db, user.userId);
    return reply.send(ok({
        userId: freshUser.userId,
        userName: freshUser.userName,
        email: freshUser.email,
        accessRole: freshUser.accessRole,
        is_admin: freshUser.accessRole === 'admin',
    }));
}

export async function handleGetDashboardOverview(req: FastifyRequest, reply: FastifyReply) {
    const parsed = dashboardQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูล query ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await service.getDashboardOverview(req.server.ctx.db, parsed.data);
        return reply.send(ok(result));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

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

export async function handleGetAllRewardsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const rewards = await contentService.getAllRewardsAdmin(req.server.ctx.db);
        return reply.send(ok(rewards));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateRewardAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await contentService.createRewardAdmin(req.server.ctx.db, req.body as any);
        return reply.status(201).send(ok(result, 'เพิ่มรางวัลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateRewardAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        const result = await contentService.updateRewardAdmin(req.server.ctx.db, id, req.body as any);
        return reply.send(ok(result, 'อัปเดตรางวัลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteRewardAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        await contentService.deleteRewardAdmin(req.server.ctx.db, id);
        return reply.send(ok({ success: true }, 'ลบรางวัลสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetAllSponsorsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const sponsors = await contentService.getAllSponsorsAdmin(req.server.ctx.db);
        return reply.send(ok(sponsors));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateSponsorAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await contentService.createSponsorAdmin(req.server.ctx.db, req.body as any);
        return reply.status(201).send(ok(result, 'เพิ่ม Sponsor สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateSponsorAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        const result = await contentService.updateSponsorAdmin(req.server.ctx.db, id, req.body as any);
        return reply.send(ok(result, 'อัปเดต Sponsor สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteSponsorAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        await contentService.deleteSponsorAdmin(req.server.ctx.db, id);
        return reply.send(ok({ success: true }, 'ลบ Sponsor สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUploadSponsorLogoAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        const file = await (req as any).file();
        if (!file) {
            return reply.status(400).send({ ok: false, message: 'กรุณาแนบไฟล์โลโก้' });
        }

        const requestedFileName = (file.fields?.fileName?.value || '').toString();
        const tierCode = (file.fields?.tierCode?.value || '').toString();

        const result = await contentService.uploadSponsorLogoAdmin(req.server.ctx.db, id, {
            stream: file.file,
            originalName: file.filename,
            mimeType: file.mimetype,
            requestedFileName: requestedFileName || null,
            tierCode: tierCode || null,
        });

        return reply.send(ok(result, 'อัปโหลดโลโก้สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderSponsorsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = req.body as { updates: { id: number; displayOrder: number }[] };
        await contentService.reorderSponsorsAdmin(req.server.ctx.db, body.updates);
        return reply.send(ok({ success: true }, 'จัดลำดับ Sponsor สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetPageByCodeAdmin(
    req: FastifyRequest<{ Params: { pageCode: string } }>,
    reply: FastifyReply
) {
    try {
        const page = await contentService.getPageByCodeAdmin(req.server.ctx.db, req.params.pageCode);
        return reply.send(ok(page));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdatePageByCodeAdmin(
    req: FastifyRequest<{
        Params: { pageCode: string };
        Body: {
            titleTh?: string;
            titleEn?: string;
            contentHtmlTh?: string | null;
            contentHtmlEn?: string | null;
            isPublished?: boolean;
        };
    }>,
    reply: FastifyReply
) {
    try {
        const page = await contentService.updatePageByCodeAdmin(req.server.ctx.db, req.params.pageCode, req.body || {});
        return reply.send(ok(page, 'อัปเดต static page สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetAllCarouselsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const carousels = await contentService.getAllCarouselsAdmin(req.server.ctx.db);
        return reply.send(ok(carousels));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateCarouselAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsedBody = createCarouselSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = req.user as JwtPayload;
        const result = await contentService.createCarouselAdmin(req.server.ctx.db, parsedBody.data, user.userId);
        return reply.status(201).send(ok(result, 'เพิ่ม carousel slide สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateCarouselAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateCarouselSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.updateCarouselAdmin(req.server.ctx.db, parsedParams.data.id, parsedBody.data);
        return reply.send(ok(result, 'อัปเดต carousel slide สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteCarouselAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.deleteCarouselAdmin(req.server.ctx.db, parsedParams.data.id);
        return reply.send(ok({ success: true }, 'ลบ carousel slide สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderCarouselsAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsedBody = reorderCarouselsSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.reorderCarouselsAdmin(req.server.ctx.db, parsedBody.data.updates || []);
        return reply.send(ok({ success: true }, 'จัดลำดับ carousel สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUploadCarouselImageAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const file = await (req as any).file();
        if (!file) {
            return reply.status(400).send({ ok: false, message: 'กรุณาแนบไฟล์รูปภาพ' });
        }

        const requestedFileName = (file.fields?.fileName?.value || '').toString();
        const result = await contentService.uploadCarouselImageAdmin(req.server.ctx.db, parsedParams.data.id, {
            stream: file.file,
            originalName: file.filename,
            mimeType: file.mimetype,
            requestedFileName: requestedFileName || null,
        });

        return reply.send(ok(result, 'อัปโหลดรูปภาพสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetAllContactsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const contacts = await contentService.getAllContactsAdmin(req.server.ctx.db);
        return reply.send(ok(contacts));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateContactAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createContactSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.createContactAdmin(req.server.ctx.db, parsed.data);
        return reply.status(201).send(ok(result, 'เพิ่ม contact สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateContactAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateContactSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.updateContactAdmin(req.server.ctx.db, parsedParams.data.id, parsedBody.data as any);
        return reply.send(ok(result, 'อัปเดต contact สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteContactAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.deleteContactAdmin(req.server.ctx.db, parsedParams.data.id);
        return reply.send(ok({ success: true }, 'ลบ contact สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderContactsAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsed = reorderContactsSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.reorderContactsAdmin(req.server.ctx.db, parsed.data.updates || []);
        return reply.send(ok({ success: true }, 'จัดลำดับ contact สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateContactChannelAdmin(
    req: FastifyRequest<{ Params: { contactId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = contactIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'contactId ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = createContactChannelSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.createContactChannelAdmin(req.server.ctx.db, parsedParams.data.contactId, parsedBody.data);
        return reply.status(201).send(ok(result, 'เพิ่มช่องทางติดต่อสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateContactChannelAdmin(
    req: FastifyRequest<{ Params: { contactId: string; channelId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = contactChannelParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateContactChannelSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.updateContactChannelAdmin(
            req.server.ctx.db,
            parsedParams.data.contactId,
            parsedParams.data.channelId,
            parsedBody.data
        );
        return reply.send(ok(result, 'อัปเดตช่องทางติดต่อสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteContactChannelAdmin(
    req: FastifyRequest<{ Params: { contactId: string; channelId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = contactChannelParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.deleteContactChannelAdmin(
            req.server.ctx.db,
            parsedParams.data.contactId,
            parsedParams.data.channelId
        );
        return reply.send(ok({ success: true }, 'ลบช่องทางติดต่อสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderContactChannelsAdmin(
    req: FastifyRequest<{ Params: { contactId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = contactIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'contactId ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = reorderContactChannelsSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.reorderContactChannelsAdmin(
            req.server.ctx.db,
            parsedParams.data.contactId,
            parsedBody.data.updates || []
        );
        return reply.send(ok({ success: true }, 'จัดลำดับช่องทางติดต่อสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetScheduleAdminBundle(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await eventService.getScheduleAdminBundle(req.server.ctx.db);
        return reply.send(ok(result));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateScheduleItemAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createScheduleItemSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await eventService.createScheduleItemAdmin(req.server.ctx.db, parsed.data);
        return reply.status(201).send(ok(result, 'เพิ่มรายการกำหนดการสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateScheduleItemAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateScheduleItemSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await eventService.updateScheduleItemAdmin(req.server.ctx.db, parsedParams.data.id, parsedBody.data);
        return reply.send(ok(result, 'อัปเดตรายการกำหนดการสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteScheduleItemAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await eventService.deleteScheduleItemAdmin(req.server.ctx.db, parsedParams.data.id);
        return reply.send(ok({ success: true }, 'ลบรายการกำหนดการสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleExportSubmittedVerificationBundle(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await service.exportSubmittedVerificationBundle(req.server.ctx.db);
        reply.header('Content-Type', 'application/zip');
        reply.header('Content-Disposition', buildAttachmentHeader(result.fileName));
        return reply.send(result.stream);
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetSelectionTeams(req: FastifyRequest, reply: FastifyReply) {
    const parsed = selectionTeamsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const rows = await service.getSelectionTeams(req.server.ctx.db, parsed.data.status);
        return reply.send(ok(rows));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleSetSelectionResult(
    req: FastifyRequest<{ Params: { teamId: string } }>,
    reply: FastifyReply,
) {
    const teamId = Number(req.params.teamId);
    if (!Number.isFinite(teamId)) {
        return reply.status(400).send({ ok: false, message: 'teamId ไม่ถูกต้อง' });
    }

    const parsed = selectionResultSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = req.user as JwtPayload;
        const row = await service.setSelectionResult(req.server.ctx.db, {
            teamId,
            adminUserId: user.userId,
            status: parsed.data.status,
            confirmDeadlineAt: parsed.data.confirmDeadlineAt ?? null,
        });
        return reply.send(ok(row, 'บันทึกผลคัดเลือกสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetGlobalSelectionDeadline(req: FastifyRequest, reply: FastifyReply) {
    try {
        const value = await service.getGlobalSelectionDeadline(req.server.ctx.db);
        return reply.send(ok({ confirmDeadlineAt: value }));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleSetGlobalSelectionDeadline(req: FastifyRequest, reply: FastifyReply) {
    const parsed = updateGlobalSelectionDeadlineSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await service.setGlobalSelectionDeadline(req.server.ctx.db, parsed.data.confirmDeadlineAt);
        return reply.send(ok(result, 'ตั้งค่า Global deadline สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}
