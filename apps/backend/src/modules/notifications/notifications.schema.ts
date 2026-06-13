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
  target: z.enum(['team', 'status']).optional().default('team'),
  teamId: z.number().int().positive().optional(),
  teamStatuses: z.array(z.enum(['forming', 'submitted', 'passed', 'failed', 'confirmed', 'not_joined', 'disbanded'])).optional().default([]),
  subject: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1),
}).refine(
  (value) => value.target !== 'team' || value.teamId !== undefined,
  { message: 'กรุณาเลือกทีม', path: ['teamId'] },
).refine(
  (value) => value.target !== 'status' || value.teamStatuses.length > 0,
  { message: 'กรุณาเลือกสถานะทีมอย่างน้อยหนึ่งสถานะ', path: ['teamStatuses'] },
);

export const adminSendAnnouncementSchema = z.object({
  target: z.enum(['status', 'team', 'users']),
  teamStatuses: z.array(z.enum(['forming', 'submitted', 'passed', 'failed', 'confirmed', 'not_joined', 'disbanded'])).optional().default([]),
  teamId: z.number().int().positive().optional(),
  userTarget: z.enum(['all', 'selected']).optional().default('selected'),
  userIds: z.array(z.number().int().positive()).optional().default([]),
  channels: z.object({
    email: z.boolean().optional().default(false),
    inApp: z.boolean().optional().default(false),
  }),
  subject: z.string().trim().min(1).max(255),
  message: z.string().trim().min(1),
}).refine(
  (value) => value.channels.email || value.channels.inApp,
  { message: 'กรุณาเลือกช่องทางส่งอย่างน้อยหนึ่งช่องทาง', path: ['channels'] },
).refine(
  (value) => value.target !== 'status' || value.teamStatuses.length > 0,
  { message: 'กรุณาเลือกสถานะทีมอย่างน้อยหนึ่งสถานะ', path: ['teamStatuses'] },
).refine(
  (value) => value.target !== 'team' || value.teamId !== undefined,
  { message: 'กรุณาเลือกทีม', path: ['teamId'] },
).refine(
  (value) => value.target !== 'users' || value.userTarget === 'all' || value.userIds.length > 0,
  { message: 'กรุณาเลือกผู้รับอย่างน้อยหนึ่งคน', path: ['userIds'] },
);

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
  orientationLink: z.string().trim().min(1, 'กรุณากรอกลิงก์ Orientation Day 1'),
  orientationLink2: z.string().trim().min(1, 'กรุณากรอกลิงก์ Orientation Day 2'),
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
