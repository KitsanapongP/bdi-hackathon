import type { FastifyPluginAsync } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import {
    handleGetAllowlist,
    handleGetDashboardOverview,
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
    handleGetAllContactsAdmin,
    handleCreateContactAdmin,
    handleUpdateContactAdmin,
    handleDeleteContactAdmin,
    handleReorderContactsAdmin,
    handleCreateContactChannelAdmin,
    handleUpdateContactChannelAdmin,
    handleDeleteContactChannelAdmin,
    handleReorderContactChannelsAdmin,
    handleGetScheduleAdminBundle,
    handleCreateScheduleItemAdmin,
    handleUpdateScheduleItemAdmin,
    handleDeleteScheduleItemAdmin,
    handleExportSubmittedVerificationBundle,
    handleGetSelectionTeams,
    handleSetSelectionResult,
    handleGetGlobalSelectionDeadline,
    handleSetGlobalSelectionDeadline,
} from './admin.controller.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('preHandler', authRequired);
    fastify.addHook('preHandler', isAdmin);

    fastify.get('/me', handleGetAdminMe);
    fastify.get('/dashboard/overview', handleGetDashboardOverview);
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

    fastify.get('/contacts', handleGetAllContactsAdmin);
    fastify.post('/contacts', handleCreateContactAdmin);
    fastify.put('/contacts/reorder', handleReorderContactsAdmin);
    fastify.patch('/contacts/:id', handleUpdateContactAdmin);
    fastify.delete('/contacts/:id', handleDeleteContactAdmin);

    fastify.post('/contacts/:contactId/channels', handleCreateContactChannelAdmin);
    fastify.put('/contacts/:contactId/channels/reorder', handleReorderContactChannelsAdmin);
    fastify.patch('/contacts/:contactId/channels/:channelId', handleUpdateContactChannelAdmin);
    fastify.delete('/contacts/:contactId/channels/:channelId', handleDeleteContactChannelAdmin);

    fastify.get('/schedules', handleGetScheduleAdminBundle);
    fastify.post('/schedules/items', handleCreateScheduleItemAdmin);
    fastify.patch('/schedules/items/:id', handleUpdateScheduleItemAdmin);
    fastify.delete('/schedules/items/:id', handleDeleteScheduleItemAdmin);

    fastify.get('/exports/submitted-verification-bundle', handleExportSubmittedVerificationBundle);
    fastify.get('/selection/teams', handleGetSelectionTeams);
    fastify.post('/selection/teams/:teamId/result', handleSetSelectionResult);
    fastify.get('/selection/global-deadline', handleGetGlobalSelectionDeadline);
    fastify.put('/selection/global-deadline', handleSetGlobalSelectionDeadline);
};

export default adminRoutes;
