import { z } from 'zod';

export const allowlistSchema = z.object({
    userId: z.number().int().positive('User ID ต้องเป็นตัวเลขบวก'),
    accessRole: z.enum(['admin', 'judge']),
    note: z.string().optional(),
});

export type AllowlistInput = z.infer<typeof allowlistSchema>;

export const updateAllowlistSchema = z.object({
    accessRole: z.enum(['admin', 'judge']).optional(),
    isActive: z.boolean().optional(),
    note: z.string().optional(),
});

export type UpdateAllowlistInput = z.infer<typeof updateAllowlistSchema>;

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive('ID ไม่ถูกต้อง'),
});

export const contactIdParamSchema = z.object({
    contactId: z.coerce.number().int().positive('contactId ไม่ถูกต้อง'),
});

export const contactChannelParamSchema = z.object({
    contactId: z.coerce.number().int().positive('contactId ไม่ถูกต้อง'),
    channelId: z.coerce.number().int().positive('channelId ไม่ถูกต้อง'),
});

const nullableText = z.string().nullable().optional();

export const createContactSchema = z.object({
    displayNameTh: z.string().trim().min(1, 'displayNameTh ต้องไม่ว่าง'),
    displayNameEn: z.string().trim().min(1, 'displayNameEn ต้องไม่ว่าง'),
    roleTh: nullableText,
    roleEn: nullableText,
    organizationTh: nullableText,
    organizationEn: nullableText,
    departmentTh: nullableText,
    departmentEn: nullableText,
    bioTh: nullableText,
    bioEn: nullableText,
    avatarUrl: nullableText,
    avatarAltTh: nullableText,
    avatarAltEn: nullableText,
    isFeatured: z.boolean().optional(),
    sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป').optional(),
    isEnabled: z.boolean().optional(),
    publishedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const reorderContactsSchema = z.object({
    updates: z.array(z.object({
        id: z.number().int().positive('ID ไม่ถูกต้อง'),
        sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'),
    })),
});

export const createContactChannelSchema = z.object({
    channelType: z.string().trim().min(1, 'channelType ต้องไม่ว่าง'),
    labelTh: nullableText,
    labelEn: nullableText,
    value: z.string().trim().min(1, 'value ต้องไม่ว่าง'),
    url: nullableText,
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป').optional(),
    isEnabled: z.boolean().optional(),
});

export const updateContactChannelSchema = createContactChannelSchema.partial();

export const reorderContactChannelsSchema = z.object({
    updates: z.array(z.object({
        id: z.number().int().positive('ID ไม่ถูกต้อง'),
        sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'),
    })),
});
