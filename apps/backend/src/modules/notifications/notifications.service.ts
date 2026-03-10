import { createRequire } from 'node:module';
import type { DB } from '../../config/db.js';
import * as repo from './notifications.repo.js';
import type { NotificationEventCode } from './notifications.types.js';
import { NotFoundError } from '../../shared/errors.js';
import { createTeamAuditLog } from '../teams/teams.repo.js';

const DEFAULT_EVENT_CHANNELS: Record<NotificationEventCode, { inApp: boolean; email: boolean }> = {
  IDENTITY_SUBMITTED: { inApp: true, email: true },
  SELECTION_PASSED: { inApp: true, email: true },
  SELECTION_FAILED: { inApp: true, email: true },
  TEAM_CONFIRMED: { inApp: true, email: true },
};

const EVENT_TEMPLATE_MAP: Record<NotificationEventCode, string> = {
  IDENTITY_SUBMITTED: 'IDENTITY_SUBMITTED',
  SELECTION_PASSED: 'SELECTION_PASSED',
  SELECTION_FAILED: 'SELECTION_FAILED',
  TEAM_CONFIRMED: 'TEAM_CONFIRMED',
};

const requireModule = createRequire(import.meta.url);

type TriggerEventInput = {
  eventCode: NotificationEventCode;
  teamId: number;
  actorUserId: number | null;
  extra?: Record<string, string | number | null | undefined>;
};

type EventSetting = {
  inApp: boolean;
  email: boolean;
  customSubject: string | null;
  customMessage: string | null;
};

function renderTemplate(text: string | null | undefined, variables: Record<string, string>): string {
  const source = String(text || '');
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, token: string) => {
    return variables[token] ?? '';
  });
}

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return { transporter: null, reason: 'SMTP_HOST is empty' as const };

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const skipTlsVerify = String(process.env.SMTP_SKIP_TLS_VERIFY || '0') === '1';

  let nodemailerModule: any;
  try {
    nodemailerModule = requireModule('nodemailer');
  } catch {
    return { transporter: null, reason: 'nodemailer is not installed' as const };
  }

  const transporter = nodemailerModule.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    tls: skipTlsVerify ? { rejectUnauthorized: false } : undefined,
  });
  return { transporter, reason: null };
}

async function resolveEventSetting(db: DB, eventCode: NotificationEventCode): Promise<EventSetting> {
  const row = await repo.getNotificationSettingByEvent(db, eventCode);
  if (!row) {
    return {
      ...DEFAULT_EVENT_CHANNELS[eventCode],
      customSubject: null,
      customMessage: null,
    };
  }
  return {
    inApp: row.is_in_app_enabled === 1,
    email: row.is_email_enabled === 1,
    customSubject: row.custom_subject,
    customMessage: row.custom_message,
  };
}

async function resolveRecipients(db: DB, eventCode: NotificationEventCode, teamId: number) {
  const teamRecipients = await repo.getTeamRecipients(db, teamId);
  if (eventCode === 'SELECTION_PASSED' || eventCode === 'SELECTION_FAILED') {
    return teamRecipients;
  }

  const adminRecipients = await repo.getAdminRecipients(db);
  const dedup = new Map<number, { user_id: number; email: string | null }>();

  for (const rec of [...teamRecipients, ...adminRecipients]) {
    dedup.set(rec.user_id, rec);
  }

  return Array.from(dedup.values());
}

async function resolveTemplateAndVariables(
  db: DB,
  eventCode: NotificationEventCode,
  teamId: number,
  actorUserId: number | null,
  setting: EventSetting,
  extra?: Record<string, string | number | null | undefined>,
) {
  const team = await repo.getTeamContext(db, teamId);
  if (!team) {
    throw new NotFoundError('ไม่พบทีมสำหรับส่ง notification');
  }

  const actorName = actorUserId ? await repo.getUserDisplayName(db, actorUserId) : 'system';
  const templateCode = EVENT_TEMPLATE_MAP[eventCode];
  const template = await repo.getEmailTemplateByCode(db, templateCode);

  const variables: Record<string, string> = {
    team_id: String(team.team_id),
    team_code: team.team_code || '',
    team_name: team.team_name_th || team.team_name_en || '',
    team_name_th: team.team_name_th || '',
    team_name_en: team.team_name_en || '',
    actor_name: actorName,
    event_code: eventCode,
  };

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      variables[k] = v === null || v === undefined ? '' : String(v);
    }
  }

  const teamLabel = `${team.team_name_th || team.team_name_en} [${team.team_code}]`;
  let fallbackSubject = `Notification: ${eventCode}`;
  let fallbackMessage = `Event ${eventCode} was triggered for team ${team.team_name_th || team.team_name_en}.`;

  if (eventCode === 'IDENTITY_SUBMITTED') {
    fallbackSubject = 'ทีมส่งเอกสารยืนยันตัวตนแล้ว';
    fallbackMessage = `ทีม ${team.team_name_th || team.team_name_en} ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว`;
  } else if (eventCode === 'SELECTION_PASSED') {
    fallbackSubject = 'ประกาศผลคัดเลือก: ผ่าน';
    fallbackMessage = `ทีม ${team.team_name_th || team.team_name_en} ผ่านการคัดเลือก กรุณายืนยันเข้าร่วมภายในกำหนดเวลา`;
  } else if (eventCode === 'SELECTION_FAILED') {
    fallbackSubject = 'ประกาศผลคัดเลือก: ไม่ผ่าน';
    fallbackMessage = `ทีม ${team.team_name_th || team.team_name_en} ไม่ผ่านการคัดเลือกในรอบนี้`;
  } else if (eventCode === 'TEAM_CONFIRMED') {
    fallbackSubject = 'ทีมยืนยันเข้าร่วมโครงการแล้ว';
    fallbackMessage = `ทีม ${team.team_name_th || team.team_name_en} ยืนยันเข้าร่วมโครงการเรียบร้อยแล้ว โดย ${actorName}`;
  }

  const resolvedSubject = template && template.is_enabled === 1
    ? renderTemplate(template.subject_th || template.subject_en, variables) || fallbackSubject
    : fallbackSubject;
  const subjectFromSetting = renderTemplate(setting.customSubject, variables).trim();
  const baseSubject = subjectFromSetting || resolvedSubject;
  const subject = baseSubject.includes(teamLabel) ? baseSubject : `${teamLabel} | ${baseSubject}`;

  const renderedMessage = template && template.is_enabled === 1
    ? renderTemplate(template.html_th || template.html_en, variables) || fallbackMessage
    : fallbackMessage;
  const messageFromSetting = renderTemplate(setting.customMessage, variables).trim();
  const htmlBody = messageFromSetting || renderedMessage;

  return {
    templateCode,
    subject,
    message: htmlBody,
  };
}

async function sendEmailWithLog(
  db: DB,
  input: {
    eventCode: string;
    teamId: number;
    actorUserId: number | null;
    templateCode: string | null;
    subject: string;
    message: string;
    recipients: Array<{ user_id: number; email: string | null }>;
  },
) {
  const { transporter, reason } = getTransporter();
  const fromEmail = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@hackathon.local';

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  await Promise.all(
    input.recipients.map(async (recipient) => {
      if (!recipient.email) {
        skipped += 1;
        await repo.createNotificationLog(db, {
          eventCode: input.eventCode,
          channel: 'email',
          teamId: input.teamId,
          recipientUserId: recipient.user_id,
          actorUserId: input.actorUserId,
          templateCode: input.templateCode,
          subjectText: input.subject,
          messageText: input.message,
          status: 'skipped',
          errorMessage: 'recipient email is empty',
        });
        return;
      }

      if (!transporter) {
        skipped += 1;
        await repo.createNotificationLog(db, {
          eventCode: input.eventCode,
          channel: 'email',
          teamId: input.teamId,
          recipientUserId: recipient.user_id,
          actorUserId: input.actorUserId,
          templateCode: input.templateCode,
          subjectText: input.subject,
          messageText: input.message,
          status: 'skipped',
          errorMessage: `SMTP is not configured: ${reason ?? 'unknown reason'}`,
        });
        return;
      }

      try {
        const result = await transporter.sendMail({
          from: fromEmail,
          to: recipient.email,
          subject: input.subject,
          html: input.message,
        });

        sent += 1;
        await repo.createNotificationLog(db, {
          eventCode: input.eventCode,
          channel: 'email',
          teamId: input.teamId,
          recipientUserId: recipient.user_id,
          actorUserId: input.actorUserId,
          templateCode: input.templateCode,
          subjectText: input.subject,
          messageText: input.message,
          status: 'sent',
          providerMessageId: result.messageId,
          sentAt: new Date(),
        });
      } catch (error: any) {
        failed += 1;
        await repo.createNotificationLog(db, {
          eventCode: input.eventCode,
          channel: 'email',
          teamId: input.teamId,
          recipientUserId: recipient.user_id,
          actorUserId: input.actorUserId,
          templateCode: input.templateCode,
          subjectText: input.subject,
          messageText: input.message,
          status: 'failed',
          errorMessage: String(error?.message || error),
        });
      }
    }),
  );

  return { sent, failed, skipped, totalRecipients: input.recipients.length };
}

export async function triggerNotificationEvent(db: DB, input: TriggerEventInput): Promise<void> {
  const setting = await resolveEventSetting(db, input.eventCode);
  const recipients = await resolveRecipients(db, input.eventCode, input.teamId);
  if (recipients.length === 0) return;

  const composed = await resolveTemplateAndVariables(
    db,
    input.eventCode,
    input.teamId,
    input.actorUserId,
    setting,
    input.extra,
  );

  if (!setting.email) return;

  await sendEmailWithLog(db, {
    eventCode: input.eventCode,
    teamId: input.teamId,
    actorUserId: input.actorUserId,
    templateCode: composed.templateCode,
    subject: composed.subject,
    message: composed.message,
    recipients,
  });
}

export async function getAdminNotificationSettings(db: DB) {
  const rows = await repo.getNotificationSettings(db);
  return rows.map((row) => ({
    eventCode: row.event_code,
    isInAppEnabled: row.is_in_app_enabled === 1,
    isEmailEnabled: row.is_email_enabled === 1,
    customSubject: row.custom_subject,
    customMessage: row.custom_message,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: row.updated_at,
  }));
}

export async function updateAdminNotificationSetting(
  db: DB,
  eventCode: NotificationEventCode,
  patch: {
    isInAppEnabled?: boolean | undefined;
    isEmailEnabled?: boolean | undefined;
    customSubject?: string | null | undefined;
    customMessage?: string | null | undefined;
  },
  updatedByUserId: number,
) {
  const current = await resolveEventSetting(db, eventCode);
  const nextInApp = patch.isInAppEnabled ?? current.inApp;
  const nextEmail = patch.isEmailEnabled ?? current.email;
  const nextCustomSubject = patch.customSubject === undefined ? current.customSubject : patch.customSubject;
  const nextCustomMessage = patch.customMessage === undefined ? current.customMessage : patch.customMessage;

  await repo.upsertNotificationSetting(db, {
    eventCode,
    isInAppEnabled: nextInApp,
    isEmailEnabled: nextEmail,
    customSubject: nextCustomSubject,
    customMessage: nextCustomMessage,
    updatedByUserId,
  });

  return {
    eventCode,
    isInAppEnabled: nextInApp,
    isEmailEnabled: nextEmail,
    customSubject: nextCustomSubject,
    customMessage: nextCustomMessage,
  };
}

function toRecipientDisplayName(row: {
  user_name: string;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
}): string {
  const fullNameTh = `${row.first_name_th ?? ''} ${row.last_name_th ?? ''}`.trim();
  if (fullNameTh) return fullNameTh;
  const fullNameEn = `${row.first_name_en ?? ''} ${row.last_name_en ?? ''}`.trim();
  return fullNameEn || row.user_name;
}

export async function getAdminNotificationRecipients(db: DB) {
  const rows = await repo.getAdminNotificationRecipients(db);
  return rows.map((row) => ({
    userId: row.user_id,
    userName: row.user_name,
    displayName: toRecipientDisplayName(row),
    email: row.email,
    enabled: row.is_enabled === 1,
  }));
}

export async function updateAdminNotificationRecipient(
  db: DB,
  userId: number,
  enabled: boolean,
) {
  const updated = await repo.setAdminNotificationRecipient(db, userId, enabled);
  if (!updated) {
    throw new NotFoundError('ไม่พบผู้ดูแลที่ต้องการอัปเดต');
  }

  const rows = await repo.getAdminNotificationRecipients(db);
  const row = rows.find((item) => item.user_id === userId);
  if (!row) {
    throw new NotFoundError('ไม่พบผู้ดูแลที่ต้องการอัปเดต');
  }

  return {
    userId: row.user_id,
    userName: row.user_name,
    displayName: toRecipientDisplayName(row),
    email: row.email,
    enabled: row.is_enabled === 1,
  };
}

export async function sendCustomEmailToTeam(
  db: DB,
  data: {
    teamId: number;
    actorUserId: number;
    subject: string;
    message: string;
  },
) {
  const team = await repo.getTeamContext(db, data.teamId);
  if (!team) {
    throw new NotFoundError('ไม่พบทีมที่ต้องการส่งอีเมล');
  }

  const recipients = await repo.getTeamRecipients(db, data.teamId);
  if (recipients.length === 0) {
    return {
      teamId: data.teamId,
      subject: data.subject,
      totalRecipients: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const teamLabel = `${team.team_name_th || team.team_name_en} [${team.team_code}]`;
  const subject = data.subject.includes(teamLabel) ? data.subject : `${teamLabel} | ${data.subject}`;
  const result = await sendEmailWithLog(db, {
    eventCode: 'ADMIN_CUSTOM_EMAIL',
    teamId: data.teamId,
    actorUserId: data.actorUserId,
    templateCode: null,
    subject,
    message: data.message,
    recipients,
  });

  await createTeamAuditLog(db, {
    teamId: data.teamId,
    actorUserId: data.actorUserId,
    actionCode: 'ADMIN_CUSTOM_EMAIL_SENT',
    actionDetail: {
      subject,
      totalRecipients: result.totalRecipients,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    },
  });

  return {
    teamId: data.teamId,
    subject,
    ...result,
  };
}

export async function getAdminNotificationTemplates(db: DB) {
  const rows = await repo.getEmailTemplates(db);
  return rows.map((row) => ({
    templateCode: row.template_code,
    templateNameTh: row.template_name_th,
    templateNameEn: row.template_name_en,
    subjectTh: row.subject_th,
    subjectEn: row.subject_en,
    htmlTh: row.html_th,
    htmlEn: row.html_en,
    variablesHint: row.variables_hint,
    isEnabled: row.is_enabled === 1,
    updatedAt: row.updated_at,
  }));
}

export async function updateAdminNotificationTemplate(
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
) {
  const current = await repo.getEmailTemplateByCode(db, templateCode);
  if (!current) {
    throw new NotFoundError('ไม่พบ template ตาม templateCode ที่ระบุ');
  }

  await repo.updateEmailTemplateByCode(db, templateCode, patch);
  const updated = await repo.getEmailTemplateByCode(db, templateCode);

  return {
    templateCode: updated!.template_code,
    templateNameTh: updated!.template_name_th,
    templateNameEn: updated!.template_name_en,
    subjectTh: updated!.subject_th,
    subjectEn: updated!.subject_en,
    htmlTh: updated!.html_th,
    htmlEn: updated!.html_en,
    variablesHint: updated!.variables_hint,
    isEnabled: updated!.is_enabled === 1,
    updatedAt: updated!.updated_at,
  };
}

export async function getTeamNotificationInbox(db: DB, teamId: number, userId: number, limit = 50) {
  const rows = await repo.getTeamInbox(db, teamId, userId, Math.max(1, Math.min(limit, 200)));
  return rows.map((row) => ({
    notificationLogId: row.notification_log_id,
    eventCode: row.event_code,
    channel: row.channel,
    teamId: row.team_id,
    recipientUserId: row.recipient_user_id,
    actorUserId: row.actor_user_id,
    subject: row.subject_text,
    message: row.message_text,
    status: row.status,
    providerMessageId: row.provider_message_id,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markInboxAsRead(db: DB, notificationLogId: number, userId: number): Promise<void> {
  await repo.markNotificationAsRead(db, notificationLogId, userId);
}
