import type { FastifyPluginAsync } from 'fastify';
import * as controller from './content.controller.js';

export const contentRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/rewards', controller.handleGetRewards);
};
