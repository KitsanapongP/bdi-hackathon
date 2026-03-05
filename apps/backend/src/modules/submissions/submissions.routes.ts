import type { FastifyInstance } from 'fastify';
import * as ctrl from './submissions.controller.js';

export async function submissionsRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            reply.code(401).send({ ok: false, message: 'Unauthorized' });
        }
    });

    // Get all submission data (video link, files, advisors)
    app.get('/team/:teamId', ctrl.getSubmissionData);

    // Video link
    app.put('/team/:teamId/video-link', ctrl.saveVideoLink);

    // Submission files
    app.post('/team/:teamId/files', ctrl.uploadFiles);
    app.delete('/team/:teamId/files/:fileId', ctrl.deleteFile);
    app.get('/team/:teamId/files/:fileId/download', ctrl.downloadFile);

    // Advisors
    app.post('/team/:teamId/advisors', ctrl.addAdvisor);
    app.put('/team/:teamId/advisors/:advisorId', ctrl.updateAdvisorHandler);
    app.delete('/team/:teamId/advisors/:advisorId', ctrl.removeAdvisorHandler);
}
