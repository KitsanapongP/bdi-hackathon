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

export const dashboardQuerySchema = z.object({
    days: z.coerce.number().int().min(7).max(180).default(30),
});

export type DashboardQueryInput = z.infer<typeof dashboardQuerySchema>;

export const idParamSchema = z.object({
    id: z.coerce.number().int().positive('ID ไม่ถูกต้อง'),
});

export const venueIdParamSchema = z.object({
    venueId: z.coerce.number().int().positive('venueId ไม่ถูกต้อง'),
});

export const venueImageParamSchema = z.object({
    venueId: z.coerce.number().int().positive('venueId ไม่ถูกต้อง'),
    imageId: z.coerce.number().int().positive('imageId ไม่ถูกต้อง'),
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
const venueCategoryEnum = z.enum(['venue', 'transportation', 'accommodation', 'attraction']);

export const createVenueSchema = z.object({
    category: venueCategoryEnum,
    nameTh: z.string().trim().min(1, 'nameTh ต้องไม่ว่าง'),
    nameEn: nullableText,
    descriptionTh: nullableText,
    descriptionEn: nullableText,
    googleMapsUrl: nullableText,
    latitude: z.number().min(-90, 'latitude ต้องอยู่ในช่วง -90 ถึง 90').max(90, 'latitude ต้องอยู่ในช่วง -90 ถึง 90').nullable().optional(),
    longitude: z.number().min(-180, 'longitude ต้องอยู่ในช่วง -180 ถึง 180').max(180, 'longitude ต้องอยู่ในช่วง -180 ถึง 180').nullable().optional(),
    sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป').optional(),
    isEnabled: z.boolean().optional(),
});

export const updateVenueSchema = createVenueSchema.partial();

export const reorderVenuesSchema = z.object({
    updates: z.array(z.object({
        id: z.number().int().positive('ID ไม่ถูกต้อง'),
        sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'),
    })),
});

export const createVenueImageSchema = z.object({
    imageStorageKey: z.string().trim().min(1, 'imageStorageKey ต้องไม่ว่าง'),
    imageAltTh: nullableText,
    imageAltEn: nullableText,
    sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป').optional(),
    isCover: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
});

export const updateVenueImageSchema = createVenueImageSchema.partial();

export const reorderVenueImagesSchema = z.object({
    updates: z.array(z.object({
        id: z.number().int().positive('ID ไม่ถูกต้อง'),
        sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'),
    })),
});

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
    status: z.enum(['forming', 'submitted', 'passed', 'failed', 'confirmed', 'not_joined']).optional(),
});

export const selectionResultSchema = z.object({
    status: z.enum(['passed', 'failed']),
});

export const updateGlobalSelectionDeadlineSchema = z.object({
    openAt: z.string().trim().min(1, 'กรุณาระบุวันเวลาเปิด'),
    closeAt: z.string().trim().min(1, 'กรุณาระบุวันเวลาปิด'),
});

const submissionTaskTypeEnum = z.enum(['link', 'file']);
const submissionTaskStageEnum = z.enum(['pre_selection', 'training', 'onsite']);
const submissionTaskTeamStatusEnum = z.enum(['forming', 'submitted', 'passed', 'failed', 'confirmed', 'not_joined', 'disbanded']);

export const createSubmissionTaskSchema = z.object({
    taskName: z.string().trim().min(1, 'กรุณาระบุชื่องาน'),
    description: z.string().trim().nullable().optional(),
    taskType: submissionTaskTypeEnum,
    stage: submissionTaskStageEnum.optional(),
    isRequired: z.boolean().optional(),
    allowedExtensions: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    deadlineAt: z.string().trim().nullable().optional(),
    isSubmissionOpen: z.boolean().optional(),
    teamIds: z.array(z.number().int().positive()).optional(),
    teamStatuses: z.array(submissionTaskTeamStatusEnum).optional(),
}).refine((value) => (value.teamIds?.length ?? 0) > 0 || (value.teamStatuses?.length ?? 0) > 0, {
    message: 'กรุณาระบุทีมเป้าหมายอย่างน้อย 1 ทีม หรือ 1 สถานะทีม',
    path: ['teamIds'],
});

export const updateSubmissionTaskSchema = z.object({
    taskName: z.string().trim().min(1, 'กรุณาระบุชื่องาน').optional(),
    description: z.string().trim().nullable().optional(),
    taskType: submissionTaskTypeEnum.optional(),
    stage: submissionTaskStageEnum.optional(),
    isRequired: z.boolean().optional(),
    allowedExtensions: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    deadlineAt: z.string().trim().nullable().optional(),
    isEnabled: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: 'กรุณาระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 รายการ',
    path: ['taskName'],
});

export const assignSubmissionTaskSchema = z.object({
    isSubmissionOpen: z.boolean().optional(),
    teamIds: z.array(z.number().int().positive()).optional(),
    teamStatuses: z.array(submissionTaskTeamStatusEnum).optional(),
}).refine((value) => (value.teamIds?.length ?? 0) > 0 || (value.teamStatuses?.length ?? 0) > 0, {
    message: 'กรุณาระบุทีมเป้าหมายอย่างน้อย 1 ทีม หรือ 1 สถานะทีม',
    path: ['teamIds'],
});

export const reorderSubmissionTasksSchema = z.object({
    updates: z.array(z.object({
        submissionTaskId: z.number().int().positive('submissionTaskId ไม่ถูกต้อง'),
        sortOrder: z.number().int().min(0, 'sortOrder ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป'),
    })).min(1, 'กรุณาระบุรายการที่ต้องการจัดลำดับ'),
});
