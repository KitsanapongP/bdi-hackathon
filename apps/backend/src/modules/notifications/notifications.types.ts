import type { RowDataPacket } from 'mysql2/promise';

export type NotificationEventCode =
  | 'IDENTITY_SUBMITTED'
  | 'SELECTION_PASSED'
  | 'SELECTION_FAILED'
  | 'TEAM_CONFIRMED';

export interface AdminNotificationSettingRow extends RowDataPacket {
  event_code: NotificationEventCode;
  is_in_app_enabled: number;
  is_email_enabled: number;
  custom_subject: string | null;
  custom_message: string | null;
  updated_by_user_id: number | null;
  updated_at: Date;
}

export interface NotifyEmailTemplateRow extends RowDataPacket {
  template_id: number;
  template_code: string;
  template_name_th: string;
  template_name_en: string;
  subject_th: string | null;
  subject_en: string | null;
  html_th: string | null;
  html_en: string | null;
  variables_hint: string | null;
  is_enabled: number;
  created_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationLogRow extends RowDataPacket {
  notification_log_id: number;
  event_code: string;
  channel: 'in_app' | 'email';
  team_id: number | null;
  recipient_user_id: number;
  actor_user_id: number | null;
  template_code: string | null;
  subject_text: string | null;
  message_text: string | null;
  status: 'sent' | 'failed' | 'skipped' | 'read';
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: Date | null;
  read_at: Date | null;
  created_at: Date;
}

export interface AdminNotificationRecipientRow extends RowDataPacket {
  user_id: number;
  user_name: string;
  email: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  is_enabled: number;
}
