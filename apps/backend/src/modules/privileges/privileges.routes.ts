import type { FastifyInstance } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import {
  handleAdminRedeemToken,
  handleAdminScanToken,
  handleApplyTeamClaim,
  handleCreateAdminTemplate,
  handleDeleteAdminTemplate,
  handleGetMyPrivileges,
  handleListAdminClaims,
  handleListAdminTemplates,
  handlePublishAdminTemplate,
  handleRefreshMyClaimToken,
  handleUpdateAdminClaim,
  handleUpdateAdminTemplate,
} from './privileges.controller.js';

export async function privilegesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authRequired);

  app.get('/my', handleGetMyPrivileges);
  app.post('/my/:claimId/refresh-token', handleRefreshMyClaimToken);

  app.register(async (adminApp) => {
    adminApp.addHook('preHandler', isAdmin);

    adminApp.get('/admin/templates', handleListAdminTemplates);
    adminApp.post('/admin/templates', handleCreateAdminTemplate);
    adminApp.patch('/admin/templates/:id', handleUpdateAdminTemplate);
    adminApp.delete('/admin/templates/:id', handleDeleteAdminTemplate);
    adminApp.post('/admin/templates/:id/publish', handlePublishAdminTemplate);

    adminApp.get('/admin/claims', handleListAdminClaims);
    adminApp.post('/admin/scan', handleAdminScanToken);
    adminApp.post('/admin/scan/redeem', handleAdminRedeemToken);
    adminApp.patch('/admin/claims/:claimId', handleUpdateAdminClaim);
    adminApp.patch('/admin/teams/:teamId/privileges/:privilegeId', handleApplyTeamClaim);
  });
}
