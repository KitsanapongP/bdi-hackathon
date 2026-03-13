import { z } from 'zod';

/* ── 1.6 Profile edit ── */
export const updateProfileSchema = z.object({
    userName: z.string().min(3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร').max(50).optional(),
    firstNameTh: z.string().max(100).optional(),
    lastNameTh: z.string().max(100).optional(),
    firstNameEn: z.string().max(100).optional(),
    lastNameEn: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
    institutionNameTh: z.string().max(255).optional(),
    institutionNameEn: z.string().max(255).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    birthDate: z.string().date('วันเดือนปีเกิดไม่ถูกต้อง').optional(),
    educationLevel: z.enum(['secondary', 'high_school', 'bachelor', 'master', 'doctorate']).optional(),
    homeProvince: z.string().max(100).optional(),
});

/* ── 1.7 Privacy settings ── */
export const updatePrivacySchema = z.object({
    showEmail: z.boolean().optional(),
    showPhone: z.boolean().optional(),
    showUniversity: z.boolean().optional(),
    showRealName: z.boolean().optional(),
    showSocialLinks: z.boolean().optional(),
});

/* ── 1.8 Social links ── */
export const createSocialLinkSchema = z.object({
    platformCode: z.string().min(1, 'กรุณาระบุ platform').max(50),
    profileUrl: z.string().url('URL ไม่ถูกต้อง').max(500),
    displayText: z.string().max(255).optional(),
});

export const updateSocialLinkSchema = z.object({
    profileUrl: z.string().url('URL ไม่ถูกต้อง').max(500).optional(),
    displayText: z.string().max(255).optional(),
    isVisible: z.boolean().optional(),
});

/* ── 1.9 Public profile ── */
export const updatePublicProfileSchema = z.object({
    bioTh: z.string().max(2000).optional().nullable(),
    bioEn: z.string().max(2000).optional().nullable(),
    lookingForTeam: z.boolean().optional(),
    contactNote: z.string().max(500).optional().nullable(),
});
