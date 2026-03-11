import { z } from 'zod';

export const privilegeTypeSchema = z.enum(['auto_admin', 'souvenir_qr']);
export const claimStatusSchema = z.enum(['pending', 'claimed']);

const nullableText = z.string().trim().nullable().optional();

export const createTemplateSchema = z.object({
  privilegeCode: z
    .string()
    .trim()
    .min(3, 'privilegeCode ต้องมีอย่างน้อย 3 ตัวอักษร')
    .max(100, 'privilegeCode ยาวเกินไป')
    .regex(/^[a-zA-Z0-9_]+$/, 'privilegeCode ใช้ได้เฉพาะ a-z A-Z 0-9 และ _')
    .transform((value) => value.toUpperCase()),
  privilegeNameTh: z.string().trim().min(1, 'privilegeNameTh ต้องไม่ว่าง').max(255),
  privilegeNameEn: nullableText,
  descriptionTh: nullableText,
  descriptionEn: nullableText,
  privilegeType: privilegeTypeSchema,
  isActive: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateTemplateSchema = z
  .object({
    privilegeCode: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(/^[a-zA-Z0-9_]+$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    privilegeNameTh: z.string().trim().min(1).max(255).optional(),
    privilegeNameEn: nullableText,
    descriptionTh: nullableText,
    descriptionEn: nullableText,
    privilegeType: privilegeTypeSchema.optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'ไม่มีข้อมูลสำหรับอัปเดต' });

export const templateIdParamSchema = z.object({
  id: z.coerce.number().int().positive('template id ไม่ถูกต้อง'),
});

export const claimIdParamSchema = z.object({
  claimId: z.coerce.number().int().positive('claim id ไม่ถูกต้อง'),
});

export const listClaimsQuerySchema = z.object({
  teamId: z.coerce.number().int().positive().optional(),
  privilegeId: z.coerce.number().int().positive().optional(),
  claimStatus: claimStatusSchema.optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const scanTokenSchema = z.object({
  token: z.string().trim().min(1, 'token ต้องไม่ว่าง'),
});

export const updateClaimSchema = z.object({
  claimStatus: claimStatusSchema,
  claimNote: z.string().trim().max(500).nullable().optional(),
});

export const teamPrivilegeParamSchema = z.object({
  teamId: z.coerce.number().int().positive('teamId ไม่ถูกต้อง'),
  privilegeId: z.coerce.number().int().positive('privilegeId ไม่ถูกต้อง'),
});

export const applyTeamClaimSchema = z.object({
  claimStatus: claimStatusSchema,
  claimNote: z.string().trim().max(500).nullable().optional(),
});

export const publishTemplateSchema = z.object({
  isPublished: z.boolean(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ListClaimsQueryInput = z.infer<typeof listClaimsQuerySchema>;
