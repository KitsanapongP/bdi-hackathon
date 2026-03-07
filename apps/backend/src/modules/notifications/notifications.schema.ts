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
}).refine(
  (v) => v.isInAppEnabled !== undefined || v.isEmailEnabled !== undefined,
  { message: 'ต้องส่งอย่างน้อยหนึ่งค่า (isInAppEnabled หรือ isEmailEnabled)' },
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
