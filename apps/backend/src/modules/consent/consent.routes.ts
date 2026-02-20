import type { FastifyPluginAsync } from 'fastify';
import { handleGetDocuments, handleGetMyConsents, handleAcceptConsent } from './consent.controller.js';

export const consentRoutes: FastifyPluginAsync = async (app) => {
    app.get('/documents', handleGetDocuments);
    app.get('/me', handleGetMyConsents);
    app.post('/accept', handleAcceptConsent);
};
