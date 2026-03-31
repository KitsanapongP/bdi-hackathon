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

export const dashboardStatusEnum = z.enum(['submitted', 'passed', 'failed']);

export const dashboardQuerySchema = z.object({
    statuses: z
        .string()
        .optional()
        .transform((value) => {
            if (!value) return ['submitted', 'passed', 'failed'] as const;
            return value
                .split(',')
                .map((item) => item.trim().toLowerCase())
                .filter((item): item is 'submitted' | 'passed' | 'failed' =>
                    item === 'submitted' || item === 'passed' || item === 'failed'
                );
        })
        .refine((items) => items.length > 0, 'statuses ต้องมีอย่างน้อย 1 ค่า'),
    days: z.coerce.number().int().min(7).max(180).default(30),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;

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
const contactCategoryEnum = z.enum(['event_inquiry', 'dataset_inquiry', 'tech_it', 'facility']);

export const createContactSchema = z.object({
    contactCategory: contactCategoryEnum.optional(),
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

export const createCarouselSchema = z.object({
    titleTh: nullableText,
    titleEn: nullableText,
    descriptionTh: nullableText,
    descriptionEn: nullableText,
    imageStorageKey: z.string().trim().min(1, 'imageStorageKey ต้องไม่ว่าง'),
    imageAltTh: nullableText,
    imageAltEn: nullableText,
    targetUrl: nullableText,
    openInNewTab: z.boolean().optional(),
    sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป').optional(),
    isEnabled: z.boolean().optional(),
    startAt: z.string().datetime({ offset: true }).nullable().optional(),
    endAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateCarouselSchema = createCarouselSchema.partial();

export const reorderCarouselsSchema = z.object({
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

const scheduleAudienceEnum = z.enum(['public', 'all_users', 'approved_teams', 'specific_teams']);
const scheduleTableTypeEnum = z.enum(['milestone', 'onsite_timetable']);

const scheduleTimeField = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'รูปแบบเวลาต้องเป็น HH:mm หรือ HH:mm:ss');

export const createScheduleItemSchema = z.object({
    dayId: z.number().int().positive('dayId ไม่ถูกต้อง'),
    trackId: z.number().int().positive('trackId ไม่ถูกต้อง').nullable().optional(),
    startTime: scheduleTimeField,
    endTime: scheduleTimeField,
    titleTh: z.string().trim().min(1, 'titleTh ต้องไม่ว่าง'),
    titleEn: z.string().trim().min(1, 'titleEn ต้องไม่ว่าง'),
    descriptionTh: nullableText,
    descriptionEn: nullableText,
    locationTh: nullableText,
    locationEn: nullableText,
    speakerTh: nullableText,
    speakerEn: nullableText,
    audience: scheduleAudienceEnum.optional(),
    isHighlight: z.boolean().optional(),
    sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป').optional(),
    isEnabled: z.boolean().optional(),
    displayDateLabelTh: nullableText,
    displayDateLabelEn: nullableText,
    displayTimeLabelTh: nullableText,
    displayTimeLabelEn: nullableText,
});

export const updateScheduleItemSchema = createScheduleItemSchema.partial();

export const updateScheduleViewTypeSchema = z.object({
    tableType: scheduleTableTypeEnum,
});

export const selectionTeamsQuerySchema = z.object({
    status: z.enum(['submitted', 'passed', 'failed', 'confirmed', 'not_joined']).optional(),
});

export const selectionResultSchema = z.object({
    status: z.enum(['passed', 'failed']),
    confirmDeadlineAt: z.string().trim().min(1).nullable().optional(),
});

export const updateGlobalSelectionDeadlineSchema = z.object({
    confirmDeadlineAt: z.string().trim().min(1, 'กรุณาระบุวันเวลาหมดเขต'),
});

export const createSubmissionTaskSchema = z.object({
    taskName: z.string().trim().min(1, 'กรุณาระบุชื่องาน'),
    taskType: z.enum(['link', 'file']),
    isRequired: z.boolean().optional(),
    allowedExtensions: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    deadlineAt: z.string().trim().nullable().optional(),
    isSubmissionOpen: z.boolean().optional(),
    teamIds: z.array(z.number().int().positive()).optional(),
    teamStatuses: z.array(z.enum(['forming', 'submitted', 'passed', 'failed', 'confirmed', 'not_joined', 'disbanded'])).optional(),
}).refine((value) => (value.teamIds?.length ?? 0) > 0 || (value.teamStatuses?.length ?? 0) > 0, {
    message: 'กรุณาระบุทีมเป้าหมายอย่างน้อย 1 ทีม หรือ 1 สถานะทีม',
    path: ['teamIds'],
});
