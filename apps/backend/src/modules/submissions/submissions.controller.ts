import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './submissions.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import fs from 'node:fs';

function splitAdvisorFullName(fullName: string, requireLastName = true): { firstName: string; lastName: string | null } {
    const tokens = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
        throw new AppError('กรุณากรอกชื่อ-นามสกุลอาจารย์ที่ปรึกษา', 400);
    }
    if (requireLastName && tokens.length < 2) {
        throw new AppError('กรุณากรอกชื่อ-นามสกุลอาจารย์ที่ปรึกษาให้ครบถ้วน', 400);
    }

    const firstName = tokens[0]!;
    const lastNameTokens = tokens.slice(1);
    return {
        firstName,
        lastName: lastNameTokens.length > 0 ? lastNameTokens.join(' ') : null,
    };
}

export async function getSubmissionData(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    try {
        const result = await service.getSubmissionData(db, Number(teamId), userId);
        return reply.send(ok(result));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function saveTaskLink(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, teamSubmissionTaskId } = req.params as { teamId: string; teamSubmissionTaskId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const { linkUrl } = req.body as { linkUrl: string | null };

    try {
        await service.saveTaskLink(db, Number(teamId), userId, Number(teamSubmissionTaskId), linkUrl);
        return reply.send(ok(null, 'บันทึกลิงก์สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function saveSubmissionTrack(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, teamSubmissionTaskId } = req.params as { teamId: string; teamSubmissionTaskId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const { submissionTrack } = req.body as { submissionTrack: string };

    try {
        await service.saveSubmissionTrack(db, Number(teamId), userId, Number(teamSubmissionTaskId), submissionTrack);
        return reply.send(ok(null, 'Saved submission track'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function uploadTaskFiles(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, teamSubmissionTaskId } = req.params as { teamId: string; teamSubmissionTaskId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    try {
        const parts = req.parts();
        const uploaded: { fileId: number; fileName: string }[] = [];

        for await (const part of parts) {
            if (part.type === 'file') {
                const result = await service.uploadSubmissionFile(db, Number(teamId), userId, Number(teamSubmissionTaskId), {
                    filename: part.filename,
                    mimetype: part.mimetype,
                    file: part.file,
                });
                uploaded.push(result);
            }
        }

        return reply.send(ok(uploaded, `อัปโหลดสำเร็จ ${uploaded.length} ไฟล์`));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function deleteFile(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, fileId } = req.params as { teamId: string; fileId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    try {
        await service.deleteSubmissionFile(db, Number(teamId), userId, Number(fileId));
        return reply.send(ok(null, 'ลบไฟล์สำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function downloadFile(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, fileId } = req.params as { teamId: string; fileId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    try {
        const file = await service.getSubmissionFileInfo(db, Number(teamId), userId, Number(fileId));
        const query = req.query as { download?: string } | undefined;
        const dispositionMode = query?.download === '1' ? 'attachment' : 'inline';
        const safeName = encodeURIComponent(file.fileOriginalName || 'file');

        reply.header('Content-Type', file.fileMimeType);
        reply.header('Content-Disposition', `${dispositionMode}; filename*=UTF-8''${safeName}`);
        return reply.send(fs.createReadStream(file.absolutePath));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function addAdvisor(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const body = req.body as {
        prefix?: string;
        fullNameTh: string;
        fullNameEn?: string;
        email?: string;
        phone?: string;
        institutionNameTh?: string;
    };

    try {
        const nameTh = splitAdvisorFullName(body.fullNameTh, true);
        const nameEn = body.fullNameEn?.trim() ? splitAdvisorFullName(body.fullNameEn, false) : null;
        const result = await service.addAdvisor(db, Number(teamId), userId, {
            prefix: body.prefix || null,
            firstNameTh: nameTh.firstName,
            lastNameTh: nameTh.lastName || '-',
            firstNameEn: nameEn?.firstName || null,
            lastNameEn: nameEn?.lastName || null,
            email: body.email || null,
            phone: body.phone || null,
            institutionNameTh: body.institutionNameTh || null,
        });
        return reply.status(201).send(ok(result, 'เพิ่มอาจารย์ที่ปรึกษาสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function updateAdvisorHandler(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, advisorId } = req.params as { teamId: string; advisorId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const body = req.body as {
        prefix?: string;
        fullNameTh: string;
        fullNameEn?: string;
        email?: string;
        phone?: string;
        institutionNameTh?: string;
    };

    try {
        const nameTh = splitAdvisorFullName(body.fullNameTh, true);
        const nameEn = body.fullNameEn?.trim() ? splitAdvisorFullName(body.fullNameEn, false) : null;
        await service.updateAdvisor(db, Number(teamId), userId, Number(advisorId), {
            prefix: body.prefix || null,
            firstNameTh: nameTh.firstName,
            lastNameTh: nameTh.lastName || '-',
            firstNameEn: nameEn?.firstName || null,
            lastNameEn: nameEn?.lastName || null,
            email: body.email || null,
            phone: body.phone || null,
            institutionNameTh: body.institutionNameTh || null,
        });
        return reply.send(ok(null, 'แก้ไขข้อมูลอาจารย์ที่ปรึกษาสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function removeAdvisorHandler(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, advisorId } = req.params as { teamId: string; advisorId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    try {
        await service.removeAdvisor(db, Number(teamId), userId, Number(advisorId));
        return reply.send(ok(null, 'ลบอาจารย์ที่ปรึกษาสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}
