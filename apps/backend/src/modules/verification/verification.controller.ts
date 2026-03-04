import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as service from './verification.service.js';
import { ok } from '../../shared/response.js';
import fs from 'node:fs';

export async function getTeamVerificationStatus(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    const result = await service.getTeamVerificationStatus(db, Number(teamId), userId);
    return reply.send(ok(result));
}

export async function uploadDocument(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    const parts = req.parts();
    const uploaded: { documentId: number; fileName: string }[] = [];

    for await (const part of parts) {
        if (part.type === 'file') {
            const result = await service.uploadDocument(db, Number(teamId), userId, {
                filename: part.filename,
                mimetype: part.mimetype,
                file: part.file,
            });
            uploaded.push(result);
        }
    }

    return reply.send(ok(uploaded, `อัปโหลดสำเร็จ ${uploaded.length} ไฟล์`));
}

export async function deleteDocument(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, documentId } = req.params as { teamId: string; documentId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    await service.deleteDocument(db, Number(teamId), userId, Number(documentId));
    return reply.send(ok(null, 'ลบเอกสารสำเร็จ'));
}

export async function downloadMyDocument(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, documentId } = req.params as { teamId: string; documentId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const query = req.query as { download?: string } | undefined;

    const file = await service.getMyDocumentFileInfo(db, Number(teamId), userId, Number(documentId));
    const dispositionMode = query?.download === '1' ? 'attachment' : 'inline';
    const safeName = encodeURIComponent(file.fileOriginalName || 'document.pdf');

    reply.header('Content-Type', file.fileMimeType);
    reply.header('Content-Disposition', `${dispositionMode}; filename*=UTF-8''${safeName}`);
    return reply.send(fs.createReadStream(file.absolutePath));
}

export async function renameMyDocument(req: FastifyRequest, reply: FastifyReply) {
    const { teamId, documentId } = req.params as { teamId: string; documentId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const { fileOriginalName } = req.body as { fileOriginalName: string };

    await service.renameMyDocument(db, Number(teamId), userId, Number(documentId), fileOriginalName);
    return reply.send(ok(null, 'แก้ไขชื่อไฟล์สำเร็จ'));
}

export async function confirmMember(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    await service.confirmMember(db, Number(teamId), userId);
    return reply.send(ok(null, 'ยืนยันเอกสารสำเร็จ'));
}

export async function unconfirmMember(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    await service.unconfirmMember(db, Number(teamId), userId);
    return reply.send(ok(null, 'ยกเลิกการยืนยันสำเร็จ'));
}

export async function submitTeam(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;

    await service.submitTeam(db, Number(teamId), userId);
    return reply.send(ok(null, 'ส่งเอกสารยืนยันตัวตนทั้งทีมสำเร็จ'));
}

export async function disbandTeam(req: FastifyRequest, reply: FastifyReply) {
    const { teamId } = req.params as { teamId: string };
    const userId = (req.user as any).userId;
    const db = req.server.ctx.db;
    const { reason } = req.body as { reason: string };

    await service.disbandTeamAction(db, Number(teamId), userId, reason);
    return reply.send(ok(null, 'ยุบทีมสำเร็จ'));
}
