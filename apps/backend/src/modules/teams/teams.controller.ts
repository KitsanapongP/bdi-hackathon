import type { FastifyRequest, FastifyReply } from 'fastify';
import { createTeamSchema, getTeamsSchema, requestJoinSchema, respondJoinSchema, createInvitationSchema, respondInvitationSchema, joinByCodeSchema, transferLeaderSchema, updateTeamVisibilitySchema } from './teams.schema.js';
import * as service from './teams.service.js';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import type { JwtPayload } from '../auth/auth.types.js';

export async function handleCreateTeam(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createTeamSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const result = await service.createTeam(req.server.ctx.db, user.userId, parsed.data);
        return reply.status(201).send(ok(result, 'สร้างทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetPublicTeams(req: FastifyRequest, reply: FastifyReply) {
    const parsed = getTeamsSchema.safeParse(req.query);
    const visibility = parsed.success ? parsed.data.visibility : undefined;
    const teams = await service.getPublicTeams(req.server.ctx.db, visibility);
    return reply.send(ok(teams));
}

export async function handleGetTeamDetails(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    try {
        const details = await service.getTeamDetails(req.server.ctx.db, teamId);
        return reply.send(ok(details));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleRotateCode(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    const user = req.user as JwtPayload;
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    try {
        const result = await service.rotateTeamCode(req.server.ctx.db, teamId, user.userId);
        return reply.send(ok(result, 'เปลี่ยนรหัสเข้าร่วมทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleLeaveTeam(req: FastifyRequest<{ Params: { id: string; userId: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    const targetUserId = parseInt(req.params.userId, 10);
    const user = req.user as JwtPayload;
    if (isNaN(teamId) || isNaN(targetUserId)) return reply.status(400).send({ ok: false, message: 'Invalid ID' });

    try {
        if (user.userId === targetUserId) {
            // Self leave
            await service.leaveTeam(req.server.ctx.db, teamId, user.userId);
            return reply.send(ok(null, 'ออกจากทีมสำเร็จ'));
        } else {
            // Leader removes member
            await service.removeMember(req.server.ctx.db, teamId, user.userId, targetUserId);
            return reply.send(ok(null, 'ลบสมาชิกสำเร็จ'));
        }
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleTransferLeader(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    const user = req.user as JwtPayload;
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const parsed = transferLeaderSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }

    try {
        const result = await service.transferLeader(req.server.ctx.db, teamId, user.userId, parsed.data.newLeaderUserId);
        return reply.send(ok(result, 'โอนหัวหน้าทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleUpdateTeamVisibility(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const parsed = updateTeamVisibilitySchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const result = await service.updateTeamVisibility(req.server.ctx.db, teamId, user.userId, parsed.data.visibility);
        return reply.send(ok(result, 'อัปเดตสถานะ public/private ของทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleSubmitJoinRequest(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const parsed = requestJoinSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const result = await service.submitJoinRequest(req.server.ctx.db, teamId, user.userId, parsed.data.inviteCode);
        return reply.status(201).send(ok(result, 'ส่งคำขอเข้าร่วมทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetPendingJoinRequests(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const user = req.user as JwtPayload;
    try {
        const requests = await service.getPendingJoinRequests(req.server.ctx.db, teamId, user.userId);
        return reply.send(ok(requests));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleRespondJoinRequest(req: FastifyRequest<{ Params: { id: string; requestId: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    const requestId = parseInt(req.params.requestId, 10);
    if (isNaN(teamId) || isNaN(requestId)) return reply.status(400).send({ ok: false, message: 'Invalid ID' });
    const parsed = respondJoinSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const result = await service.respondJoinRequest(req.server.ctx.db, teamId, requestId, user.userId, parsed.data.status, parsed.data.reason);
        return reply.send(ok(result, 'ดำเนินการสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleSendInvitation(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const parsed = createInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const invitationInput: { inviteeUserId?: number; inviteeUserName?: string } = {};
        if (parsed.data.inviteeUserId !== undefined) invitationInput.inviteeUserId = parsed.data.inviteeUserId;
        if (parsed.data.inviteeUserName !== undefined) invitationInput.inviteeUserName = parsed.data.inviteeUserName;
        const result = await service.sendInvitation(req.server.ctx.db, teamId, user.userId, invitationInput);
        return reply.status(201).send(ok(result, 'ส่งคำเชิญสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetMyInvitations(req: FastifyRequest, reply: FastifyReply) {
    const user = req.user as JwtPayload;
    const invitations = await service.getMyInvitations(req.server.ctx.db, user.userId);
    return reply.send(ok(invitations));
}

export async function handleRespondInvitation(req: FastifyRequest<{ Params: { invitationId: string } }>, reply: FastifyReply) {
    const invitationId = parseInt(req.params.invitationId, 10);
    if (isNaN(invitationId)) return reply.status(400).send({ ok: false, message: 'Invalid invitation ID' });
    const parsed = respondInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const result = await service.respondToInvitation(req.server.ctx.db, invitationId, user.userId, parsed.data.status);
        return reply.send(ok(result, 'ดำเนินการสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleJoinByCode(req: FastifyRequest, reply: FastifyReply) {
    const parsed = joinByCodeSchema.safeParse(req.body);
    if (!parsed.success) {
        return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
    }
    const user = req.user as JwtPayload;
    try {
        const teamId = await service.getTeamIdByInviteCode(req.server.ctx.db, parsed.data.inviteCode);
        if (!teamId) {
            return reply.status(404).send({ ok: false, message: 'รหัสอ้างอิงไม่ถูกต้อง หรือหมดอายุแล้ว' });
        }
        const result = await service.submitJoinRequest(req.server.ctx.db, teamId, user.userId, parsed.data.inviteCode);
        return reply.status(201).send(ok(result, 'ส่งคำขอเข้าร่วมทีมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleGetTeamInbox(req: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const user = req.user as JwtPayload;
    const limit = Number(req.query.limit || 50);
    try {
        const data = await service.getTeamInbox(req.server.ctx.db, teamId, user.userId, limit);
        return reply.send(ok(data));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleMarkTeamInboxRead(req: FastifyRequest<{ Params: { notificationLogId: string } }>, reply: FastifyReply) {
    const notificationLogId = Number(req.params.notificationLogId);
    if (!Number.isFinite(notificationLogId)) {
        return reply.status(400).send({ ok: false, message: 'Invalid notification log id' });
    }
    const user = req.user as JwtPayload;
    try {
        await service.markTeamInboxAsRead(req.server.ctx.db, notificationLogId, user.userId);
        return reply.send(ok(null, 'อ่านข้อความสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}

export async function handleConfirmParticipation(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const teamId = parseInt(req.params.id, 10);
    if (isNaN(teamId)) return reply.status(400).send({ ok: false, message: 'Invalid team ID' });
    const user = req.user as JwtPayload;
    try {
        const result = await service.confirmParticipation(req.server.ctx.db, teamId, user.userId);
        return reply.send(ok(result, 'ยืนยันการเข้าร่วมสำเร็จ'));
    } catch (err) {
        if (err instanceof AppError) {
            return reply.status(err.statusCode).send({ ok: false, message: err.message });
        }
        throw err;
    }
}
