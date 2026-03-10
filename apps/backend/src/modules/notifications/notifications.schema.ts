import { z } from 'zod';

export const eventCodeSchema = z.enum([
  'IDENTITY_SUBMITTED',
  'SELECTION_PASSED',
  'SELECTION_FAILED',
  'TEAM_CONFIRMED',
]);

export const updateNotificationSettingSchema = z.object({
  isInAppEnabled: z.boolean().optional(),
  isEmailEnabled: z.boolean().optional(),
  customSubject: z.string().trim().max(255).nullable().optional(),
  customMessage: z.string().trim().nullable().optional(),
}).refine(
  (v) => (
    v.isInAppEnabled !== undefined
    || v.isEmailEnabled !== undefined
    || v.customSubject !== undefined
    || v.customMessage !== undefined
  ),
  { message: 'ต้องส่งอย่างน้อยหนึ่งค่าเพื่ออัปเดต setting' },
);

export const updateTemplateSchema = z.object({
  templateNameTh: z.string().trim().min(1).optional(),
  templateNameEn: z.string().trim().min(1).optional(),
  subjectTh: z.string().trim().nullable().optional(),
  subjectEn: z.string().trim().nullable().optional(),
  htmlTh: z.string().trim().nullable().optional(),
  htmlEn: z.string().trim().nullable().optional(),
  variablesHint: z.string().trim().nullable().optional(),
  isEnabled: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'ไม่มีข้อมูลสำหรับอัปเดต' });

export const adminSendCustomEmailSchema = z.object({
  teamId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1),
});

export const notificationRecipientParamSchema = z.object({
  userId: z.coerce.number().int().positive('userId ไม่ถูกต้อง'),
});

export const updateNotificationRecipientSchema = z.object({
  enabled: z.boolean(),
});
