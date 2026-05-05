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
    handleGetPageByCodeAdmin,
    handleCreateRewardAdmin,
    handleUpdateRewardAdmin,
    handleDeleteRewardAdmin,
    handleGetAllSponsorsAdmin,
    handleGetAllSponsorGroupsAdmin,
    handleCreateSponsorGroupAdmin,
    handleUpdateSponsorGroupAdmin,
    handleReorderSponsorGroupsAdmin,
    handleCreateSponsorAdmin,
    handleUpdateSponsorAdmin,
    handleDeleteSponsorAdmin,
    handleUploadSponsorLogoAdmin,
    handleReorderSponsorsAdmin,
    handleGetAllVenuesAdmin,
    handleCreateVenueAdmin,
    handleUpdateVenueAdmin,
    handleDeleteVenueAdmin,
    handleReorderVenuesAdmin,
    handleCreateVenueImageAdmin,
    handleUpdateVenueImageAdmin,
    handleUploadVenueImageAdmin,
    handleDeleteVenueImageAdmin,
    handleReorderVenueImagesAdmin,
    handleGetAllCarouselsAdmin,
    handleCreateCarouselAdmin,
    handleUpdateCarouselAdmin,
    handleDeleteCarouselAdmin,
    handleReorderCarouselsAdmin,
    handleUploadCarouselImageAdmin,
    handleGetAllContactsAdmin,
    handleCreateContactAdmin,
    handleUpdateContactAdmin,
    handleDeleteContactAdmin,
    handleReorderContactsAdmin,
    handleCreateContactChannelAdmin,
    handleUpdateContactChannelAdmin,
    handleDeleteContactChannelAdmin,
    handleReorderContactChannelsAdmin,
    handleUpdatePageByCodeAdmin,
    handleGetScheduleAdminBundle,
    handleCreateScheduleItemAdmin,
    handleUpdateScheduleItemAdmin,
    handleDeleteScheduleItemAdmin,
    handleUpdateScheduleViewTypeAdmin,
    handleExportSubmittedVerificationBundle,
    handleExportTeamsSheet,
    handleGetSubmissionTasksAdmin,
    handleGetSubmissionTaskAssignedTeamsAdmin,
    handleCreateSubmissionTaskAdmin,
    handleUpdateSubmissionTaskAdmin,
    handleAssignSubmissionTaskTeamsAdmin,
    handleReorderSubmissionTasksAdmin,
    handleDeleteSubmissionTaskAdmin,
    handleGetSelectionTeams,
    handleSetSelectionResult,
    handleGetGlobalSelectionDeadline,
    handleSetGlobalSelectionDeadline,
    handleExpireSelectionNotJoined,
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
    fastify.get('/pages/:pageCode', handleGetPageByCodeAdmin);
    fastify.put('/pages/:pageCode', handleUpdatePageByCodeAdmin);
    fastify.post('/rewards', handleCreateRewardAdmin);
    fastify.patch('/rewards/:id', handleUpdateRewardAdmin);
    fastify.delete('/rewards/:id', handleDeleteRewardAdmin);

    fastify.get('/sponsors', handleGetAllSponsorsAdmin);
    fastify.get('/sponsor-groups', handleGetAllSponsorGroupsAdmin);
    fastify.post('/sponsor-groups', handleCreateSponsorGroupAdmin);
    fastify.patch('/sponsor-groups/:id', handleUpdateSponsorGroupAdmin);
    fastify.put('/sponsor-groups/reorder', handleReorderSponsorGroupsAdmin);
    fastify.post('/sponsors', handleCreateSponsorAdmin);
    fastify.patch('/sponsors/:id', handleUpdateSponsorAdmin);
    fastify.post('/sponsors/:id/logo', handleUploadSponsorLogoAdmin);
    fastify.delete('/sponsors/:id', handleDeleteSponsorAdmin);
    fastify.put('/sponsors/reorder', handleReorderSponsorsAdmin);

    fastify.get('/venues', handleGetAllVenuesAdmin);
    fastify.post('/venues', handleCreateVenueAdmin);
    fastify.patch('/venues/:id', handleUpdateVenueAdmin);
    fastify.delete('/venues/:id', handleDeleteVenueAdmin);
    fastify.put('/venues/reorder', handleReorderVenuesAdmin);
    fastify.post('/venues/:venueId/images', handleCreateVenueImageAdmin);
    fastify.put('/venues/:venueId/images/reorder', handleReorderVenueImagesAdmin);
    fastify.patch('/venues/:venueId/images/:imageId', handleUpdateVenueImageAdmin);
    fastify.post('/venues/:venueId/images/:imageId/upload', handleUploadVenueImageAdmin);
    fastify.delete('/venues/:venueId/images/:imageId', handleDeleteVenueImageAdmin);

    fastify.get('/carousels', handleGetAllCarouselsAdmin);
    fastify.post('/carousels', handleCreateCarouselAdmin);
    fastify.patch('/carousels/:id', handleUpdateCarouselAdmin);
    fastify.post('/carousels/:id/image', handleUploadCarouselImageAdmin);
    fastify.delete('/carousels/:id', handleDeleteCarouselAdmin);
    fastify.put('/carousels/reorder', handleReorderCarouselsAdmin);

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
    fastify.patch('/schedules/:id/view-type', handleUpdateScheduleViewTypeAdmin);

    fastify.get('/exports/submitted-verification-bundle', handleExportSubmittedVerificationBundle);
    fastify.get('/exports/teams-selection-sheet', handleExportTeamsSheet);
    fastify.get('/submission-tasks', handleGetSubmissionTasksAdmin);
    fastify.get('/submission-tasks/:id/teams', handleGetSubmissionTaskAssignedTeamsAdmin);
    fastify.post('/submission-tasks', handleCreateSubmissionTaskAdmin);
    fastify.put('/submission-tasks/reorder', handleReorderSubmissionTasksAdmin);
    fastify.patch('/submission-tasks/:id', handleUpdateSubmissionTaskAdmin);
    fastify.post('/submission-tasks/:id/assign', handleAssignSubmissionTaskTeamsAdmin);
    fastify.delete('/submission-tasks/:id', handleDeleteSubmissionTaskAdmin);
    fastify.get('/selection/teams', handleGetSelectionTeams);
    fastify.post('/selection/teams/:teamId/result', handleSetSelectionResult);
    fastify.get('/selection/global-deadline', handleGetGlobalSelectionDeadline);
    fastify.put('/selection/global-deadline', handleSetGlobalSelectionDeadline);
    fastify.post('/selection/expire-not-joined', handleExpireSelectionNotJoined);
};

export default adminRoutes;
