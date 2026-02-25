import { z } from 'zod';

export const createTeamSchema = z.object({
    teamNameTh: z.string().min(2, 'ชื่อทีมต้องมีอย่างน้อย 2 ตัวอักษร').max(255),
    teamNameEn: z.string().min(2, 'Team name must be at least 2 characters').max(255),
    visibility: z.enum(['public', 'private']).default('private'),
});

export const getTeamsSchema = z.object({
    visibility: z.enum(['public', 'private']).optional(),
    status: z.string().optional(),
});

export const requestJoinSchema = z.object({
    inviteCode: z.string().optional(), // For joining private teams via code
});

export const respondJoinSchema = z.object({
    status: z.enum(['approved', 'rejected']),
    reason: z.string().optional(),
});

export const createInvitationSchema = z.object({
    inviteeUserId: z.number().int().positive(),
});

export const respondInvitationSchema = z.object({
    status: z.enum(['accepted', 'declined']),
});
