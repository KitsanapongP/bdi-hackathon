import type { FastifyPluginAsync } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import {
    handleGetAllowlist,
    handleCreateAllowlist,
    handleUpdateAllowlist,
    handleGetAdminMe,
    handleGetAllRewardsAdmin,
    handleCreateRewardAdmin,
    handleUpdateRewardAdmin,
    handleDeleteRewardAdmin,
    handleGetAllSponsorsAdmin,
    handleCreateSponsorAdmin,
    handleUpdateSponsorAdmin,
    handleDeleteSponsorAdmin,
    handleUploadSponsorLogoAdmin,
    handleReorderSponsorsAdmin,
} from './admin.controller.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('preHandler', authRequired);
    fastify.addHook('preHandler', isAdmin);

    fastify.get('/me', handleGetAdminMe);
    fastify.get('/allowlist', handleGetAllowlist);
    fastify.post('/allowlist', handleCreateAllowlist);
    fastify.patch('/allowlist/:allowId', handleUpdateAllowlist);

    fastify.get('/rewards', handleGetAllRewardsAdmin);
    fastify.post('/rewards', handleCreateRewardAdmin);
    fastify.patch('/rewards/:id', handleUpdateRewardAdmin);
    fastify.delete('/rewards/:id', handleDeleteRewardAdmin);

    fastify.get('/sponsors', handleGetAllSponsorsAdmin);
    fastify.post('/sponsors', handleCreateSponsorAdmin);
    fastify.patch('/sponsors/:id', handleUpdateSponsorAdmin);
    fastify.post('/sponsors/:id/logo', handleUploadSponsorLogoAdmin);
    fastify.delete('/sponsors/:id', handleDeleteSponsorAdmin);
    fastify.put('/sponsors/reorder', handleReorderSponsorsAdmin);
};

export default adminRoutes;
