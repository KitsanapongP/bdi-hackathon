import type { FastifyRequest, FastifyReply } from 'fastify';
import {
    allowlistSchema,
    dashboardQuerySchema,
    updateAllowlistSchema,
    idParamSchema,
    venueIdParamSchema,
    venueImageParamSchema,
    contactIdParamSchema,
    contactChannelParamSchema,
    createVenueSchema,
    updateVenueSchema,
    reorderVenuesSchema,
    createVenueImageSchema,
    updateVenueImageSchema,
    reorderVenueImagesSchema,
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
    updateScheduleViewTypeSchema,
    createSubmissionTaskSchema,
    updateSubmissionTaskSchema,
    assignSubmissionTaskSchema,
    reorderSubmissionTasksSchema,
    selectionTeamsQuerySchema,
    selectionResultSchema,
    updateGlobalSelectionDeadlineSchema,
    exportTeamsSheetQuerySchema,
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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

export async function handleGetAllSponsorGroupsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const groups = await contentService.getAllSponsorGroupsAdmin(req.server.ctx.db);
        return reply.send(ok(groups));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateSponsorGroupAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await contentService.createSponsorGroupAdmin(req.server.ctx.db, req.body as any);
        return reply.status(201).send(ok(result, 'เพิ่มกลุ่มภาคีสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateSponsorGroupAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return reply.status(400).send({ ok: false, message: 'ID ไม่ถูกต้อง' });
    }

    try {
        const result = await contentService.updateSponsorGroupAdmin(req.server.ctx.db, id, req.body as any);
        return reply.send(ok(result, 'อัปเดตกลุ่มภาคีสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderSponsorGroupsAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const body = req.body as { updates: { id: number; sortOrder: number }[] };
        await contentService.reorderSponsorGroupsAdmin(req.server.ctx.db, body.updates);
        return reply.send(ok({ success: true }, 'จัดลำดับกลุ่มภาคีสำเร็จ'));
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

export async function handleGetAllVenuesAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const venues = await contentService.getAllVenuesAdmin(req.server.ctx.db);
        return reply.send(ok(venues));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateVenueAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsedBody = createVenueSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.createVenueAdmin(req.server.ctx.db, parsedBody.data);
        return reply.status(201).send(ok(result, 'เพิ่มสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateVenueAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateVenueSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.updateVenueAdmin(req.server.ctx.db, parsedParams.data.id, parsedBody.data);
        return reply.send(ok(result, 'อัปเดตสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteVenueAdmin(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.deleteVenueAdmin(req.server.ctx.db, parsedParams.data.id);
        return reply.send(ok({ success: true }, 'ลบสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderVenuesAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsedBody = reorderVenuesSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.reorderVenuesAdmin(req.server.ctx.db, parsedBody.data.updates || []);
        return reply.send(ok({ success: true }, 'จัดลำดับสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateVenueImageAdmin(
    req: FastifyRequest<{ Params: { venueId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = venueIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'venueId ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = createVenueImageSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.createVenueImageAdmin(req.server.ctx.db, parsedParams.data.venueId, parsedBody.data);
        return reply.status(201).send(ok(result, 'เพิ่มรูปสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateVenueImageAdmin(
    req: FastifyRequest<{ Params: { venueId: string; imageId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = venueImageParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateVenueImageSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await contentService.updateVenueImageAdmin(
            req.server.ctx.db,
            parsedParams.data.venueId,
            parsedParams.data.imageId,
            parsedBody.data
        );
        return reply.send(ok(result, 'อัปเดตรูปสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUploadVenueImageAdmin(
    req: FastifyRequest<{ Params: { venueId: string; imageId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = venueImageParamSchema.safeParse(req.params);
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
        const result = await contentService.uploadVenueImageAdmin(
            req.server.ctx.db,
            parsedParams.data.venueId,
            parsedParams.data.imageId,
            {
                stream: file.file,
                originalName: file.filename,
                mimeType: file.mimetype,
                requestedFileName: requestedFileName || null,
            },
        );

        return reply.send(ok(result, 'อัปโหลดรูปสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteVenueImageAdmin(
    req: FastifyRequest<{ Params: { venueId: string; imageId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = venueImageParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.deleteVenueImageAdmin(req.server.ctx.db, parsedParams.data.venueId, parsedParams.data.imageId);
        return reply.send(ok({ success: true }, 'ลบรูปสถานที่สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderVenueImagesAdmin(
    req: FastifyRequest<{ Params: { venueId: string } }>,
    reply: FastifyReply
) {
    const parsedParams = venueIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'venueId ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = reorderVenueImagesSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await contentService.reorderVenueImagesAdmin(
            req.server.ctx.db,
            parsedParams.data.venueId,
            parsedBody.data.updates || []
        );
        return reply.send(ok({ success: true }, 'จัดลำดับรูปสถานที่สำเร็จ'));
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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

export async function handleUpdateScheduleViewTypeAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateScheduleViewTypeSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await eventService.updateScheduleViewTypeAdmin(
            req.server.ctx.db,
            parsedParams.data.id,
            parsedBody.data.tableType
        );
        return reply.send(ok(result, 'อัปเดตรูปแบบตารางกำหนดการสำเร็จ'));
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

export async function handleExportTeamsSheet(req: FastifyRequest, reply: FastifyReply) {
    const parsed = exportTeamsSheetQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'รูปแบบข้อมูลไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const statuses = String(parsed.data.statuses || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        const host = String(req.headers.host || '').trim();
        const protocol = req.protocol || 'https';
        const publicBaseUrl = host ? `${protocol}://${host}` : '';
        const result = await service.exportTeamsSelectionSheet(req.server.ctx.db, statuses, publicBaseUrl);
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', buildAttachmentHeader(result.fileName));
        return reply.send(result.stream);
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleExportTeamsReviewSheet(req: FastifyRequest, reply: FastifyReply) {
    const parsed = exportTeamsSheetQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เธฃเธนเธเนเธเธเธเนเธญเธกเธนเธฅเนเธกเนเธ–เธนเธเธ•เนเธญเธ';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const statuses = String(parsed.data.statuses || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        const host = String(req.headers.host || '').trim();
        const protocol = req.protocol || 'https';
        const publicBaseUrl = host ? `${protocol}://${host}` : '';
        const result = await service.exportTeamsReviewSheet(req.server.ctx.db, statuses, publicBaseUrl);
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', buildAttachmentHeader(result.fileName));
        return reply.send(result.stream);
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetSubmissionTasksAdmin(req: FastifyRequest, reply: FastifyReply) {
    try {
        const rows = await service.listSubmissionTasksAdmin(req.server.ctx.db);
        return reply.send(ok(rows));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetSubmissionTaskAssignedTeamsAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const rows = await service.getSubmissionTaskAssignedTeamsAdmin(req.server.ctx.db, parsedParams.data.id);
        return reply.send(ok(rows));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleCreateSubmissionTaskAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createSubmissionTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = req.user as JwtPayload;
        const result = await service.createSubmissionTaskAdmin(req.server.ctx.db, parsed.data, user.userId);
        return reply.status(201).send(ok(result, 'สร้างงานส่งผลงานและ assign ทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateSubmissionTaskAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = updateSubmissionTaskSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await service.updateSubmissionTaskAdmin(
            req.server.ctx.db,
            parsedParams.data.id,
            parsedBody.data,
        );
        return reply.send(ok(result, 'อัปเดตงานส่งผลงานสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleAssignSubmissionTaskTeamsAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    const parsedBody = assignSubmissionTaskSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = req.user as JwtPayload;
        const result = await service.assignSubmissionTaskTeamsAdmin(
            req.server.ctx.db,
            parsedParams.data.id,
            parsedBody.data,
            user.userId,
        );
        return reply.send(ok(result, 'assign ทีมให้งานส่งผลงานสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleReorderSubmissionTasksAdmin(req: FastifyRequest, reply: FastifyReply) {
    const parsedBody = reorderSubmissionTasksSchema.safeParse(req.body);
    if (!parsedBody.success) {
        const firstError = parsedBody.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await service.reorderSubmissionTasksAdmin(req.server.ctx.db, parsedBody.data.updates);
        return reply.send(ok({ success: true }, 'จัดลำดับงานส่งผลงานสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleDeleteSubmissionTaskAdmin(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
) {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
        const firstError = parsedParams.error.issues[0]?.message ?? 'ID ไม่ถูกต้อง';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        await service.deleteSubmissionTaskAdmin(req.server.ctx.db, parsedParams.data.id);
        return reply.send(ok({ success: true }, 'ลบงานส่งผลงานสำเร็จ'));
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const user = req.user as JwtPayload;
        const row = await service.setSelectionResult(req.server.ctx.db, {
            teamId,
            adminUserId: user.userId,
            status: parsed.data.status,
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
        const value = await service.getGlobalSelectionConfirmWindow(req.server.ctx.db);
        return reply.send(ok(value));
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
        const firstError = parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้';
        return reply.status(400).send({ ok: false, message: firstError });
    }

    try {
        const result = await service.setGlobalSelectionConfirmWindow(
            req.server.ctx.db,
            parsed.data.openAt,
            parsed.data.closeAt,
        );
        return reply.send(ok(result, 'ตั้งค่า Global confirm window สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleExpireSelectionNotJoined(req: FastifyRequest, reply: FastifyReply) {
    try {
        const result = await service.expireSelectionConfirmTimedOutTeams(req.server.ctx.db);
        return reply.send(ok(result, 'อัปเดตทีมที่หมดเวลายืนยันเป็น not_joined สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}
