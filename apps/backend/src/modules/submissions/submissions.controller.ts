import type { FastifyRequest, FastifyReply } from 'fastify';
import * as service from './submissions.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import fs from 'node:fs';

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

export async function saveVideoLink(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const { videoLink } = req.body as { videoLink: string | null };

    try {
        await service.saveVideoLink(db, Number(teamId), userId, videoLink);
        return reply.send(ok(null, 'บันทึกลิงก์วิดีโอสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
        throw err;
    }
}

export async function uploadFiles(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    try {
        const parts = req.parts();
        const uploaded: { fileId: number; fileName: string }[] = [];

        for await (const part of parts) {
            if (part.type === 'file') {
                const result = await service.uploadSubmissionFile(db, Number(teamId), userId, {
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
        firstNameTh: string;
        lastNameTh: string;
        firstNameEn?: string;
        lastNameEn?: string;
        email?: string;
        phone?: string;
        institutionNameTh?: string;
        position?: string;
    };

    try {
        const result = await service.addAdvisor(db, Number(teamId), userId, {
            prefix: body.prefix || null,
            firstNameTh: body.firstNameTh,
            lastNameTh: body.lastNameTh,
            firstNameEn: body.firstNameEn || null,
            lastNameEn: body.lastNameEn || null,
            email: body.email || null,
            phone: body.phone || null,
            institutionNameTh: body.institutionNameTh || null,
            position: body.position || null,
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
        firstNameTh: string;
        lastNameTh: string;
        firstNameEn?: string;
        lastNameEn?: string;
        email?: string;
        phone?: string;
        institutionNameTh?: string;
        position?: string;
    };

    try {
        await service.updateAdvisor(db, Number(teamId), userId, Number(advisorId), {
            prefix: body.prefix || null,
            firstNameTh: body.firstNameTh,
            lastNameTh: body.lastNameTh,
            firstNameEn: body.firstNameEn || null,
            lastNameEn: body.lastNameEn || null,
            email: body.email || null,
            phone: body.phone || null,
            institutionNameTh: body.institutionNameTh || null,
            position: body.position || null,
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
