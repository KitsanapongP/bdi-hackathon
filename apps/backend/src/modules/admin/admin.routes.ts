import type { FastifyPluginAsync } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import { handleGetAllowlist, handleCreateAllowlist, handleUpdateAllowlist } from './admin.controller.js';
import * as panel from './admin.panel.controller.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('preHandler', authRequired);

    fastify.get('/me/access', panel.handleAdminAccess);

    fastify.post('/files', panel.handleUploadFile);

    fastify.addHook('preHandler', isAdmin);

    fastify.get('/allowlist', handleGetAllowlist);
    fastify.post('/allowlist', handleCreateAllowlist);
    fastify.patch('/allowlist/:allowId', handleUpdateAllowlist);

    fastify.get('/static/sponsors', panel.handleGetSponsors);
    fastify.post('/static/sponsors', panel.handleCreateSponsor);
    fastify.put('/static/sponsors/:id', panel.handleUpdateSponsor);
    fastify.delete('/static/sponsors/:id', panel.handleDeleteSponsor);

    fastify.get('/static/rewards', panel.handleGetRewards);
    fastify.post('/static/rewards', panel.handleCreateReward);
    fastify.put('/static/rewards/:id', panel.handleUpdateReward);
    fastify.delete('/static/rewards/:id', panel.handleDeleteReward);

    fastify.get('/static/about', panel.handleGetAbout);
    fastify.put('/static/about/:id', panel.handleUpdateAbout);

    fastify.get('/static/contacts', panel.handleGetContacts);
    fastify.post('/static/contacts', panel.handleCreateContact);
    fastify.put('/static/contacts/:id', panel.handleUpdateContact);
    fastify.delete('/static/contacts/:id', panel.handleDeleteContact);

    fastify.get('/static/winners', panel.handleGetWinners);
    fastify.post('/static/winners', panel.handleCreateWinner);
    fastify.put('/static/winners/:id', panel.handleUpdateWinner);
    fastify.delete('/static/winners/:id', panel.handleDeleteWinner);
    fastify.post('/static/winners/:id/publish', panel.handlePublishWinner);
    fastify.post('/static/winners/:id/unpublish', panel.handleUnpublishWinner);

    fastify.get('/requests', panel.handleListRequests);
    fastify.get('/requests/:submissionId', panel.handleRequestDetail);
    fastify.post('/requests/:submissionId/approve', panel.handleApproveRequest);
    fastify.post('/requests/:submissionId/reject', panel.handleRejectRequest);
};

export default adminRoutes;
