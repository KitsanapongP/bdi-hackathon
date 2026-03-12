import type { FastifyInstance } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import * as controller from './teams.controller.js';

export async function teamsRoutes(app: FastifyInstance) {
    app.addHook('preHandler', authRequired);

    app.post('/', controller.handleCreateTeam);
    app.get('/', controller.handleGetPublicTeams);
    app.get('/:id', controller.handleGetTeamDetails);

    app.post('/:id/rotate-code', controller.handleRotateCode);
    app.post('/join-by-code', controller.handleJoinByCode);
    app.delete('/:id/members/:userId', controller.handleLeaveTeam);
    app.put('/:id/leader', controller.handleTransferLeader);
    app.put('/:id/visibility', controller.handleUpdateTeamVisibility);
    app.put('/:id/name', controller.handleUpdateTeamName);

    app.post('/:id/join-requests', controller.handleSubmitJoinRequest);
    app.get('/:id/join-requests', controller.handleGetPendingJoinRequests);
    app.put('/:id/join-requests/:requestId', controller.handleRespondJoinRequest);

    app.post('/:id/invitations', controller.handleSendInvitation);
    app.get('/my-invitations', controller.handleGetMyInvitations);
    app.put('/invitations/:invitationId', controller.handleRespondInvitation);
    app.get('/:id/inbox', controller.handleGetTeamInbox);
    app.post('/inbox/:notificationLogId/read', controller.handleMarkTeamInboxRead);
    app.post('/:id/confirm-participation', controller.handleConfirmParticipation);
}
