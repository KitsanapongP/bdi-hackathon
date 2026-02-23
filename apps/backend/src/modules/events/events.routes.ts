import type { FastifyPluginAsync } from 'fastify';
import * as controller from './events.controller.js';

export const eventsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/schedules', controller.handleGetSchedules);
};
