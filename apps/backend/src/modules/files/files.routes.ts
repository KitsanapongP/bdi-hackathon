import type { FastifyPluginAsync } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { handleUploadFile, handleReadFile } from '../admin/admin.panel.controller.js';

export const filesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authRequired);
  fastify.post('/', handleUploadFile);
  fastify.get('/:fileId', handleReadFile);
};
