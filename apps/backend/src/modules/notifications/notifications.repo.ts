import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  AdminNotificationSettingRow,
  NotifyEmailTemplateRow,
  NotificationEventCode,
  NotificationLogRow,
} from './notifications.types.js';

export async function getNotificationSettings(db: DB): Promise<AdminNotificationSettingRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT * FROM admin_notification_settings
    ORDER BY event_code ASC
  `);
  return rows as AdminNotificationSettingRow[];
}

export async function getNotificationSettingByEvent(
  db: DB,
  eventCode: NotificationEventCode,
): Promise<AdminNotificationSettingRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT * FROM admin_notification_settings WHERE event_code = :eventCode LIMIT 1
  `, { eventCode });
  return (rows[0] as AdminNotificationSettingRow | undefined) ?? null;
}

export async function upsertNotificationSetting(
  db: DB,
  data: {
    eventCode: NotificationEventCode;
    isInAppEnabled: boolean;
    isEmailEnabled: boolean;
    updatedByUserId: number;
  },
): Promise<void> {
  await db.query(`
    INSERT INTO admin_notification_settings (event_code, is_in_app_enabled, is_email_enabled, updated_by_user_id, updated_at)
    VALUES (:eventCode, :isInAppEnabled, :isEmailEnabled, :updatedByUserId, NOW())
    ON DUPLICATE KEY UPDATE
      is_in_app_enabled = VALUES(is_in_app_enabled),
      is_email_enabled = VALUES(is_email_enabled),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = NOW()
  `, {
    eventCode: data.eventCode,
    isInAppEnabled: data.isInAppEnabled ? 1 : 0,
    isEmailEnabled: data.isEmailEnabled ? 1 : 0,
    updatedByUserId: data.updatedByUserId,
  });
}

export async function getEmailTemplates(db: DB): Promise<NotifyEmailTemplateRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT * FROM notify_email_templates
    ORDER BY template_code ASC
  `);
  return rows as NotifyEmailTemplateRow[];
}

export async function getEmailTemplateByCode(db: DB, templateCode: string): Promise<NotifyEmailTemplateRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT * FROM notify_email_templates WHERE template_code = :templateCode LIMIT 1
  `, { templateCode });
  return (rows[0] as NotifyEmailTemplateRow | undefined) ?? null;
}

export async function updateEmailTemplateByCode(
  db: DB,
  templateCode: string,
  patch: {
    templateNameTh?: string | undefined;
    templateNameEn?: string | undefined;
    subjectTh?: string | null | undefined;
    subjectEn?: string | null | undefined;
    htmlTh?: string | null | undefined;
    htmlEn?: string | null | undefined;
    variablesHint?: string | null | undefined;
    isEnabled?: boolean | undefined;
  },
): Promise<void> {
  const updates: string[] = [];
  const params: Record<string, unknown> = { templateCode };

  if (patch.templateNameTh !== undefined) {
    updates.push('template_name_th = :templateNameTh');
    params.templateNameTh = patch.templateNameTh;
  }
  if (patch.templateNameEn !== undefined) {
    updates.push('template_name_en = :templateNameEn');
    params.templateNameEn = patch.templateNameEn;
  }
  if (patch.subjectTh !== undefined) {
    updates.push('subject_th = :subjectTh');
    params.subjectTh = patch.subjectTh;
  }
  if (patch.subjectEn !== undefined) {
    updates.push('subject_en = :subjectEn');
    params.subjectEn = patch.subjectEn;
  }
  if (patch.htmlTh !== undefined) {
    updates.push('html_th = :htmlTh');
    params.htmlTh = patch.htmlTh;
  }
  if (patch.htmlEn !== undefined) {
    updates.push('html_en = :htmlEn');
    params.htmlEn = patch.htmlEn;
  }
  if (patch.variablesHint !== undefined) {
    updates.push('variables_hint = :variablesHint');
    params.variablesHint = patch.variablesHint;
  }
  if (patch.isEnabled !== undefined) {
    updates.push('is_enabled = :isEnabled');
    params.isEnabled = patch.isEnabled ? 1 : 0;
  }

  if (updates.length === 0) return;

  await db.query(`
    UPDATE notify_email_templates
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE template_code = :templateCode
  `, params);
}

export async function createNotificationLog(
  db: DB,
  data: {
    eventCode: string;
    channel: 'in_app' | 'email';
    teamId: number | null;
    recipientUserId: number;
    actorUserId: number | null;
    templateCode: string | null;
    subjectText: string | null;
    messageText: string | null;
    status: 'sent' | 'failed' | 'skipped' | 'read';
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: Date | null;
  },
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(`
    INSERT INTO notification_logs (
      event_code, channel, team_id, recipient_user_id, actor_user_id, template_code,
      subject_text, message_text, status, provider_message_id, error_message, sent_at, created_at
    ) VALUES (
      :eventCode, :channel, :teamId, :recipientUserId, :actorUserId, :templateCode,
      :subjectText, :messageText, :status, :providerMessageId, :errorMessage, :sentAt, NOW()
    )
  `, {
    eventCode: data.eventCode,
    channel: data.channel,
    teamId: data.teamId,
    recipientUserId: data.recipientUserId,
    actorUserId: data.actorUserId,
    templateCode: data.templateCode,
    subjectText: data.subjectText,
    messageText: data.messageText,
    status: data.status,
    providerMessageId: data.providerMessageId ?? null,
    errorMessage: data.errorMessage ?? null,
    sentAt: data.sentAt ?? null,
  });
  return result.insertId;
}

export async function getTeamInbox(
  db: DB,
  teamId: number,
  userId: number,
  limit: number,
): Promise<NotificationLogRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT nl.*
    FROM notification_logs nl
    WHERE nl.team_id = :teamId
      AND nl.recipient_user_id = :userId
      AND nl.channel = 'email'
    ORDER BY nl.created_at DESC
    LIMIT :limit
  `, { teamId, userId, limit });
  return rows as NotificationLogRow[];
}

export async function markNotificationAsRead(
  db: DB,
  notificationLogId: number,
  userId: number,
): Promise<void> {
  await db.query(`
    UPDATE notification_logs
    SET status = IF(status = 'sent', 'read', status), read_at = NOW()
    WHERE notification_log_id = :notificationLogId
      AND recipient_user_id = :userId
  `, { notificationLogId, userId });
}

export async function getTeamRecipients(db: DB, teamId: number): Promise<Array<{ user_id: number; email: string | null }>> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT u.user_id, u.email
    FROM team_members m
    JOIN user_users u ON u.user_id = m.user_id
    WHERE m.team_id = :teamId
      AND m.member_status = 'active'
      AND u.is_active = 1
      AND u.deleted_at IS NULL
  `, { teamId });
  return rows as Array<{ user_id: number; email: string | null }>;
}

export async function getAdminRecipients(db: DB): Promise<Array<{ user_id: number; email: string | null }>> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT DISTINCT u.user_id, u.email
    FROM access_allowlist a
    JOIN user_users u ON u.user_id = a.user_id
    WHERE a.access_role = 'admin'
      AND a.is_active = 1
      AND u.is_active = 1
      AND u.deleted_at IS NULL
  `);
  return rows as Array<{ user_id: number; email: string | null }>;
}

export async function getTeamContext(db: DB, teamId: number): Promise<{ team_id: number; team_name_th: string; team_name_en: string; team_code: string } | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT team_id, team_name_th, team_name_en, team_code
    FROM team_teams
    WHERE team_id = :teamId
      AND deleted_at IS NULL
    LIMIT 1
  `, { teamId });
  return (rows[0] as { team_id: number; team_name_th: string; team_name_en: string; team_code: string } | undefined) ?? null;
}

export async function getUserDisplayName(db: DB, userId: number): Promise<string> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT user_name, first_name_th, last_name_th
    FROM user_users
    WHERE user_id = :userId
    LIMIT 1
  `, { userId });

  const row = rows[0] as { user_name?: string; first_name_th?: string | null; last_name_th?: string | null } | undefined;
  if (!row) return `user-${userId}`;
  const fullName = `${row.first_name_th ?? ''} ${row.last_name_th ?? ''}`.trim();
  return fullName || row.user_name || `user-${userId}`;
}

