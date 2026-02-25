import type { FastifyPluginAsync } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import { handleGetAllowlist, handleCreateAllowlist, handleUpdateAllowlist } from './admin.controller.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('preHandler', authRequired);
    fastify.addHook('preHandler', isAdmin);

    fastify.get('/allowlist', handleGetAllowlist);
    fastify.post('/allowlist', handleCreateAllowlist);
    fastify.patch('/allowlist/:allowId', handleUpdateAllowlist);
};

export default adminRoutes;
