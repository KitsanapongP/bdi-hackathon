import type { DB } from '../../config/db.js';
import * as repo from './teams.repo.js';
import { AppError } from '../../shared/errors.js';
import * as crypto from 'crypto';

function generateRandomCode(length: number = 6): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, length);
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

    return { teamId, teamCode, inviteCode };
}

export async function rotateTeamCode(db: DB, teamId: number, userId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== userId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่สามารถเปลี่ยนรหัสได้ (Only leader can rotate code)', 403);
    }

    await repo.deactivateTeamCodes(db, teamId);
    const inviteCode = generateRandomCode(6);
    await repo.createTeamCode(db, {
        teamId,
        inviteCode,
        createdByUserId: userId,
    });
    return { inviteCode };
}

export async function leaveTeam(db: DB, teamId: number, userId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id === userId) {
        throw new AppError('หัวหน้าทีมไม่สามารถออกจากทีมได้ (Leader cannot leave team)', 400);
    }

    await repo.removeTeamMember(db, teamId, userId);
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

    await repo.removeTeamMember(db, teamId, targetUserId);
    return { success: true };
}

export async function submitJoinRequest(db: DB, teamId: number, userId: number, inviteCode?: string) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);

    const inTeam = await repo.checkUserInAnyTeam(db, userId);
    if (inTeam) throw new AppError('คุณอยู่ในทีมอื่นแล้ว (You are already in a team)', 400);

    const existingRequest = await repo.getJoinRequestByUserAndTeam(db, userId, teamId);
    if (existingRequest) throw new AppError('คุณได้ส่งคำขอเข้าร่วมทีมนี้ไปแล้ว (Request already pending)', 400);

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

    const request = await repo.getJoinRequestById(db, requestId);
    if (!request || request.team_id !== teamId) {
        throw new AppError('ไม่พบคำขอเข้าร่วม (Request not found)', 404);
    }
    if (request.status !== 'pending') {
        throw new AppError('คำขอนี้ถูกดำเนินการไปแล้ว (Request already processed)', 400);
    }

    const members = await repo.getTeamMembers(db, teamId);

    if (status === 'approved') {
        if (members.length >= 5) {
            throw new AppError('สมาชิกในทีมเต็มแล้ว (Team is full)', 400);
        }

        // Add member
        await repo.addTeamMember(db, {
            teamId,
            userId: request.requester_user_id,
            role: 'member'
        });
    }

    await repo.updateJoinRequestStatus(db, {
        requestId,
        status,
        leaderId: leaderUserId,
        reason: reason ?? null
    });

    return { success: true, status };
}

export async function getTeamDetails(db: DB, teamId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    const members = await repo.getTeamMembers(db, teamId);
    const activeCode = await repo.getActiveTeamCode(db, teamId);
    return { team, members, activeCode: activeCode?.invite_code };
}

export async function getPublicTeams(db: DB, visibility?: string) {
    return repo.getPublicTeams(db, visibility);
}

export async function sendInvitation(db: DB, teamId: number, leaderUserId: number, inviteeUserId: number) {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new AppError('ไม่พบทีม (Team not found)', 404);
    if (team.current_leader_user_id !== leaderUserId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้น (Only leader)', 403);
    }

    const members = await repo.getTeamMembers(db, teamId);
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

    if (status === 'accepted') {
        const inTeam = await repo.checkUserInAnyTeam(db, userId);
        if (inTeam) {
            throw new AppError('คุณอยู่ในทีมอื่นแล้ว (You are already in a team)', 400);
        }

        const members = await repo.getTeamMembers(db, invitation.team_id);
        if (members.length >= 5) {
            throw new AppError('สมาชิกในทีมเต็มแล้ว (Team is full)', 400);
        }

        await repo.addTeamMember(db, {
            teamId: invitation.team_id,
            userId,
            role: 'member'
        });
    }

    await repo.updateInvitationStatus(db, invitationId, status);
    return { success: true, status };
}
