import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { VerifyMemberProfileRow, VerifyMemberDocumentRow, VerifyReviewRoundRow } from './verification.types.js';

// ── Review Rounds ──

export async function getLatestVerifyRound(db: DB, teamId: number): Promise<VerifyReviewRoundRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM verify_review_rounds
        WHERE team_id = :teamId
        ORDER BY round_no DESC
        LIMIT 1
    `, { teamId });
    return (rows[0] as VerifyReviewRoundRow | undefined) ?? null;
}

export async function createVerifyRound(db: DB, teamId: number, userId: number): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(`
        INSERT INTO verify_review_rounds (team_id, round_no, status, created_by_user_id, created_at)
        VALUES (:teamId, 1, 'draft', :userId, NOW())
    `, { teamId, userId });
    return result.insertId;
}

export async function getOrCreateVerifyRound(db: DB, teamId: number, userId: number): Promise<VerifyReviewRoundRow> {
    let round = await getLatestVerifyRound(db, teamId);
    if (!round) {
        const roundId = await createVerifyRound(db, teamId, userId);
        round = await getLatestVerifyRound(db, teamId);
        if (!round) throw new Error('Failed to create verify round');
    }
    return round;
}

export async function lockVerifyRound(db: DB, roundId: number): Promise<void> {
    await db.query(`
        UPDATE verify_review_rounds
        SET status = 'locked', locked_at = NOW()
        WHERE verify_round_id = :roundId
    `, { roundId });
}

export async function submitVerifyRound(db: DB, roundId: number): Promise<void> {
    await db.query(`
        UPDATE verify_review_rounds
        SET status = 'submitted', submitted_at = NOW()
        WHERE verify_round_id = :roundId
    `, { roundId });
}

// ── Verify Member Profiles ──

export async function getVerifyProfile(
    db: DB,
    teamId: number,
    userId: number,
    verifyRoundId?: number | null
): Promise<VerifyMemberProfileRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM verify_member_profiles
        WHERE team_id = :teamId
          AND user_id = :userId
          AND (:verifyRoundId IS NULL OR verify_round_id = :verifyRoundId)
        ORDER BY verify_round_id DESC
        LIMIT 1
    `, { teamId, userId, verifyRoundId: verifyRoundId ?? null });
    return (rows[0] as VerifyMemberProfileRow | undefined) ?? null;
}

export async function upsertVerifyProfile(db: DB, data: {
    verifyRoundId: number;
    teamId: number;
    userId: number;
}): Promise<void> {
    await db.query(`
        INSERT INTO verify_member_profiles (verify_round_id, team_id, user_id, is_profile_complete, is_member_confirmed, updated_at)
        VALUES (:verifyRoundId, :teamId, :userId, 0, 0, NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
    `, data);
}

export async function setMemberConfirmed(db: DB, verifyRoundId: number, teamId: number, userId: number): Promise<void> {
    await db.query(`
        UPDATE verify_member_profiles
        SET is_member_confirmed = 1, member_confirmed_at = NOW()
        WHERE verify_round_id = :verifyRoundId AND team_id = :teamId AND user_id = :userId
    `, { verifyRoundId, teamId, userId });
}

export async function setMemberUnconfirmed(db: DB, verifyRoundId: number, teamId: number, userId: number): Promise<void> {
    await db.query(`
        UPDATE verify_member_profiles
        SET is_member_confirmed = 0, member_unconfirmed_at = NOW()
        WHERE verify_round_id = :verifyRoundId AND team_id = :teamId AND user_id = :userId
    `, { verifyRoundId, teamId, userId });
}

// ── Team Verification Status (aggregated view) ──

export async function getTeamVerificationMembers(
    db: DB,
    teamId: number,
    verifyRoundId?: number | null
): Promise<RowDataPacket[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT
            m.user_id,
            u.user_name,
            u.first_name_th,
            u.last_name_th,
            u.institution_name_th,
            u.email,
            m.role,
            IFNULL(vp.is_member_confirmed, 0) AS is_member_confirmed,
            vp.member_confirmed_at,
            (SELECT COUNT(*) FROM verify_member_documents d
             WHERE d.team_id = m.team_id AND d.user_id = m.user_id
               AND d.is_current = 1 AND d.deleted_at IS NULL) AS document_count
        FROM team_members m
        JOIN user_users u ON u.user_id = m.user_id
        LEFT JOIN verify_member_profiles vp
            ON vp.team_id = m.team_id
           AND vp.user_id = m.user_id
           AND (:verifyRoundId IS NULL OR vp.verify_round_id = :verifyRoundId)
        WHERE m.team_id = :teamId AND m.member_status = 'active'
        ORDER BY CASE WHEN m.role = 'leader' THEN 0 ELSE 1 END, m.joined_at ASC
    `, { teamId, verifyRoundId: verifyRoundId ?? null });
    return rows;
}

export async function areAllMembersConfirmed(
    db: DB,
    teamId: number,
    verifyRoundId: number
): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN IFNULL(vp.is_member_confirmed, 0) = 1 THEN 1 ELSE 0 END) AS confirmed
        FROM team_members m
        LEFT JOIN verify_member_profiles vp
            ON vp.team_id = m.team_id
           AND vp.user_id = m.user_id
           AND vp.verify_round_id = :verifyRoundId
        WHERE m.team_id = :teamId AND m.member_status = 'active'
    `, { teamId, verifyRoundId });
    const row = rows[0] as { total: number | string; confirmed: number | string };
    return Number(row.total) > 0 && Number(row.total) === Number(row.confirmed);
}

// ── Documents ──

export async function getDocumentsByTeamAndUser(db: DB, teamId: number, userId: number): Promise<VerifyMemberDocumentRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM verify_member_documents
        WHERE team_id = :teamId AND user_id = :userId AND is_current = 1 AND deleted_at IS NULL
        ORDER BY uploaded_at ASC
    `, { teamId, userId });
    return rows as VerifyMemberDocumentRow[];
}

export async function insertDocument(db: DB, data: {
    verifyRoundId: number;
    teamId: number;
    userId: number;
    requirementId: number;
    fileStorageKey: string;
    fileOriginalName: string;
    fileMimeType: string;
    fileSizeBytes: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(`
        INSERT INTO verify_member_documents
            (verify_round_id, team_id, user_id, requirement_id, file_storage_key, file_original_name, file_mime_type, file_size_bytes, is_current, uploaded_at, uploaded_by_user_id)
        VALUES
            (:verifyRoundId, :teamId, :userId, :requirementId, :fileStorageKey, :fileOriginalName, :fileMimeType, :fileSizeBytes, 1, NOW(), :userId)
    `, data);
    return result.insertId;
}

export async function getDocumentById(db: DB, documentId: number): Promise<VerifyMemberDocumentRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT * FROM verify_member_documents
        WHERE document_id = :documentId AND deleted_at IS NULL
        LIMIT 1
    `, { documentId });
    return (rows[0] as VerifyMemberDocumentRow | undefined) ?? null;
}

export async function softDeleteDocument(db: DB, documentId: number): Promise<void> {
    await db.query(`
        UPDATE verify_member_documents SET deleted_at = NOW() WHERE document_id = :documentId
    `, { documentId });
}

export async function updateDocumentOriginalName(db: DB, documentId: number, fileOriginalName: string): Promise<void> {
    await db.query(`
        UPDATE verify_member_documents
        SET file_original_name = :fileOriginalName
        WHERE document_id = :documentId
    `, { documentId, fileOriginalName });
}

// ── Team Status ──

export async function updateTeamStatus(db: DB, teamId: number, status: string): Promise<void> {
    await db.query(`
        UPDATE team_teams SET status = :status, updated_at = NOW() WHERE team_id = :teamId
    `, { teamId, status });
}

export async function disbandTeam(db: DB, teamId: number, userId: number, reason: string): Promise<void> {
    await db.query(`
        UPDATE team_teams
        SET status = 'disbanded', disbanded_at = NOW(), disbanded_by_user_id = :userId, disband_reason = :reason, updated_at = NOW()
        WHERE team_id = :teamId
    `, { teamId, userId, reason });

    await db.query(`
        UPDATE team_members
        SET member_status = 'removed', left_at = NOW()
        WHERE team_id = :teamId AND member_status = 'active'
    `, { teamId });

    await db.query(`
        UPDATE verify_review_rounds
        SET status = 'cancelled', note = :reason
        WHERE team_id = :teamId AND status NOT IN ('completed', 'cancelled')
    `, { teamId, reason });
}

// ── Audit Logs ──

export async function createVerifyAuditLog(db: DB, data: {
    verifyRoundId: number | null;
    teamId: number | null;
    actorUserId: number;
    targetUserId?: number | null;
    actionCode: string;
    actionDetail?: string | null;
}): Promise<void> {
    await db.query(`
        INSERT INTO verify_audit_logs (verify_round_id, team_id, actor_user_id, target_user_id, action_code, action_detail, created_at)
        VALUES (:verifyRoundId, :teamId, :actorUserId, :targetUserId, :actionCode, :actionDetail, NOW())
    `, {
        verifyRoundId: data.verifyRoundId,
        teamId: data.teamId,
        actorUserId: data.actorUserId,
        targetUserId: data.targetUserId ?? null,
        actionCode: data.actionCode,
        actionDetail: data.actionDetail ?? null,
    });
}
