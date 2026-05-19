import type { FastifyInstance } from 'fastify';
import * as ctrl from './submissions.controller.js';

export async function submissionsRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            reply.code(401).send({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
    });

    // Get all submission data (video link, files, advisors)
    app.get('/team/:teamId', ctrl.getSubmissionData);

    // Submission tasks
    app.put('/team/:teamId/tasks/:teamSubmissionTaskId/link', ctrl.saveTaskLink);
    app.put('/team/:teamId/tasks/:teamSubmissionTaskId/track', ctrl.saveSubmissionTrack);
    app.post('/team/:teamId/tasks/:teamSubmissionTaskId/files', ctrl.uploadTaskFiles);

    // Submission file actions
    app.delete('/team/:teamId/files/:fileId', ctrl.deleteFile);
    app.get('/team/:teamId/files/:fileId/download', ctrl.downloadFile);

    // Advisors
    app.post('/team/:teamId/advisors', ctrl.addAdvisor);
    app.put('/team/:teamId/advisors/:advisorId', ctrl.updateAdvisorHandler);
    app.delete('/team/:teamId/advisors/:advisorId', ctrl.removeAdvisorHandler);
}
