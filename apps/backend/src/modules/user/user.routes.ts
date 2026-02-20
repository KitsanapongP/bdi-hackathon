import type { FastifyPluginAsync } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import {
    handleGetProfile,
    handleUpdateProfile,
    handleGetPrivacy,
    handleUpdatePrivacy,
    handleGetSocialLinks,
    handleCreateSocialLink,
    handleUpdateSocialLink,
    handleDeleteSocialLink,
    handleGetMyPublicProfile,
    handleUpdatePublicProfile,
    handleGetPublicProfile,
    handleLookingForTeam,
} from './user.controller.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
    /* ── All routes require auth ── */
    app.addHook('preHandler', authRequired);

    /* 1.6 Profile */
    app.get('/profile', handleGetProfile);
    app.put('/profile', handleUpdateProfile);

    /* 1.7 Privacy */
    app.get('/privacy', handleGetPrivacy);
    app.put('/privacy', handleUpdatePrivacy);

    /* 1.8 Social links */
    app.get('/social-links', handleGetSocialLinks);
    app.post('/social-links', handleCreateSocialLink);
    app.put('/social-links/:id', handleUpdateSocialLink);
    app.delete('/social-links/:id', handleDeleteSocialLink);

    /* 1.9 Public profile */
    app.get('/public-profile', handleGetMyPublicProfile);
    app.put('/public-profile', handleUpdatePublicProfile);
    app.get('/public-profile/:userId', handleGetPublicProfile);
    app.get('/looking-for-team', handleLookingForTeam);
};
