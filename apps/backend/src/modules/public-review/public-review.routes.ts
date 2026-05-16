import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import { getReviewFileByShareId, getReviewTeamByShareId } from './public-review.service.js';
import { AppError } from '../../shared/errors.js';

function buildContentDisposition(mode: 'inline' | 'attachment', fileName: string): string {
    const fallbackName = String(fileName || 'file')
        .replace(/[\\/\r\n"]/g, '_')
        .replace(/[^\x20-\x7E]/g, '_') || 'file';
    const encodedName = encodeURIComponent(fileName || fallbackName);
    return `${mode}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

export const publicReviewRoutes: FastifyPluginAsync = async (app) => {
    app.get('/files/:shareId', async (req: FastifyRequest<{ Params: { shareId: string } }>, reply) => {
        const shareId = String(req.params.shareId || '').trim();
        if (!shareId) {
            return reply.status(400).send({ ok: false, message: 'ลิงก์ไฟล์ไม่ถูกต้อง' });
        }

        try {
            const result = await getReviewFileByShareId(app.ctx.db, shareId);
            const query = req.query as { download?: string } | undefined;
            const dispositionMode = query?.download === '1' ? 'attachment' : 'inline';
            reply.header('Content-Type', result.contentType);
            reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
            reply.header('Content-Disposition', buildContentDisposition(dispositionMode, result.fileOriginalName));
            return reply.send(fs.createReadStream(result.absolutePath));
        } catch (err) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ ok: false, message: err.message });
            }
            throw err;
        }
    });

    app.get('/teams/:shareId', async (req: FastifyRequest<{ Params: { shareId: string } }>, reply) => {
        const shareId = String(req.params.shareId || '').trim();
        if (!shareId) {
            return reply.status(400).send({ ok: false, message: 'เธฅเธดเธเธเนเธฃเธตเธงเธดเธงเนเธกเนเธ–เธนเธเธ•เนเธญเธ' });
        }

        try {
            const host = String(req.headers.host || '').trim();
            const protocol = req.protocol || 'https';
            const publicBaseUrl = host ? `${protocol}://${host}` : '';
            const result = await getReviewTeamByShareId(app.ctx.db, shareId, publicBaseUrl);
            reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
            return reply.send({ ok: true, data: result });
        } catch (err) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ ok: false, message: err.message });
            }
            throw err;
        }
    });
};
