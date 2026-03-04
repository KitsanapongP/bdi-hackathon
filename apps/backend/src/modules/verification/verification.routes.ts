import type { FastifyInstance } from 'fastify';
import * as ctrl from './verification.controller.js';

export async function verificationRoutes(app: FastifyInstance) {
    // All routes require authentication
    app.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            reply.code(401).send({ ok: false, message: 'Unauthorized' });
        }
    });

    // Get team verification status (all members + my docs)
    app.get('/team/:teamId/status', ctrl.getTeamVerificationStatus);

    // Upload identity document(s) — multipart
    app.post('/team/:teamId/documents', ctrl.uploadDocument);
    app.get('/team/:teamId/documents/:documentId/file', ctrl.downloadMyDocument);
    app.put('/team/:teamId/documents/:documentId/name', ctrl.renameMyDocument);

    // Delete a document
    app.delete('/team/:teamId/documents/:documentId', ctrl.deleteDocument);

    // Member confirms own documents
    app.post('/team/:teamId/confirm', ctrl.confirmMember);

    // Member cancels confirmation
    app.post('/team/:teamId/unconfirm', ctrl.unconfirmMember);

    // Leader submits entire team
    app.post('/team/:teamId/submit', ctrl.submitTeam);

    // Leader disbands team
    app.post('/team/:teamId/disband', ctrl.disbandTeam);
}
