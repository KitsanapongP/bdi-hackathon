import type { FastifyInstance } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import {
  handleGetNotificationSettings,
  handleUpdateNotificationSetting,
  handleGetNotificationTemplates,
  handleUpdateNotificationTemplate,
  handleGetTeamInbox,
  handleMarkTeamInboxRead,
} from './notifications.controller.js';

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authRequired);

  app.get('/team/:teamId/inbox', handleGetTeamInbox);
  app.post('/team/inbox/:notificationLogId/read', handleMarkTeamInboxRead);

  app.register(async (adminApp) => {
    adminApp.addHook('preHandler', isAdmin);

    adminApp.get('/admin/settings', handleGetNotificationSettings);
    adminApp.put('/admin/settings/:eventCode', handleUpdateNotificationSetting);
    adminApp.get('/admin/templates', handleGetNotificationTemplates);
    adminApp.put('/admin/templates/:templateCode', handleUpdateNotificationTemplate);
  });
}
