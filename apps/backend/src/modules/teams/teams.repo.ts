import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { TeamRow, TeamMemberRow, TeamCodeRow, TeamJoinRequestRow, TeamInvitationRow } from './teams.types.js';

export async function createTeam(db: DB, data: {
    teamCode: string;
    teamNameTh: string;
    teamNameEn: string;
    visibility: 'public' | 'private';
    leaderUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO team_teams (team_code, team_name_th, team_name_en, visibility, current_leader_user_id, status, created_at, updated_at)
         VALUES (:teamCode, :teamNameTh, :teamNameEn, :visibility, :leaderUserId, 'forming', NOW(), NOW())`,
        data
    );
    return result.insertId;
}

export async function addTeamMember(db: DB, data: {
    teamId: number;
    userId: number;
    role: 'leader' | 'member';
}): Promise<void> {
    await db.query(`
        INSERT INTO team_members (team_id, user_id, role, member_status, joined_at)
        VALUES (:teamId, :userId, :role, 'active', NOW())
    `, data);
}

export async function createTeamCode(db: DB, data: {
    teamId: number;
    inviteCode: string;
    createdByUserId: number;
}): Promise<void> {
    await db.query(`
        INSERT INTO team_team_codes (team_id, invite_code, is_active, created_at, created_by_user_id)
        VALUES (:teamId, :inviteCode, 1, NOW(), :createdByUserId)
    `, data);
}

export async function deactivateTeamCodes(db: DB, teamId: number): Promise<void> {
    await db.query(`
        UPDATE team_team_codes SET is_active = 0 WHERE team_id = :teamId AND is_active = 1
    `, { teamId });
}

export async function getTeamById(db: DB, teamId: number): Promise<TeamRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM team_teams WHERE team_id = :teamId AND deleted_at IS NULL LIMIT 1`,
        { teamId }
    );
    return (rows[0] as TeamRow | undefined) ?? null;
}

export async function getTeamMembers(db: DB, teamId: number): Promise<any[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT m.*, u.user_name, u.first_name_th, u.last_name_th, IFNULL(p.show_real_name, 0) as show_real_name 
         FROM team_members m
         JOIN user_users u ON m.user_id = u.user_id
         LEFT JOIN user_privacy_settings p ON u.user_id = p.user_id
         WHERE m.team_id = :teamId AND m.member_status = 'active'`,
        { teamId }
    );
    return rows;
}

export async function getPublicTeams(db: DB, visibility?: string): Promise<TeamRow[]> {
    let sql = `SELECT t.*, (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.team_id AND m.member_status = 'active') AS member_count 
               FROM team_teams t WHERE t.deleted_at IS NULL`;
    const params: any = {};
    if (visibility) {
        sql += ` AND visibility = :visibility`;
        params.visibility = visibility;
    } else {
        sql += ` AND visibility = 'public'`;
    }
    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows as TeamRow[];
}

export async function checkUserInAnyTeam(db: DB, userId: number): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT 1 FROM team_members 
        WHERE user_id = :userId AND member_status = 'active'
        LIMIT 1
        `, { userId });
    return rows.length > 0;
}

export async function removeTeamMember(db: DB, teamId: number, userId: number): Promise<void> {
    await db.query(`
        UPDATE team_members SET member_status = 'left', left_at = NOW() 
        WHERE team_id = :teamId AND user_id = :userId AND member_status = 'active'
        `, { teamId, userId });
}

export async function getActiveTeamCode(db: DB, teamId: number): Promise<TeamCodeRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
    SELECT * FROM team_team_codes 
        WHERE team_id = :teamId AND is_active = 1 LIMIT 1
        `, { teamId });
    return (rows[0] as TeamCodeRow | undefined) ?? null;
}

export async function getTeamIdByInviteCode(db: DB, inviteCode: string): Promise<number | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT team_id FROM team_team_codes 
        WHERE invite_code = :inviteCode AND is_active = 1 LIMIT 1
    `, { inviteCode });
    return (rows[0] as { team_id: number } | undefined)?.team_id ?? null;
}

export async function createJoinRequest(db: DB, data: {
    teamId: number;
    userId: number;
    source: 'public_listing' | 'invite_code';
    inviteCode: string | null;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(`
        INSERT INTO team_join_requests (team_id, requester_user_id, request_source, used_invite_code, status, created_at, updated_at)
        VALUES (:teamId, :userId, :source, :inviteCode, 'pending', NOW(), NOW())
    `, data);
    return result.insertId;
}

export async function getPendingJoinRequests(db: DB, teamId: number): Promise<TeamJoinRequestRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM team_join_requests WHERE team_id = :teamId AND status = 'pending'
    `, { teamId });
    return rows as TeamJoinRequestRow[];
}

export async function getJoinRequestById(db: DB, requestId: number): Promise<TeamJoinRequestRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM team_join_requests WHERE join_request_id = :requestId LIMIT 1
    `, { requestId });
    return (rows[0] as TeamJoinRequestRow | undefined) ?? null;
}

export async function getJoinRequestByUserAndTeam(db: DB, userId: number, teamId: number): Promise<TeamJoinRequestRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM team_join_requests 
        WHERE requester_user_id = :userId AND team_id = :teamId AND status = 'pending' 
        LIMIT 1
    `, { userId, teamId });
    return (rows[0] as TeamJoinRequestRow | undefined) ?? null;
}

export async function updateJoinRequestStatus(db: DB, data: {
    requestId: number;
    status: 'approved' | 'rejected';
    leaderId: number;
    reason: string | null;
}): Promise<void> {
    await db.query(`
        UPDATE team_join_requests 
        SET status = :status, leader_action_by_user_id = :leaderId, leader_action_at = NOW(), leader_reason = :reason, updated_at = NOW()
        WHERE join_request_id = :requestId
    `, data);
}

export async function createInvitation(db: DB, data: {
    teamId: number;
    inviteeUserId: number;
    createdByUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(`
        INSERT INTO team_invitations (team_id, invitee_user_id, status, created_at, updated_at, created_by_user_id)
        VALUES (:teamId, :inviteeUserId, 'pending', NOW(), NOW(), :createdByUserId)
    `, data);
    return result.insertId;
}

export async function getInvitationById(db: DB, invitationId: number): Promise<TeamInvitationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM team_invitations WHERE invitation_id = :invitationId LIMIT 1
    `, { invitationId });
    return (rows[0] as TeamInvitationRow | undefined) ?? null;
}

export async function getPendingInvitationsByUser(db: DB, userId: number): Promise<TeamInvitationRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM team_invitations WHERE invitee_user_id = :userId AND status = 'pending'
    `, { userId });
    return rows as TeamInvitationRow[];
}

export async function getPendingInvitationByUserAndTeam(db: DB, userId: number, teamId: number): Promise<TeamInvitationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM team_invitations 
        WHERE invitee_user_id = :userId AND team_id = :teamId AND status = 'pending' LIMIT 1
    `, { userId, teamId });
    return (rows[0] as TeamInvitationRow | undefined) ?? null;
}

export async function updateInvitationStatus(db: DB, invitationId: number, status: 'accepted' | 'declined'): Promise<void> {
    await db.query(`
        UPDATE team_invitations SET status = :status, updated_at = NOW() WHERE invitation_id = :invitationId
    `, { invitationId, status });
}
