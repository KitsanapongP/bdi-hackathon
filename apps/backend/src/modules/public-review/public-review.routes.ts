import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import { getReviewFileByShareId } from './public-review.service.js';
import { AppError } from '../../shared/errors.js';

export const publicReviewRoutes: FastifyPluginAsync = async (app) => {
    app.get('/files/:shareId', async (req: FastifyRequest<{ Params: { shareId: string } }>, reply) => {
        const shareId = String(req.params.shareId || '').trim();
        if (!shareId) {
            return reply.status(400).send({ ok: false, message: 'ลิงก์ไฟล์ไม่ถูกต้อง' });
        }

        try {
            const result = await getReviewFileByShareId(app.ctx.db, shareId);
            reply.header('Content-Type', result.contentType);
            reply.header('X-Robots-Tag', 'noindex, nofollow, noarchive');
            reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileOriginalName)}"`);
            return reply.send(fs.createReadStream(result.absolutePath));
        } catch (err) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ ok: false, message: err.message });
            }
            throw err;
        }
    });
};
