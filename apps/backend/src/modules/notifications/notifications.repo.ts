import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  AdminNotificationRecipientRow,
  AdminNotificationSettingRow,
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
    isEmailEnabled: boolean;
    customSubject: string | null;
    customMessage: string | null;
    updatedByUserId: number;
  },
): Promise<void> {
  await db.query(`
    INSERT INTO admin_notification_settings (
      event_code, is_email_enabled, custom_subject, custom_message, updated_by_user_id, updated_at
    )
    VALUES (:eventCode, :isEmailEnabled, :customSubject, :customMessage, :updatedByUserId, NOW())
    ON DUPLICATE KEY UPDATE
      is_email_enabled = VALUES(is_email_enabled),
      custom_subject = VALUES(custom_subject),
      custom_message = VALUES(custom_message),
      updated_by_user_id = VALUES(updated_by_user_id),
      updated_at = NOW()
  `, {
    eventCode: data.eventCode,
    isEmailEnabled: data.isEmailEnabled ? 1 : 0,
    customSubject: data.customSubject,
    customMessage: data.customMessage,
    updatedByUserId: data.updatedByUserId,
  });
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
    status: 'queued' | 'sent' | 'failed' | 'skipped' | 'read';
    recipientEmail?: string | null;
    emailHtml?: string | null;
    retryAfterAt?: Date | null;
    retryCount?: number;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: Date | null;
  },
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(`
    INSERT INTO notification_logs (
      event_code, channel, team_id, recipient_user_id, actor_user_id, template_code,
      subject_text, message_text, status, recipient_email, email_html, retry_after_at, retry_count,
      provider_message_id, error_message, sent_at, created_at
    ) VALUES (
      :eventCode, :channel, :teamId, :recipientUserId, :actorUserId, :templateCode,
      :subjectText, :messageText, :status, :recipientEmail, :emailHtml, :retryAfterAt, :retryCount,
      :providerMessageId, :errorMessage, :sentAt, NOW()
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
    recipientEmail: data.recipientEmail ?? null,
    emailHtml: data.emailHtml ?? null,
    retryAfterAt: data.retryAfterAt ?? null,
    retryCount: data.retryCount ?? 0,
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
      AND nl.channel IN ('email', 'in_app')
      AND nl.event_code IN ('ADMIN_CUSTOM_EMAIL', 'ADMIN_TEAM_MESSAGE')
    ORDER BY nl.created_at DESC, nl.notification_log_id DESC
    LIMIT :limit
  `, { teamId, userId, limit });
  return rows as NotificationLogRow[];
}

export async function getUserInbox(
  db: DB,
  userId: number,
  limit: number,
): Promise<NotificationLogRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT nl.*
    FROM notification_logs nl
    WHERE nl.recipient_user_id = :userId
      AND nl.channel IN ('in_app', 'email')
    ORDER BY nl.created_at DESC, nl.notification_log_id DESC
    LIMIT :limit
  `, { userId, limit });
  return rows as NotificationLogRow[];
}

export async function countUnreadUserInbox(db: DB, userId: number): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS unread_count
    FROM notification_logs nl
    WHERE nl.recipient_user_id = :userId
      AND nl.channel IN ('in_app', 'email')
      AND nl.read_at IS NULL
  `, { userId });

  return Number((rows[0] as { unread_count?: number | string } | undefined)?.unread_count ?? 0);
}

export async function getQueuedEmailLogs(
  db: DB,
  now: Date,
  limit: number,
): Promise<NotificationLogRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT nl.*
    FROM notification_logs nl
    WHERE nl.channel = 'email'
      AND nl.status = 'queued'
      AND nl.retry_after_at IS NOT NULL
      AND nl.retry_after_at <= :now
      AND nl.email_html IS NOT NULL
      AND nl.recipient_email IS NOT NULL
    ORDER BY nl.retry_after_at ASC, nl.created_at ASC, nl.notification_log_id ASC
    LIMIT :limit
  `, {
    now,
    limit,
  });

  return rows as NotificationLogRow[];
}

export async function markNotificationLogAsSent(
  db: DB,
  notificationLogId: number,
  providerMessageId: string | null,
): Promise<void> {
  await db.query(`
    UPDATE notification_logs
    SET status = 'sent',
        provider_message_id = :providerMessageId,
        error_message = NULL,
        sent_at = NOW(),
        retry_after_at = NULL
    WHERE notification_log_id = :notificationLogId
  `, {
    notificationLogId,
    providerMessageId,
  });
}

export async function markNotificationLogAsFailed(
  db: DB,
  notificationLogId: number,
  errorMessage: string,
): Promise<void> {
  await db.query(`
    UPDATE notification_logs
    SET status = 'failed',
        error_message = :errorMessage,
        retry_after_at = NULL
    WHERE notification_log_id = :notificationLogId
  `, {
    notificationLogId,
    errorMessage,
  });
}

export async function requeueNotificationLog(
  db: DB,
  notificationLogId: number,
  retryAfterAt: Date,
  errorMessage: string,
): Promise<void> {
  await db.query(`
    UPDATE notification_logs
    SET status = 'queued',
        retry_after_at = :retryAfterAt,
        retry_count = retry_count + 1,
        error_message = :errorMessage
    WHERE notification_log_id = :notificationLogId
  `, {
    notificationLogId,
    retryAfterAt,
    errorMessage,
  });
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

export async function markAllUserNotificationsAsRead(db: DB, userId: number): Promise<void> {
  await db.query(`
    UPDATE notification_logs
    SET status = IF(status = 'sent', 'read', status), read_at = COALESCE(read_at, NOW())
    WHERE recipient_user_id = :userId
      AND channel IN ('in_app', 'email')
      AND read_at IS NULL
  `, { userId });
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
    FROM user_users u
    JOIN access_allowlist a
      ON a.user_id = u.user_id
     AND a.access_role = 'admin'
     AND a.is_active = 1
    LEFT JOIN notify_admin_recipients r
      ON r.user_id = u.user_id
    WHERE COALESCE(r.is_enabled, 1) = 1
      AND u.is_active = 1
      AND u.deleted_at IS NULL
  `);
  return rows as Array<{ user_id: number; email: string | null }>;
}

export async function getAdminNotificationRecipients(db: DB): Promise<AdminNotificationRecipientRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT DISTINCT
      u.user_id,
      u.user_name,
      u.email,
      u.first_name_th,
      u.last_name_th,
      u.first_name_en,
      u.last_name_en,
      COALESCE(r.is_enabled, 1) AS is_enabled
    FROM user_users u
    JOIN access_allowlist a
      ON a.user_id = u.user_id
     AND a.access_role = 'admin'
     AND a.is_active = 1
    LEFT JOIN notify_admin_recipients r
      ON r.user_id = u.user_id
    WHERE u.is_active = 1
      AND u.deleted_at IS NULL
    ORDER BY
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name_th, ''), ' ', COALESCE(u.last_name_th, ''))), ''), u.user_name) ASC,
      u.user_id ASC
  `);
  return rows as AdminNotificationRecipientRow[];
}

export async function getActiveNotificationUsers(db: DB): Promise<Array<{
  user_id: number;
  user_code: string | null;
  user_name: string;
  email: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
}>> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT user_id, user_code, user_name, email, first_name_th, last_name_th, first_name_en, last_name_en
    FROM user_users
    WHERE is_active = 1
      AND deleted_at IS NULL
    ORDER BY
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(first_name_th, ''), ' ', COALESCE(last_name_th, ''))), ''), user_name) ASC,
      user_id ASC
  `);
  return rows as Array<{
    user_id: number;
    user_code: string | null;
    user_name: string;
    email: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
  }>;
}

export async function getActiveNotificationUsersByIds(
  db: DB,
  userIds: number[],
): Promise<Array<{
  user_id: number;
  user_code: string | null;
  user_name: string;
  email: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
}>> {
  if (userIds.length === 0) return [];
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT user_id, user_code, user_name, email, first_name_th, last_name_th, first_name_en, last_name_en
    FROM user_users
    WHERE is_active = 1
      AND deleted_at IS NULL
      AND user_id IN (?)
    ORDER BY user_id ASC
  `, [userIds]);
  return rows as Array<{
    user_id: number;
    user_code: string | null;
    user_name: string;
    email: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
  }>;
}

export async function getUsersByEmails(
  db: DB,
  emails: string[],
): Promise<Array<{
  user_id: number;
  user_name: string;
  email: string | null;
  display_name: string;
}>> {
  if (emails.length === 0) return [];
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      user_id,
      user_name,
      email,
      COALESCE(
        NULLIF(TRIM(CONCAT(COALESCE(first_name_th, ''), ' ', COALESCE(last_name_th, ''))), ''),
        NULLIF(TRIM(CONCAT(COALESCE(first_name_en, ''), ' ', COALESCE(last_name_en, ''))), ''),
        user_name
      ) AS display_name
    FROM user_users
    WHERE is_active = 1
      AND deleted_at IS NULL
      AND LOWER(email) IN (?)
  `, [emails]);
  return rows as Array<{
    user_id: number;
    user_name: string;
    email: string | null;
    display_name: string;
  }>;
}

export async function getOrientationDeniedUserIds(db: DB, userIds: number[]): Promise<Set<number>> {
  if (userIds.length === 0) return new Set();
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT user_id
    FROM user_orientation_denials
    WHERE user_id IN (?)
  `, [Array.from(new Set(userIds))]);
  return new Set(rows.map((row) => Number(row.user_id)).filter((userId) => Number.isFinite(userId)));
}

export async function setAdminNotificationRecipient(
  db: DB,
  userId: number,
  enabled: boolean,
): Promise<boolean> {
  const [adminRows] = await db.query<RowDataPacket[]>(`
    SELECT u.user_id
    FROM user_users u
    JOIN access_allowlist a
      ON a.user_id = u.user_id
     AND a.access_role = 'admin'
     AND a.is_active = 1
    WHERE u.user_id = :userId
      AND u.is_active = 1
      AND u.deleted_at IS NULL
    LIMIT 1
  `, { userId });
  if (adminRows.length === 0) return false;

  await db.query<ResultSetHeader>(`
    INSERT INTO notify_admin_recipients (user_id, is_enabled, updated_by_user_id, created_at, updated_at)
    VALUES (:userId, :enabled, NULL, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      is_enabled = VALUES(is_enabled),
      updated_at = NOW()
  `, {
    userId,
    enabled: enabled ? 1 : 0,
  });

  return true;
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

export async function getTeamContextsByStatuses(
  db: DB,
  statuses: Array<'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded'>,
): Promise<Array<{ team_id: number; team_name_th: string; team_name_en: string; team_code: string; status: string }>> {
  if (statuses.length === 0) return [];
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT team_id, team_name_th, team_name_en, team_code, status
    FROM team_teams
    WHERE deleted_at IS NULL
      AND status IN (?)
    ORDER BY team_id ASC
  `, [Array.from(new Set(statuses))]);
  return rows as Array<{ team_id: number; team_name_th: string; team_name_en: string; team_code: string; status: string }>;
}

export async function getTeamMemberDisplayNames(db: DB, teamId: number): Promise<string[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      COALESCE(
        NULLIF(TRIM(CONCAT(COALESCE(u.first_name_th, ''), ' ', COALESCE(u.last_name_th, ''))), ''),
        NULLIF(TRIM(CONCAT(COALESCE(u.first_name_en, ''), ' ', COALESCE(u.last_name_en, ''))), ''),
        u.user_name
      ) AS display_name
    FROM team_members m
    JOIN user_users u ON u.user_id = m.user_id
    WHERE m.team_id = :teamId
      AND m.member_status = 'active'
      AND u.is_active = 1
      AND u.deleted_at IS NULL
    ORDER BY CASE WHEN m.role = 'leader' THEN 0 ELSE 1 END, display_name ASC
  `, { teamId });

  return rows
    .map((row) => String((row as { display_name?: string | null }).display_name || '').trim())
    .filter((name) => name.length > 0);
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

// ===== Admin notification logs viewer =====

export interface AdminNotificationLogFilters {
  channel?: 'in_app' | 'email' | undefined;
  status?: 'queued' | 'sent' | 'failed' | 'skipped' | 'read' | undefined;
  eventCode?: string | undefined;
  search?: string | undefined;
  fromDate?: string | undefined; // 'YYYY-MM-DD HH:mm:ss'
  toDate?: string | undefined;
}

function buildNotificationLogWhere(
  filters: AdminNotificationLogFilters,
  options: { includeStatus: boolean },
): { clause: string; params: Record<string, unknown> } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.channel) {
    conditions.push('nl.channel = :channel');
    params.channel = filters.channel;
  }
  if (options.includeStatus && filters.status) {
    conditions.push('nl.status = :status');
    params.status = filters.status;
  }
  if (filters.eventCode) {
    conditions.push('nl.event_code = :eventCode');
    params.eventCode = filters.eventCode;
  }
  if (filters.fromDate) {
    conditions.push('nl.created_at >= :fromDate');
    params.fromDate = filters.fromDate;
  }
  if (filters.toDate) {
    conditions.push('nl.created_at <= :toDate');
    params.toDate = filters.toDate;
  }
  if (filters.search) {
    conditions.push(`(
      ru.email LIKE :search
      OR nl.recipient_email LIKE :search
      OR ru.user_code LIKE :search
      OR ru.user_name LIKE :search
      OR CONCAT(COALESCE(ru.first_name_th, ''), ' ', COALESCE(ru.last_name_th, '')) LIKE :search
      OR CONCAT(COALESCE(ru.first_name_en, ''), ' ', COALESCE(ru.last_name_en, '')) LIKE :search
      OR t.team_code LIKE :search
      OR t.team_name_th LIKE :search
      OR nl.subject_text LIKE :search
    )`);
    params.search = `%${filters.search}%`;
  }

  const clause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

const NOTIFICATION_LOG_JOINS = `
  FROM notification_logs nl
  LEFT JOIN user_users ru ON ru.user_id = nl.recipient_user_id
  LEFT JOIN team_teams t ON t.team_id = nl.team_id
  LEFT JOIN user_users au ON au.user_id = nl.actor_user_id
`;

export async function searchNotificationLogsAdmin(
  db: DB,
  filters: AdminNotificationLogFilters,
  limit: number,
  offset: number,
): Promise<{ rows: RowDataPacket[]; total: number }> {
  const { clause, params } = buildNotificationLogWhere(filters, { includeStatus: true });

  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      nl.notification_log_id,
      nl.event_code,
      nl.channel,
      nl.status,
      nl.team_id,
      t.team_code,
      t.team_name_th,
      nl.recipient_user_id,
      ru.user_name AS recipient_user_name,
      ru.user_code AS recipient_user_code,
      ru.email AS recipient_account_email,
      ru.first_name_th AS recipient_first_name_th,
      ru.last_name_th AS recipient_last_name_th,
      ru.first_name_en AS recipient_first_name_en,
      ru.last_name_en AS recipient_last_name_en,
      nl.recipient_email,
      nl.actor_user_id,
      au.user_name AS actor_user_name,
      au.first_name_th AS actor_first_name_th,
      au.last_name_th AS actor_last_name_th,
      nl.subject_text,
      nl.retry_count,
      nl.error_message,
      nl.provider_message_id,
      (nl.email_html IS NOT NULL) AS has_email_html,
      nl.sent_at,
      nl.read_at,
      nl.created_at
    ${NOTIFICATION_LOG_JOINS}
    ${clause}
    ORDER BY nl.created_at DESC, nl.notification_log_id DESC
    LIMIT :limit OFFSET :offset
  `, { ...params, limit, offset });

  const [countRows] = await db.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS total
    ${NOTIFICATION_LOG_JOINS}
    ${clause}
  `, params);

  const total = Number((countRows[0] as { total?: number | string } | undefined)?.total ?? 0);
  return { rows, total };
}

export async function getNotificationLogStatusSummaryAdmin(
  db: DB,
  filters: AdminNotificationLogFilters,
): Promise<Array<{ status: string; count: number }>> {
  // สรุปตามสถานะ โดยใช้ตัวกรองทั้งหมดยกเว้น status เพื่อให้เห็นภาพรวม
  const { clause, params } = buildNotificationLogWhere(filters, { includeStatus: false });
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT nl.status, COUNT(*) AS count
    ${NOTIFICATION_LOG_JOINS}
    ${clause}
    GROUP BY nl.status
  `, params);
  return rows.map((row) => ({
    status: String((row as { status: string }).status),
    count: Number((row as { count: number | string }).count),
  }));
}

export async function getNotificationLogEventCodesAdmin(db: DB): Promise<string[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT DISTINCT event_code
    FROM notification_logs
    ORDER BY event_code ASC
  `);
  return rows.map((row) => String((row as { event_code: string }).event_code)).filter(Boolean);
}

export async function getNotificationLogByIdAdmin(db: DB, notificationLogId: number): Promise<RowDataPacket | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      nl.*,
      t.team_code,
      t.team_name_th,
      ru.user_name AS recipient_user_name,
      ru.user_code AS recipient_user_code,
      ru.email AS recipient_account_email,
      ru.first_name_th AS recipient_first_name_th,
      ru.last_name_th AS recipient_last_name_th,
      au.user_name AS actor_user_name,
      au.first_name_th AS actor_first_name_th,
      au.last_name_th AS actor_last_name_th
    ${NOTIFICATION_LOG_JOINS}
    WHERE nl.notification_log_id = :notificationLogId
    LIMIT 1
  `, { notificationLogId });
  return (rows[0] as RowDataPacket | undefined) ?? null;
}
