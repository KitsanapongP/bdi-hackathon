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
};

export default adminRoutes;
