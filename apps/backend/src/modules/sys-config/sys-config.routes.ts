import type { FastifyPluginAsync } from 'fastify';
import { handleGetAll, handleGetByKey, handleUpdateConfig } from './sys-config.controller.js';

export const sysConfigRoutes: FastifyPluginAsync = async (app) => {
    app.get('/', handleGetAll);
    app.get('/:key', handleGetByKey);
    app.put('/:key', handleUpdateConfig);
};
