import { z } from 'zod';

export const eventCodeSchema = z.enum([
  'IDENTITY_SUBMITTED',
  'SELECTION_PASSED',
  'SELECTION_FAILED',
  'TEAM_CONFIRMED',
  'TEAM_DISBANDED',
]);

export const updateNotificationSettingSchema = z.object({
  isEmailEnabled: z.boolean().optional(),
  customSubject: z.string().trim().max(255).nullable().optional(),
  customMessage: z.string().trim().nullable().optional(),
}).refine(
  (v) => (
    v.isEmailEnabled !== undefined
    || v.customSubject !== undefined
    || v.customMessage !== undefined
  ),
  { message: 'ต้องส่งอย่างน้อยหนึ่งค่าเพื่ออัปเดต setting' },
);

export const adminSendCustomEmailSchema = z.object({
  teamId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1),
});

export const adminSendInAppNotificationSchema = z.object({
  target: z.enum(['all', 'selected']),
  userIds: z.array(z.number().int().positive()).optional().default([]),
  subject: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1),
}).refine(
  (value) => value.target === 'all' || value.userIds.length > 0,
  { message: 'กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน' },
);

export const adminSendOrientationEmailSchema = z.object({
  target: z.enum(['all', 'selected']),
  userIds: z.array(z.number().int().positive()).optional().default([]),
  subject: z.string().trim().min(1).max(255),
  orientationLink: z.string().trim().url('ลิงก์ Orientation Day ไม่ถูกต้อง'),
}).refine(
  (value) => value.target === 'all' || value.userIds.length > 0,
  { message: 'กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน' },
);

export const adminSendBurstTestEmailSchema = z.object({
  recipientEmail: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

export const notificationRecipientParamSchema = z.object({
  userId: z.coerce.number().int().positive('userId ไม่ถูกต้อง'),
});

export const updateNotificationRecipientSchema = z.object({
  enabled: z.boolean(),
});
