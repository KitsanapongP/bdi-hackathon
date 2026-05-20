import type { DB } from '../../config/db.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
    SubmissionFileRow,
    SubmissionTaskRow,
    SubmissionTrack,
    TeamAdvisorRow,
    TeamSubmissionTaskRow,
    TeamSubmissionTaskWithMetaRow,
} from './submissions.types.js';

// -- Submission Tasks --

export async function getEnabledSubmissionTasks(db: DB): Promise<SubmissionTaskRow[]> {
    const [rows] = await db.query<SubmissionTaskRow[]>(
        `SELECT *
         FROM submission_tasks
         WHERE deleted_at IS NULL
           AND is_enabled = 1
         ORDER BY sort_order ASC, submission_task_id ASC`
    );
    return rows;
}

export async function getSubmissionTaskById(db: DB, submissionTaskId: number): Promise<SubmissionTaskRow | null> {
    const [rows] = await db.query<SubmissionTaskRow[]>(
        `SELECT *
         FROM submission_tasks
         WHERE submission_task_id = :submissionTaskId
           AND deleted_at IS NULL
         LIMIT 1`,
        { submissionTaskId }
    );
    return rows[0] ?? null;
}

export async function getTeamSubmissionTasks(db: DB, teamId: number): Promise<TeamSubmissionTaskWithMetaRow[]> {
    const [rows] = await db.query<TeamSubmissionTaskWithMetaRow[]>(
         `SELECT
             tst.*,
             st.task_name,
             st.description AS task_description,
             st.task_type,
             st.stage,
             st.is_required,
             st.is_default AS task_is_default,
             st.allowed_extensions,
             st.sort_order,
             st.deadline_at AS task_deadline_at,
             st.is_enabled AS task_is_enabled
         FROM team_submission_tasks tst
         JOIN submission_tasks st
           ON st.submission_task_id = tst.submission_task_id
         WHERE tst.team_id = :teamId
           AND tst.deleted_at IS NULL
           AND st.deleted_at IS NULL
           AND st.is_enabled = 1
         ORDER BY st.sort_order ASC, tst.team_submission_task_id ASC`,
        { teamId }
    );
    return rows;
}

export async function getTeamSubmissionTaskById(db: DB, teamSubmissionTaskId: number): Promise<TeamSubmissionTaskWithMetaRow | null> {
    const [rows] = await db.query<TeamSubmissionTaskWithMetaRow[]>(
         `SELECT
             tst.*,
             st.task_name,
             st.description AS task_description,
             st.task_type,
             st.stage,
             st.is_required,
             st.is_default AS task_is_default,
             st.allowed_extensions,
             st.sort_order,
             st.deadline_at AS task_deadline_at,
             st.is_enabled AS task_is_enabled
         FROM team_submission_tasks tst
         JOIN submission_tasks st
           ON st.submission_task_id = tst.submission_task_id
         WHERE tst.team_submission_task_id = :teamSubmissionTaskId
           AND tst.deleted_at IS NULL
           AND st.deleted_at IS NULL
         LIMIT 1`,
        { teamSubmissionTaskId }
    );
    return rows[0] ?? null;
}

export async function updateTeamTaskLink(db: DB, teamSubmissionTaskId: number, linkUrl: string | null): Promise<void> {
    await db.query(
        `UPDATE team_submission_tasks
         SET link_url = :linkUrl,
             updated_at = NOW()
         WHERE team_submission_task_id = :teamSubmissionTaskId
           AND deleted_at IS NULL`,
        { teamSubmissionTaskId, linkUrl }
    );
}

export async function updateTeamTaskTrack(
    db: DB,
    teamSubmissionTaskId: number,
    submissionTrack: SubmissionTrack | null,
): Promise<void> {
    await db.query(
        `UPDATE team_submission_tasks
         SET submission_track = :submissionTrack,
             updated_at = NOW()
         WHERE team_submission_task_id = :teamSubmissionTaskId
           AND deleted_at IS NULL`,
        { teamSubmissionTaskId, submissionTrack }
    );
}

export async function assignTaskToTeam(
    db: DB,
    data: {
        teamId: number;
        submissionTaskId: number;
        assignedByUserId: number | null;
        assignedSource: 'default' | 'admin_team' | 'admin_status' | 'system_backfill';
    }
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO team_submission_tasks
            (team_id, submission_task_id, assigned_by_user_id, assigned_source)
         VALUES (:teamId, :submissionTaskId, :assignedByUserId, :assignedSource)
         ON DUPLICATE KEY UPDATE
            deleted_at = NULL,
            updated_at = NOW(),
            assigned_by_user_id = VALUES(assigned_by_user_id),
            assigned_source = VALUES(assigned_source)`,
        data
    );
    return result.insertId;
}

export async function getTeamTaskByTeamAndTask(db: DB, teamId: number, submissionTaskId: number): Promise<TeamSubmissionTaskRow | null> {
    const [rows] = await db.query<TeamSubmissionTaskRow[]>(
        `SELECT *
         FROM team_submission_tasks
         WHERE team_id = :teamId
           AND submission_task_id = :submissionTaskId
           AND deleted_at IS NULL
         LIMIT 1`,
        { teamId, submissionTaskId }
    );
    return rows[0] ?? null;
}

export async function assignDefaultTasksToTeam(db: DB, teamId: number): Promise<void> {
    await db.query(
        `INSERT INTO team_submission_tasks
            (team_id, submission_task_id, assigned_by_user_id, assigned_source)
         SELECT
            :teamId,
            st.submission_task_id,
            NULL,
            'default'
         FROM submission_tasks st
         WHERE st.deleted_at IS NULL
           AND st.is_enabled = 1
           AND st.is_default = 1
         ON DUPLICATE KEY UPDATE
            deleted_at = NULL,
            updated_at = NOW()`,
        { teamId }
    );
}

// -- Submission Files --

export async function insertSubmissionFile(db: DB, data: {
    teamId: number;
    teamSubmissionTaskId: number;
    fileStorageKey: string;
    fileOriginalName: string;
    fileMimeType: string;
    fileSizeBytes: number;
    uploadedByUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO team_submission_files
            (team_id, team_submission_task_id, file_storage_key, file_original_name, file_mime_type, file_size_bytes, uploaded_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            data.teamId,
            data.teamSubmissionTaskId,
            data.fileStorageKey,
            data.fileOriginalName,
            data.fileMimeType,
            data.fileSizeBytes,
            data.uploadedByUserId,
        ]
    );
    return result.insertId;
}

export async function getSubmissionFilesByTeamTask(db: DB, teamSubmissionTaskId: number): Promise<SubmissionFileRow[]> {
    const [rows] = await db.query<SubmissionFileRow[]>(
        `SELECT *
         FROM team_submission_files
         WHERE team_submission_task_id = :teamSubmissionTaskId
           AND deleted_at IS NULL
         ORDER BY uploaded_at DESC`,
        { teamSubmissionTaskId }
    );
    return rows;
}

export async function getSubmissionFileById(db: DB, fileId: number): Promise<SubmissionFileRow | null> {
    const [rows] = await db.query<SubmissionFileRow[]>(
        `SELECT *
         FROM team_submission_files
         WHERE file_id = :fileId
           AND deleted_at IS NULL
         LIMIT 1`,
        { fileId }
    );
    return rows[0] ?? null;
}

export async function softDeleteSubmissionFile(db: DB, fileId: number): Promise<void> {
    await db.query(
        `UPDATE team_submission_files
         SET deleted_at = NOW()
         WHERE file_id = :fileId`,
        { fileId }
    );
}

// -- Advisors --

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
    addedByUserId: number;
}): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO team_advisors
            (team_id, prefix, first_name_th, last_name_th, first_name_en, last_name_en,
             email, phone, institution_name_th, added_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.teamId, data.prefix, data.firstNameTh, data.lastNameTh,
            data.firstNameEn, data.lastNameEn, data.email, data.phone,
            data.institutionNameTh, data.addedByUserId,
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

export async function countAdvisors(db: DB, teamId: number): Promise<number> {
    const [rows] = await db.query<Array<RowDataPacket & { advisor_count: number | string }>>(
        'SELECT COUNT(*) AS advisor_count FROM team_advisors WHERE team_id = ?',
        [teamId]
    );
    return Number(rows[0]?.advisor_count ?? 0);
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
}): Promise<void> {
    await db.query(
        `UPDATE team_advisors SET
            prefix = ?, first_name_th = ?, last_name_th = ?,
            first_name_en = ?, last_name_en = ?,
            email = ?, phone = ?, institution_name_th = ?
         WHERE advisor_id = ?`,
        [
            data.prefix, data.firstNameTh, data.lastNameTh,
            data.firstNameEn, data.lastNameEn,
            data.email, data.phone, data.institutionNameTh,
            advisorId,
        ]
    );
}

export async function deleteAdvisor(db: DB, advisorId: number): Promise<void> {
    await db.query('DELETE FROM team_advisors WHERE advisor_id = ?', [advisorId]);
}

// -- Team helpers --

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

export async function listTeamIdsByStatuses(
    db: DB,
    statuses: Array<'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded'>,
): Promise<number[]> {
    if (statuses.length === 0) return [];
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT team_id
         FROM team_teams
         WHERE status IN (?)
           AND deleted_at IS NULL`,
        [statuses]
    );
    return rows.map((row) => Number(row.team_id)).filter((id) => Number.isFinite(id));
}
