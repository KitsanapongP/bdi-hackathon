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

const EVENT_TITLES: Record<NotificationEventCode, string> = {
  IDENTITY_SUBMITTED: 'แจ้งการส่งเอกสารยืนยันตัวตน',
  SELECTION_PASSED: 'แจ้งผลการคัดเลือก: ผ่าน',
  SELECTION_FAILED: 'แจ้งผลการคัดเลือก: ไม่ผ่าน',
  TEAM_CONFIRMED: 'แจ้งการยืนยันเข้าร่วมโครงการ',
};

const DEFAULT_EVENT_SUBJECTS: Record<NotificationEventCode, string> = {
  IDENTITY_SUBMITTED: 'แจ้งการส่งเอกสารยืนยันตัวตนของทีม',
  SELECTION_PASSED: 'แจ้งผลการคัดเลือกทีม: ผ่านการคัดเลือก',
  SELECTION_FAILED: 'แจ้งผลการคัดเลือกทีม: ไม่ผ่านการคัดเลือก',
  TEAM_CONFIRMED: 'แจ้งการยืนยันเข้าร่วมโครงการจากทีม',
};

const DEFAULT_EVENT_MESSAGES: Record<NotificationEventCode, string> = {
  IDENTITY_SUBMITTED: 'ทีม {{team_name}} ({{team_code}}) ได้ส่งเอกสารยืนยันตัวตนเรียบร้อยแล้ว กรุณาตรวจสอบข้อมูลในระบบผู้ดูแล',
  SELECTION_PASSED: 'ทีม {{team_name}} ({{team_code}}) ผ่านการคัดเลือกแล้ว กรุณาดำเนินการยืนยันสิทธิ์เข้าร่วมภายในกำหนดเวลา {{confirmation_deadline_at}}',
  SELECTION_FAILED: 'ทีม {{team_name}} ({{team_code}}) ไม่ผ่านการคัดเลือกในรอบนี้ ขอขอบคุณที่เข้าร่วมโครงการ',
  TEAM_CONFIRMED: 'ทีม {{team_name}} ({{team_code}}) ได้ยืนยันเข้าร่วมโครงการเรียบร้อยแล้ว โดย {{actor_name}}',
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

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br />');
}

function formatDetailLine(label: string, value: string): string {
  return `${label}: ${value}`;
}

function formatThaiDateTime(rawValue: string): string {
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  const timeText = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  const dateText = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return `${timeText} น. ${dateText}`;
}

function buildStandardEmailHtml(input: {
  eventTitle: string;
  headline: string;
  message: string;
  detailLines?: string[];
}): string {
  const detailLines = (input.detailLines ?? []).filter((line) => String(line || '').trim().length > 0);
  const detailsHtml = detailLines
    .map((line) => `<li style="margin: 0 0 8px 0;">${textToHtml(line)}</li>`)
    .join('');

  const detailsSection = detailLines.length > 0
    ? `
        <div style="margin: 0 0 16px 0; padding: 14px 16px; background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 10px;">
          <div style="font-weight: 700; margin-bottom: 8px; color: #102a43;">รายละเอียด</div>
          <ul style="margin: 0; padding-left: 18px; color: #334e68;">
            ${detailsHtml}
          </ul>
        </div>
      `
    : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <div style="padding: 18px 20px; background: #0b2545; color: #ffffff; border-radius: 12px 12px 0 0;">
        <div style="font-size: 12px; letter-spacing: 0.08em; opacity: 0.9; text-transform: uppercase;">Intelligent Living Hackathon 2026</div>
        <h2 style="margin: 8px 0 0 0; font-size: 20px;">${escapeHtml(input.eventTitle)}</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #dbe3ef; border-top: 0; border-radius: 0 0 12px 12px; background: #ffffff;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #102a43;">${escapeHtml(input.headline)}</h3>
        <p style="margin: 0 0 16px 0; color: #243b53;">${textToHtml(input.message)}</p>
        ${detailsSection}
        <p style="margin: 0; font-size: 13px; color: #627d98;">
          อีเมลฉบับนี้ส่งจากเว็บไซต์ Intelligent Living Hackathon 2026 กรุณาอย่าตอบกลับอีเมลอัตโนมัติฉบับนี้
        </p>
      </div>
    </div>
  `;
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
  const memberNames = await repo.getTeamMemberDisplayNames(db, teamId);

  const actorName = actorUserId ? await repo.getUserDisplayName(db, actorUserId) : 'system';

  const variables: Record<string, string> = {
    team_id: String(team.team_id),
    team_code: team.team_code || '',
    team_name: team.team_name_th || team.team_name_en || '',
    team_name_th: team.team_name_th || '',
    team_name_en: team.team_name_en || '',
    actor_name: actorName,
    event_code: eventCode,
    event_title: EVENT_TITLES[eventCode],
    member_names: memberNames.join(', '),
    member_count: String(memberNames.length),
  };

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      variables[k] = v === null || v === undefined ? '' : String(v);
    }
  }

  const actionAtRaw = (variables.action_at || new Date().toISOString()).trim();
  const actionAtFormatted = formatThaiDateTime(actionAtRaw);
  variables.action_at = actionAtRaw;
  variables.action_at_formatted = actionAtFormatted;

  const teamLabel = `${team.team_name_th || team.team_name_en}[${team.team_code}]`;
  const resolvedSubject = renderTemplate(DEFAULT_EVENT_SUBJECTS[eventCode], variables) || DEFAULT_EVENT_SUBJECTS[eventCode];
  const subjectFromSetting = renderTemplate(setting.customSubject, variables).trim();
  const baseSubject = subjectFromSetting || resolvedSubject;
  const subject = baseSubject.startsWith(`${teamLabel} |`) ? baseSubject : `${teamLabel} | ${baseSubject}`;

  const renderedMessage = renderTemplate(DEFAULT_EVENT_MESSAGES[eventCode], variables) || DEFAULT_EVENT_MESSAGES[eventCode];
  const messageFromSetting = renderTemplate(setting.customMessage, variables).trim();
  const messageText = messageFromSetting || renderedMessage;

  const detailLines = [
    formatDetailLine('ชื่อทีม', team.team_name_th || team.team_name_en),
    formatDetailLine('รหัสทีม', team.team_code || '-'),
    formatDetailLine('ผู้ดำเนินการ', actorName),
    formatDetailLine('สมาชิกในทีม', memberNames.length > 0 ? memberNames.join(', ') : '-'),
    formatDetailLine('จำนวนสมาชิก', String(memberNames.length)),
    formatDetailLine('เวลาที่ดำเนินการ', actionAtFormatted),
  ];

  const htmlBody = buildStandardEmailHtml({
    eventTitle: EVENT_TITLES[eventCode],
    headline: subject,
    message: messageText,
    detailLines,
  });

  const logMessage = [messageText, '', ...detailLines.map((line) => `- ${line}`)].join('\n').trim();

  return {
    subject,
    htmlMessage: htmlBody,
    logMessage,
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
    htmlMessage: string;
    logMessage: string;
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
          messageText: input.logMessage,
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
          messageText: input.logMessage,
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
          html: input.htmlMessage,
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
          messageText: input.logMessage,
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
          messageText: input.logMessage,
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
    templateCode: null,
    subject: composed.subject,
    htmlMessage: composed.htmlMessage,
    logMessage: composed.logMessage,
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
  const subject = data.subject.startsWith(`${teamLabel} |`) ? data.subject : `${teamLabel} | ${data.subject}`;
  const customMessage = data.message.trim();

  const htmlMessage = buildStandardEmailHtml({
    eventTitle: 'อีเมลแจ้งเตือนจากผู้ดูแลระบบ',
    headline: subject,
    message: customMessage,
  });

  const logMessage = customMessage;

  const result = await sendEmailWithLog(db, {
    eventCode: 'ADMIN_CUSTOM_EMAIL',
    teamId: data.teamId,
    actorUserId: data.actorUserId,
    templateCode: null,
    subject,
    htmlMessage,
    logMessage,
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
