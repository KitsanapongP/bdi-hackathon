import type { DB } from '../../config/db.js';
import * as repo from './teams.repo.js';
import { AppError } from '../../shared/errors.js';
import * as crypto from 'crypto';
import * as notificationService from '../notifications/notifications.service.js';
import * as privilegesService from '../privileges/privileges.service.js';

const MAX_TEAM_MEMBERS = 5;
const LOCKED_TEAM_STATUSES = new Set(['submitted', 'passed', 'confirmed', 'failed', 'not_joined', 'disbanded']);

function generateRandomCode(length: number = 6): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, length);
}

async function applySelectionExpiryIfNeeded(db: DB, teamId: number): Promise<void> {
    const changed = await repo.failTeamIfConfirmationExpired(db, teamId);
    if (!changed) return;
    const refreshed = await repo.getTeamById(db, teamId);
    if (!refreshed) return;
    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: refreshed.current_leader_user_id,
        actionCode: 'TEAM_CONFIRMATION_EXPIRED_AUTO_NOT_JOINED',
        actionDetail: {
            status: refreshed.status,
            confirmation_deadline_at: refreshed.confirmation_deadline_at,
        },
    });
}

function isTeamLockedForEdit(status: string): boolean {
    return LOCKED_TEAM_STATUSES.has(String(status || '').toLowerCase());
}

function assertTeamEditable(status: string, actionLabel: string): void {
    if (!isTeamLockedForEdit(status)) return;
    throw new AppError(`ไม่สามารถ${actionLabel}ได้ เนื่องจากทีมถูกล็อกหลังส่งเอกสารยืนยันตัวตนแล้ว`, 400);
}

export async function createTeam(db: DB, userId: number, data: { teamNameTh: string; teamNameEn: string; visibility: 'public' | 'private' }) {
    // Check if user is already in a team
    const inTeam = await repo.checkUserInAnyTeam(db, userId);
    if (inTeam) {
        throw new AppError('คุณอยู่ในทีมอื่นแล้ว (You are already in a team)', 400);
    }

    const teamCode = 'TM' + generateRandomCode(4);
    const inviteCode = generateRandomCode(6);

    const teamId = await repo.createTeam(db, {
        teamCode,
        teamNameTh: data.teamNameTh,
        teamNameEn: data.teamNameEn,
        visibility: data.visibility,
        leaderUserId: userId,
    });

    await repo.addTeamMember(db, {
        teamId,
        userId,
        role: 'leader',
    });

    await repo.createTeamCode(db, {
        teamId,
        inviteCode,
        createdByUserId: userId,
    });

    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: userId,
        actionCode: 'TEAM_CREATED',
        actionDetail: { visibility: data.visibility, team_code: teamCode },
    });

    return { teamId, teamCode, inviteCode };
}

export async function rotateTeamCode(db: DB, teamId: number, userId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== userId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่สามารถเปลี่ยนรหัสได้ (Only leader can rotate code)', 403);
    }
    assertTeamEditable(team.status, 'เปลี่ยนรหัสเข้าร่วมทีม');

    await repo.deactivateTeamCodes(db, teamId);
    const inviteCode = generateRandomCode(6);
    await repo.createTeamCode(db, {
        teamId,
        inviteCode,
        createdByUserId: userId,
    });

    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: userId,
        actionCode: 'TEAM_CODE_ROTATED',
        actionDetail: { invite_code: inviteCode },
    });

    return { inviteCode };
}

export async function leaveTeam(db: DB, teamId: number, userId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id === userId) {
        throw new AppError('หัวหน้าทีมไม่สามารถออกจากทีมได้ (Leader cannot leave team)', 400);
    }

    const member = await repo.getTeamMemberByTeamAndUser(db, teamId, userId);
    if (!member || member.member_status !== 'active') {
        throw new AppError('คุณไม่ได้เป็นสมาชิกทีมนี้ (You are not an active member of this team)', 400);
    }

    await repo.removeTeamMember(db, teamId, userId);
    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: userId,
        actionCode: 'MEMBER_LEFT',
        actionDetail: { user_id: userId },
    });

    return { success: true };
}

export async function removeMember(db: DB, teamId: number, leaderUserId: number, targetUserId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่สามารถลบสมาชิกได้ (Only leader can remove member)', 403);
    }
    if (leaderUserId === targetUserId) {
        throw new AppError('หัวหน้าทีมไม่สามารถลบตัวเองได้ (Leader cannot remove self)', 400);
    }
    assertTeamEditable(team.status, 'เตะสมาชิก');

    const targetMember = await repo.getTeamMemberByTeamAndUser(db, teamId, targetUserId);
    if (!targetMember || targetMember.member_status !== 'active') {
        throw new AppError('ผู้ใช้นี้ไม่ได้เป็นสมาชิกทีมนี้ (Target user is not an active member)', 400);
    }

    await repo.removeTeamMember(db, teamId, targetUserId);
    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'MEMBER_REMOVED',
        actionDetail: { target_user_id: targetUserId },
    });

    return { success: true };
}

export async function transferLeader(db: DB, teamId: number, currentLeaderUserId: number, newLeaderUserId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== currentLeaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่โอนหัวหน้าได้ (Only leader can transfer ownership)', 403);
    }
    if (currentLeaderUserId === newLeaderUserId) {
        throw new AppError('หัวหน้าทีมคนใหม่ต้องไม่ใช่คนเดิม', 400);
    }
    assertTeamEditable(team.status, 'โอนสิทธิ์หัวหน้าทีม');

    const members = await repo.getTeamMembers(db, teamId);
    const target = members.find((m) => m.user_id === newLeaderUserId);
    if (!target) {
        throw new AppError('ผู้ใช้ปลายทางไม่ได้อยู่ในทีม', 400);
    }

    await repo.updateMemberRole(db, teamId, currentLeaderUserId, 'member');
    await repo.updateMemberRole(db, teamId, newLeaderUserId, 'leader');
    await repo.updateTeamLeader(db, teamId, newLeaderUserId);

    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: currentLeaderUserId,
        actionCode: 'LEADER_TRANSFERRED',
        actionDetail: { from_user_id: currentLeaderUserId, to_user_id: newLeaderUserId },
    });

    return { success: true, newLeaderUserId };
}

export async function submitJoinRequest(db: DB, teamId: number, userId: number, inviteCode?: string) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    assertTeamEditable(team.status, 'ขอเข้าร่วมทีม');

    const inTeam = await repo.checkUserInAnyTeam(db, userId);
    if (inTeam) throw new AppError('คุณอยู่ในทีมอื่นแล้ว (You are already in a team)', 400);

    const existingRequest = await repo.getJoinRequestByUserAndTeam(db, userId, teamId);
    if (existingRequest) throw new AppError('คุณได้ส่งคำขอเข้าร่วมทีมนี้ไปแล้ว (Request already pending)', 400);

    const members = await repo.getTeamMembers(db, teamId);
    if (members.length >= MAX_TEAM_MEMBERS) {
        throw new AppError('ทีมเต็มแล้ว ไม่สามารถเข้าร่วมได้', 400);
    }

    let source: 'public_listing' | 'invite_code' = 'public_listing';
    let usedCode: string | null = null;

    if (inviteCode) {
        const activeCode = await repo.getActiveTeamCode(db, teamId);
        if (!activeCode || activeCode.invite_code !== inviteCode) {
            throw new AppError('รหัสเข้าร่วมทีมไม่ถูกต้อง (Invalid invite code)', 400);
        }
        source = 'invite_code';
        usedCode = inviteCode;
    } else {
        if (team.visibility !== 'public') {
            throw new AppError('ทีมนี้เป็นส่วนตัว ต้องใช้รหัสเข้าร่วม (Private team requires invite code)', 403);
        }
    }

    const requestId = await repo.createJoinRequest(db, {
        teamId, userId, source, inviteCode: usedCode
    });

    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: userId,
        actionCode: 'JOIN_REQUEST_SUBMITTED',
        actionDetail: { join_request_id: requestId, source, invite_code: usedCode },
    });

    return { requestId, status: 'pending' };
}

export async function getPendingJoinRequests(db: DB, teamId: number, leaderUserId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้น (Only leader)', 403);
    }
    return repo.getPendingJoinRequests(db, teamId);
}

export async function respondJoinRequest(db: DB, teamId: number, requestId: number, leaderUserId: number, status: 'approved' | 'rejected', reason?: string) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้น (Only leader)', 403);
    }
    assertTeamEditable(team.status, 'จัดการคำขอเข้าร่วมทีม');

    const request = await repo.getJoinRequestById(db, requestId);
    if (!request || request.team_id !== teamId) {
        throw new AppError('ไม่พบคำขอเข้าร่วม (Request not found)', 404);
    }
    if (request.status !== 'pending') {
        throw new AppError('คำขอนี้ถูกดำเนินการไปแล้ว (Request already processed)', 400);
    }

    const members = await repo.getTeamMembers(db, teamId);

    if (status === 'approved') {
        const requesterInAnyTeam = await repo.checkUserInAnyTeam(db, request.requester_user_id);
        if (requesterInAnyTeam) {
            throw new AppError('ผู้ใช้นี้อยู่ในทีมอื่นแล้ว', 400);
        }

        if (members.length >= MAX_TEAM_MEMBERS) {
            throw new AppError('สมาชิกในทีมเต็มแล้ว (Team is full)', 400);
        }

        const previousMembership = await repo.getTeamMemberByTeamAndUser(db, teamId, request.requester_user_id);

        // Add member
        await repo.addTeamMember(db, {
            teamId,
            userId: request.requester_user_id,
            role: 'member'
        });
        await repo.createTeamAuditLog(db, {
            teamId,
            actorUserId: leaderUserId,
            actionCode: previousMembership && previousMembership.member_status !== 'active' ? 'MEMBER_REJOINED' : 'MEMBER_JOINED',
            actionDetail: { requester_user_id: request.requester_user_id, join_request_id: requestId },
        });
        await repo.cancelOtherPendingJoinRequestsByUser(db, request.requester_user_id, requestId);
        await repo.cancelOtherPendingInvitationsByUser(db, request.requester_user_id, -1);
    }

    await repo.updateJoinRequestStatus(db, {
        requestId,
        status,
        leaderId: leaderUserId,
        reason: reason ?? null
    });

    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: leaderUserId,
        actionCode: status === 'approved' ? 'JOIN_REQUEST_APPROVED' : 'JOIN_REQUEST_REJECTED',
        actionDetail: {
            join_request_id: requestId,
            requester_user_id: request.requester_user_id,
            reason: reason ?? null,
        },
    });

    return { success: true, status };
}

export async function getTeamDetails(db: DB, teamId: number) {
    await applySelectionExpiryIfNeeded(db, teamId);
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    const members = await repo.getTeamMembers(db, teamId);
    const activeCode = await repo.getActiveTeamCode(db, teamId);
    return { team, members, activeCode: activeCode?.invite_code };
}

export async function getPublicTeams(db: DB, visibility?: string) {
    return repo.getPublicTeams(db, visibility);
}

export async function getTeamIdByInviteCode(db: DB, inviteCode: string) {
    return repo.getTeamIdByInviteCode(db, inviteCode);
}

export async function sendInvitation(
    db: DB,
    teamId: number,
    leaderUserId: number,
    input: { inviteeUserId?: number; inviteeUserName?: string }
) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้น (Only leader)', 403);
    }
    assertTeamEditable(team.status, 'เชิญสมาชิกเข้าทีม');

    const members = await repo.getTeamMembers(db, teamId);
    if (members.length >= MAX_TEAM_MEMBERS) {
        throw new AppError('ทีมเต็มแล้ว ไม่สามารถเชิญสมาชิกเพิ่มได้', 400);
    }

    let inviteeUserId = input.inviteeUserId ?? null;
    if (!inviteeUserId && input.inviteeUserName) {
        inviteeUserId = await repo.findActiveUserIdByUserName(db, input.inviteeUserName.trim());
    }
    if (!inviteeUserId) {
        throw new AppError('ไม่พบผู้ใช้จาก username ที่ระบุ', 404);
    }

    if (members.some(m => m.user_id === inviteeUserId)) {
        throw new AppError('ผู้ใช้นี้เป็นสมาชิกในทีมอยู่แล้ว (Already a member)', 400);
    }

    const existingInvitation = await repo.getPendingInvitationByUserAndTeam(db, inviteeUserId, teamId);
    if (existingInvitation) {
        throw new AppError('ได้ส่งคำเชิญไปแล้ว (Invitation already pending)', 400);
    }

    const invitationId = await repo.createInvitation(db, {
        teamId,
        inviteeUserId,
        createdByUserId: leaderUserId
    });

    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'INVITE_SENT',
        actionDetail: { invitation_id: invitationId, invited_user_id: inviteeUserId },
    });

    return { invitationId, status: 'pending' };
}

export async function getMyInvitations(db: DB, userId: number) {
    return repo.getPendingInvitationsByUser(db, userId);
}

export async function respondToInvitation(db: DB, invitationId: number, userId: number, status: 'accepted' | 'declined') {
    const invitation = await repo.getInvitationById(db, invitationId);
    if (!invitation || invitation.invitee_user_id !== userId) {
        throw new AppError('ไม่พบคำเชิญ (Invitation not found)', 404);
    }
    if (invitation.status !== 'pending') {
        throw new AppError('คำเชิญนี้ถูกดำเนินการไปแล้ว (Invitation already processed)', 400);
    }

    const team = await repo.getTeamById(db, invitation.team_id);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);

    if (status === 'accepted') {
        assertTeamEditable(team.status, 'รับคำเชิญเข้าร่วมทีม');
        const inTeam = await repo.checkUserInAnyTeam(db, userId);
        if (inTeam) {
            throw new AppError('คุณอยู่ในทีมอื่นแล้ว (You are already in a team)', 400);
        }

        const members = await repo.getTeamMembers(db, invitation.team_id);
        if (members.length >= MAX_TEAM_MEMBERS) {
            throw new AppError('ทีมเต็มแล้ว ไม่สามารถรับคำเชิญเข้าร่วมได้', 400);
        }

        const previousMembership = await repo.getTeamMemberByTeamAndUser(db, invitation.team_id, userId);

        await repo.addTeamMember(db, {
            teamId: invitation.team_id,
            userId,
            role: 'member'
        });

        await repo.createTeamAuditLog(db, {
            teamId: invitation.team_id,
            actorUserId: userId,
            actionCode: previousMembership && previousMembership.member_status !== 'active' ? 'MEMBER_REJOINED' : 'MEMBER_JOINED',
            actionDetail: { invitation_id: invitationId, user_id: userId },
        });

        await repo.cancelOtherPendingJoinRequestsByUser(db, userId, -1);
        await repo.cancelOtherPendingInvitationsByUser(db, userId, invitationId);
    }

    await repo.updateInvitationStatus(db, invitationId, status);

    await repo.createTeamAuditLog(db, {
        teamId: invitation.team_id,
        actorUserId: userId,
        actionCode: status === 'accepted' ? 'INVITE_ACCEPTED' : 'INVITE_DECLINED',
        actionDetail: { invitation_id: invitationId, invited_user_id: userId },
    });

    return { success: true, status };
}

export async function getTeamInbox(db: DB, teamId: number, userId: number, limit = 50) {
    await applySelectionExpiryIfNeeded(db, teamId);
    const member = await repo.getTeamMemberByTeamAndUser(db, teamId, userId);
    if (!member || member.member_status !== 'active') {
        throw new AppError('คุณไม่มีสิทธิ์เข้าถึงกล่องข้อความของทีมนี้', 403);
    }
    return notificationService.getTeamNotificationInbox(db, teamId, userId, limit);
}

export async function markTeamInboxAsRead(db: DB, notificationLogId: number, userId: number) {
    await notificationService.markInboxAsRead(db, notificationLogId, userId);
}

export async function confirmParticipation(db: DB, teamId: number, leaderUserId: number) {
    await applySelectionExpiryIfNeeded(db, teamId);
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่ยืนยันได้', 403);
    }
    if (team.status !== 'passed') {
        throw new AppError('ทีมนี้ยังไม่อยู่ในสถานะผ่านการคัดเลือก', 400);
    }
    if (team.confirmed_at) {
        throw new AppError('ทีมนี้ยืนยันการเข้าร่วมไปแล้ว', 400);
    }

    const now = new Date();
    if (team.confirmation_deadline_at && new Date(team.confirmation_deadline_at).getTime() < now.getTime()) {
        throw new AppError('หมดเวลายืนยันการเข้าร่วมแล้ว', 400);
    }

    await repo.confirmTeamParticipation(db, teamId, leaderUserId);
    await privilegesService.assignPublishedPrivilegesToTeam(db, teamId);
    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'TEAM_CONFIRMED_PARTICIPATION',
        actionDetail: {
            status: team.status,
            confirmation_deadline_at: team.confirmation_deadline_at,
        },
    });

    await notificationService.triggerNotificationEvent(db, {
        eventCode: 'TEAM_CONFIRMED',
        teamId,
        actorUserId: leaderUserId,
    });

    return { success: true };
}

export async function updateTeamVisibility(
    db: DB,
    teamId: number,
    leaderUserId: number,
    visibility: 'public' | 'private',
) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่แก้ไขได้', 403);
    }
    assertTeamEditable(team.status, 'เปลี่ยนการมองเห็นทีม');
    if (team.visibility === visibility) {
        return { visibility: team.visibility };
    }

    await repo.updateTeamVisibility(db, teamId, visibility);
    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'TEAM_VISIBILITY_UPDATED',
        actionDetail: {
            previous_visibility: team.visibility,
            next_visibility: visibility,
        },
    });

    return { visibility };
}

export async function updateTeamName(
    db: DB,
    teamId: number,
    leaderUserId: number,
    teamNameTh: string,
) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่แก้ไขได้', 403);
    }
    assertTeamEditable(team.status, 'แก้ไขชื่อทีม');

    const trimmedName = teamNameTh.trim();
    if (!trimmedName) {
        throw new AppError('ชื่อทีมต้องไม่ว่าง', 400);
    }
    if (trimmedName === team.team_name_th) {
        return { teamNameTh: team.team_name_th };
    }

    await repo.updateTeamName(db, teamId, trimmedName);
    await repo.createTeamAuditLog(db, {
        teamId,
        actorUserId: leaderUserId,
        actionCode: 'TEAM_NAME_UPDATED',
        actionDetail: {
            previous_team_name_th: team.team_name_th,
            next_team_name_th: trimmedName,
        },
    });

    return { teamNameTh: trimmedName };
}
