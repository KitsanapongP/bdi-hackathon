import type { FastifyInstance } from 'fastify';
import { authRequired } from '../../middleware/authRequired.js';
import { isAdmin } from '../../middleware/isAdmin.js';
import {
  handleGetUserInbox,
  handleGetUserUnreadCount,
  handleMarkAllUserInboxRead,
  handleMarkUserInboxRead,
  handleGetNotificationSettings,
  handleUpdateNotificationSetting,
  handleGetTeamInbox,
  handleMarkTeamInboxRead,
  handleAdminSendInAppNotification,
  handleAdminSendOrientationInApp,
  handleAdminSendCustomEmail,
  handleAdminSendBurstTestEmail,
  handleGetAdminNotificationUsers,
  handleGetAdminNotificationRecipients,
  handleUpdateAdminNotificationRecipient,
} from './notifications.controller.js';

export async function notificationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authRequired);

  app.get('/inbox', handleGetUserInbox);
  app.get('/inbox/unread-count', handleGetUserUnreadCount);
  app.post('/inbox/read-all', handleMarkAllUserInboxRead);
  app.post('/inbox/:notificationLogId/read', handleMarkUserInboxRead);
  app.get('/team/:teamId/inbox', handleGetTeamInbox);
  app.post('/team/inbox/:notificationLogId/read', handleMarkTeamInboxRead);

  app.register(async (adminApp) => {
    adminApp.addHook('preHandler', isAdmin);

    adminApp.get('/admin/settings', handleGetNotificationSettings);
    adminApp.put('/admin/settings/:eventCode', handleUpdateNotificationSetting);
    adminApp.get('/admin/users', handleGetAdminNotificationUsers);
    adminApp.post('/admin/in-app', handleAdminSendInAppNotification);
    adminApp.post('/admin/orientation-in-app', handleAdminSendOrientationInApp);
    adminApp.post('/admin/custom-email', handleAdminSendCustomEmail);
    adminApp.post('/admin/test-burst-email', handleAdminSendBurstTestEmail);
    adminApp.get('/admin/recipients', handleGetAdminNotificationRecipients);
    adminApp.put('/admin/recipients/:userId', handleUpdateAdminNotificationRecipient);
  });
}
