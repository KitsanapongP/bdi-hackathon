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
