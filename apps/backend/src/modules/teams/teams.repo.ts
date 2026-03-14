import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
    TeamRow,
    TeamMemberRow,
    TeamCodeRow,
    TeamJoinRequestRow,
    TeamInvitationRow,
    TeamMemberProfileRow,
    TeamMemberSocialLinkRow,
} from './teams.types.js';

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
        INSERT INTO team_members (team_id, user_id, role, member_status, joined_at, left_at)
        VALUES (:teamId, :userId, :role, 'active', NOW(), NULL)
        ON DUPLICATE KEY UPDATE
            role = VALUES(role),
            member_status = 'active',
            left_at = NULL,
            joined_at = IF(member_status <> 'active', NOW(), joined_at)
    `, data);
}

export async function getTeamMemberByTeamAndUser(db: DB, teamId: number, userId: number): Promise<TeamMemberRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT *
        FROM team_members
        WHERE team_id = :teamId AND user_id = :userId
        LIMIT 1
    `, { teamId, userId });

    return (rows[0] as TeamMemberRow | undefined) ?? null;
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
         WHERE m.team_id = :teamId AND m.member_status = 'active'
         ORDER BY CASE WHEN m.role = 'leader' THEN 0 ELSE 1 END, m.joined_at ASC`,
        { teamId }
    );
    return rows;
}

export async function getTeamMemberProfileByUserId(db: DB, userId: number): Promise<TeamMemberProfileRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT
            u.user_id,
            u.user_name,
            u.email,
            u.phone,
            u.institution_name_th,
            u.institution_name_en,
            u.first_name_th,
            u.last_name_th,
            u.first_name_en,
            u.last_name_en,
            IFNULL(p.show_email, 0) AS show_email,
            IFNULL(p.show_phone, 0) AS show_phone,
            IFNULL(p.show_university, 1) AS show_university,
            IFNULL(p.show_real_name, 0) AS show_real_name,
            IFNULL(p.show_social_links, 1) AS show_social_links,
            pp.bio_th,
            pp.bio_en,
            pp.contact_note
         FROM user_users u
         LEFT JOIN user_privacy_settings p ON p.user_id = u.user_id
         LEFT JOIN user_public_profiles pp ON pp.user_id = u.user_id
         WHERE u.user_id = :userId
           AND u.is_active = 1
           AND u.deleted_at IS NULL
         LIMIT 1`,
        { userId },
    );
    return (rows[0] as TeamMemberProfileRow | undefined) ?? null;
}

export async function getVisibleSocialLinksByUserId(db: DB, userId: number): Promise<TeamMemberSocialLinkRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT social_link_id, platform_code, profile_url, display_text
         FROM user_social_links
         WHERE user_id = :userId
           AND is_visible = 1
         ORDER BY created_at ASC`,
        { userId },
    );
    return rows as TeamMemberSocialLinkRow[];
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
        SELECT r.*, u.user_name AS requester_user_name
        FROM team_join_requests r
        JOIN user_users u ON u.user_id = r.requester_user_id
        WHERE r.team_id = :teamId AND r.status = 'pending'
        ORDER BY r.created_at ASC
    `, { teamId });
    return rows as TeamJoinRequestRow[];
}

export async function findActiveUserIdByUserName(db: DB, userName: string): Promise<number | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT user_id
        FROM user_users
        WHERE user_name = :userName
          AND is_active = 1
          AND deleted_at IS NULL
        LIMIT 1
    `, { userName });
    return (rows[0] as { user_id: number } | undefined)?.user_id ?? null;
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

export async function cancelOtherPendingJoinRequestsByUser(
    db: DB,
    userId: number,
    exceptRequestId: number
): Promise<void> {
    await db.query(`
        UPDATE team_join_requests
        SET status = 'cancelled',
            leader_reason = 'Auto-cancelled: user already joined another team',
            updated_at = NOW()
        WHERE requester_user_id = :userId
          AND status = 'pending'
          AND join_request_id <> :exceptRequestId
    `, { userId, exceptRequestId });
}

export async function createInvitation(db: DB, data: {
    teamId: number;
    inviteeUserId: number;
    createdByUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(`
        INSERT INTO team_invitations (team_id, invited_user_id, status, created_at, updated_at, invited_by_user_id)
        VALUES (:teamId, :inviteeUserId, 'pending', NOW(), NOW(), :createdByUserId)
    `, data);
    return result.insertId;
}

export async function getInvitationById(db: DB, invitationId: number): Promise<TeamInvitationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT invitation_id, team_id, invited_user_id as invitee_user_id, status, created_at, updated_at, invited_by_user_id as created_by_user_id
        FROM team_invitations
        WHERE invitation_id = :invitationId LIMIT 1
    `, { invitationId });
    return (rows[0] as TeamInvitationRow | undefined) ?? null;
}

export async function getPendingInvitationsByUser(db: DB, userId: number): Promise<TeamInvitationRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT i.invitation_id, i.team_id, i.invited_user_id as invitee_user_id, i.status, i.created_at, i.updated_at, i.invited_by_user_id as created_by_user_id,
               t.team_name_th, t.team_code, u.user_name as invited_by_user_name
        FROM team_invitations i
        JOIN team_teams t ON t.team_id = i.team_id
        LEFT JOIN user_users u ON u.user_id = i.invited_by_user_id
        WHERE i.invited_user_id = :userId AND i.status = 'pending'
        ORDER BY i.created_at DESC
    `, { userId });
    return rows as TeamInvitationRow[];
}

export async function getPendingInvitationByUserAndTeam(db: DB, userId: number, teamId: number): Promise<TeamInvitationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT invitation_id, team_id, invited_user_id as invitee_user_id, status, created_at, updated_at, invited_by_user_id as created_by_user_id
        FROM team_invitations 
        WHERE invited_user_id = :userId AND team_id = :teamId AND status = 'pending' LIMIT 1
    `, { userId, teamId });
    return (rows[0] as TeamInvitationRow | undefined) ?? null;
}

export async function updateInvitationStatus(db: DB, invitationId: number, status: 'accepted' | 'declined'): Promise<void> {
    await db.query(`
        UPDATE team_invitations
        SET status = :status,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE invitation_id = :invitationId
    `, { invitationId, status });
}

export async function cancelOtherPendingInvitationsByUser(
    db: DB,
    userId: number,
    exceptInvitationId: number
): Promise<void> {
    await db.query(`
        UPDATE team_invitations
        SET status = 'cancelled', updated_at = NOW()
        WHERE invited_user_id = :userId
          AND status = 'pending'
          AND invitation_id <> :exceptInvitationId
    `, { userId, exceptInvitationId });
}

export async function updateTeamLeader(db: DB, teamId: number, newLeaderUserId: number): Promise<void> {
    await db.query(`
        UPDATE team_teams
        SET current_leader_user_id = :newLeaderUserId, updated_at = NOW()
        WHERE team_id = :teamId
    `, { teamId, newLeaderUserId });
}

export async function updateMemberRole(
    db: DB,
    teamId: number,
    userId: number,
    role: 'leader' | 'member'
): Promise<void> {
    await db.query(`
        UPDATE team_members
        SET role = :role
        WHERE team_id = :teamId
          AND user_id = :userId
          AND member_status = 'active'
    `, { teamId, userId, role });
}

export async function createTeamAuditLog(db: DB, data: {
    teamId: number;
    actorUserId: number;
    actionCode: string;
    actionDetail?: Record<string, unknown> | null;
}): Promise<void> {
    await db.query(`
        INSERT INTO team_audit_logs (team_id, actor_user_id, action_code, action_detail, created_at)
        VALUES (:teamId, :actorUserId, :actionCode, :actionDetail, NOW())
    `, {
        teamId: data.teamId,
        actorUserId: data.actorUserId,
        actionCode: data.actionCode,
        actionDetail: data.actionDetail ? JSON.stringify(data.actionDetail) : null,
    });
}

export async function checkTeamHasSubmittedVerification(db: DB, teamId: number): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT 1 FROM verify_review_rounds
        WHERE team_id = :teamId AND status IN ('submitted', 'completed')
        LIMIT 1
    `, { teamId });
    return rows.length > 0;
}

export async function updateTeamVisibility(db: DB, teamId: number, visibility: 'public' | 'private'): Promise<void> {
    await db.query(`
        UPDATE team_teams
        SET visibility = :visibility,
            updated_at = NOW()
        WHERE team_id = :teamId
    `, { teamId, visibility });
}

export async function updateTeamName(db: DB, teamId: number, teamNameTh: string): Promise<void> {
    await db.query(`
        UPDATE team_teams
        SET team_name_th = :teamNameTh,
            updated_at = NOW()
        WHERE team_id = :teamId
    `, { teamId, teamNameTh });
}

export async function confirmTeamParticipation(
    db: DB,
    teamId: number,
    leaderUserId: number,
): Promise<void> {
    await db.query(`
        UPDATE team_teams
        SET status = 'confirmed',
            confirmed_at = NOW(),
            confirmed_by_user_id = :leaderUserId,
            updated_at = NOW()
        WHERE team_id = :teamId
          AND status = 'passed'
          AND confirmed_at IS NULL
    `, { teamId, leaderUserId });
}

export async function failTeamIfConfirmationExpired(db: DB, teamId: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>(`
        UPDATE team_teams
        SET status = 'not_joined',
            updated_at = NOW()
        WHERE team_id = :teamId
          AND status = 'passed'
          AND confirmed_at IS NULL
          AND confirmation_deadline_at IS NOT NULL
          AND confirmation_deadline_at < NOW()
    `, { teamId });
    return result.affectedRows > 0;
}
