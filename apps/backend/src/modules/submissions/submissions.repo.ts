import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { SubmissionFileRow, TeamAdvisorRow } from './submissions.types.js';

// ── Video Link ──

export async function getVideoLink(db: DB, teamId: number): Promise<string | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        'SELECT video_link FROM team_teams WHERE team_id = ? AND deleted_at IS NULL',
        [teamId]
    );
    return rows[0]?.video_link ?? null;
}

export async function updateVideoLink(db: DB, teamId: number, videoLink: string | null): Promise<void> {
    await db.query(
        'UPDATE team_teams SET video_link = ? WHERE team_id = ? AND deleted_at IS NULL',
        [videoLink, teamId]
    );
}

// ── Submission Files ──

export async function insertSubmissionFile(db: DB, data: {
    teamId: number;
    fileStorageKey: string;
    fileOriginalName: string;
    fileMimeType: string;
    fileSizeBytes: number;
    uploadedByUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO team_submission_files
            (team_id, file_storage_key, file_original_name, file_mime_type, file_size_bytes, uploaded_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.teamId, data.fileStorageKey, data.fileOriginalName, data.fileMimeType, data.fileSizeBytes, data.uploadedByUserId]
    );
    return result.insertId;
}

export async function getSubmissionFiles(db: DB, teamId: number): Promise<SubmissionFileRow[]> {
    const [rows] = await db.query<SubmissionFileRow[]>(
        'SELECT * FROM team_submission_files WHERE team_id = ? AND deleted_at IS NULL ORDER BY uploaded_at DESC',
        [teamId]
    );
    return rows;
}

export async function getSubmissionFileById(db: DB, fileId: number): Promise<SubmissionFileRow | null> {
    const [rows] = await db.query<SubmissionFileRow[]>(
        'SELECT * FROM team_submission_files WHERE file_id = ? AND deleted_at IS NULL',
        [fileId]
    );
    return rows[0] ?? null;
}

export async function softDeleteSubmissionFile(db: DB, fileId: number): Promise<void> {
    await db.query(
        'UPDATE team_submission_files SET deleted_at = NOW() WHERE file_id = ?',
        [fileId]
    );
}

// ── Advisors ──

export async function insertAdvisor(db: DB, data: {
    teamId: number;
    prefix: string | null;
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string | null;
    lastNameEn: string | null;
    email: string | null;
    phone: string | null;
    institutionNameTh: string | null;
    position: string | null;
    addedByUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO team_advisors
            (team_id, prefix, first_name_th, last_name_th, first_name_en, last_name_en,
             email, phone, institution_name_th, position, added_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.teamId, data.prefix, data.firstNameTh, data.lastNameTh,
            data.firstNameEn, data.lastNameEn, data.email, data.phone,
            data.institutionNameTh, data.position, data.addedByUserId,
        ]
    );
    return result.insertId;
}

export async function getAdvisors(db: DB, teamId: number): Promise<TeamAdvisorRow[]> {
    const [rows] = await db.query<TeamAdvisorRow[]>(
        'SELECT * FROM team_advisors WHERE team_id = ? ORDER BY created_at ASC',
        [teamId]
    );
    return rows;
}

export async function getAdvisorById(db: DB, advisorId: number): Promise<TeamAdvisorRow | null> {
    const [rows] = await db.query<TeamAdvisorRow[]>(
        'SELECT * FROM team_advisors WHERE advisor_id = ?',
        [advisorId]
    );
    return rows[0] ?? null;
}

export async function findAdvisorByEmail(db: DB, email: string, excludeAdvisorId?: number): Promise<TeamAdvisorRow | null> {
    let sql = 'SELECT * FROM team_advisors WHERE email = ?';
    const params: any[] = [email];
    if (excludeAdvisorId) {
        sql += ' AND advisor_id != ?';
        params.push(excludeAdvisorId);
    }
    const [rows] = await db.query<TeamAdvisorRow[]>(sql, params);
    return rows[0] ?? null;
}

export async function updateAdvisor(db: DB, advisorId: number, data: {
    prefix: string | null;
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string | null;
    lastNameEn: string | null;
    email: string | null;
    phone: string | null;
    institutionNameTh: string | null;
    position: string | null;
}): Promise<void> {
    await db.query(
        `UPDATE team_advisors SET
            prefix = ?, first_name_th = ?, last_name_th = ?,
            first_name_en = ?, last_name_en = ?,
            email = ?, phone = ?, institution_name_th = ?, position = ?
         WHERE advisor_id = ?`,
        [
            data.prefix, data.firstNameTh, data.lastNameTh,
            data.firstNameEn, data.lastNameEn,
            data.email, data.phone, data.institutionNameTh, data.position,
            advisorId,
        ]
    );
}

export async function deleteAdvisor(db: DB, advisorId: number): Promise<void> {
    await db.query('DELETE FROM team_advisors WHERE advisor_id = ?', [advisorId]);
}

// ── Team helpers ──

export async function getTeamById(db: DB, teamId: number): Promise<RowDataPacket | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM team_teams WHERE team_id = ? AND deleted_at IS NULL',
        [teamId]
    );
    return rows[0] ?? null;
}

export async function getTeamMember(db: DB, teamId: number, userId: number): Promise<RowDataPacket | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND member_status = 'active'`,
        [teamId, userId]
    );
    return rows[0] ?? null;
}
