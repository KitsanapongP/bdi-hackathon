import type { DB } from '../../config/db.js';
import type {
    AllowlistRow,
    DashboardDuplicateMemberRow,
    DashboardGenderCountRow,
    DashboardProvinceCountRow,
    DashboardStatusCountRow,
    DashboardTeamMemberCountRow,
    DashboardTeamStatus,
    DashboardTrendRow,
    ExportSubmittedTeamRow,
    ExportTeamAdvisorRow,
    ExportTeamMemberRow,
} from './admin.types.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { AllowlistInput, UpdateAllowlistInput } from './admin.schema.js';

export async function getAllAllowlist(db: DB): Promise<AllowlistRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM access_allowlist ORDER BY allow_id DESC`
    );
    return rows as AllowlistRow[];
}

export async function getAllowlistById(db: DB, allowId: number): Promise<AllowlistRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM access_allowlist WHERE allow_id = :allowId LIMIT 1`,
        { allowId }
    );
    return (rows[0] as AllowlistRow | undefined) ?? null;
}

export async function userExistsInAllowlist(db: DB, userId: number): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM access_allowlist WHERE user_id = :userId LIMIT 1`,
        { userId }
    );
    return rows.length > 0;
}

export async function createAllowlist(
    db: DB,
    data: AllowlistInput,
    grantedByUserId: number
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO access_allowlist (user_id, access_role, is_active, note, granted_at, granted_by_user_id)
         VALUES (:userId, :accessRole, 1, :note, NOW(), :grantedByUserId)`,
        {
            userId: data.userId,
            accessRole: data.accessRole,
            note: data.note ?? null,
            grantedByUserId,
        }
    );
    return result.insertId;
}

export async function updateAllowlist(
    db: DB,
    allowId: number,
    data: UpdateAllowlistInput
): Promise<void> {
    const updates: string[] = [];
    const params: Record<string, any> = { allowId };

    if (data.accessRole !== undefined) {
        updates.push('access_role = :accessRole');
        params['accessRole'] = data.accessRole;
    }
    if (data.isActive !== undefined) {
        updates.push('is_active = :isActive');
        params['isActive'] = data.isActive ? 1 : 0;
    }
    if (data.note !== undefined) {
        updates.push('note = :note');
        params['note'] = data.note;
    }

    if (updates.length === 0) return;

    await db.query(`UPDATE access_allowlist SET ${updates.join(', ')} WHERE allow_id = :allowId`, params);
}

function buildStatusFilter(statuses: DashboardTeamStatus[]) {
    const safe = Array.from(new Set(statuses));
    const params: Record<string, string> = {};
    const tokens: string[] = [];

    safe.forEach((status, index) => {
        const key = `status${index}`;
        params[key] = status;
        tokens.push(`:${key}`);
    });

    return {
        inClause: tokens.join(', '),
        params,
    };
}

export async function getDashboardTotalTeams(db: DB): Promise<number> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM team_teams WHERE deleted_at IS NULL`
    );
    return Number(rows[0]?.total ?? 0);
}

export async function getDashboardStatusCounts(
    db: DB,
    statuses: DashboardTeamStatus[]
): Promise<DashboardStatusCountRow[]> {
    const { inClause, params } = buildStatusFilter(statuses);
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT status, COUNT(*) AS count
         FROM team_teams
         WHERE deleted_at IS NULL
           AND status IN (${inClause})
         GROUP BY status`,
        params
    );
    return rows as DashboardStatusCountRow[];
}

export async function getDashboardSubmittedOrApprovedCount(db: DB): Promise<number> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total
         FROM team_teams
         WHERE deleted_at IS NULL
           AND status IN ('submitted', 'approved')`
    );
    return Number(rows[0]?.total ?? 0);
}

export async function getDashboardTeamMemberCounts(
    db: DB,
    statuses: DashboardTeamStatus[]
): Promise<DashboardTeamMemberCountRow[]> {
    const { inClause, params } = buildStatusFilter(statuses);
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT
            t.team_id,
            t.team_code,
            COALESCE(NULLIF(t.team_name_th, ''), t.team_name_en) AS team_name,
            t.status,
            COUNT(m.team_member_id) AS member_count
         FROM team_teams t
         LEFT JOIN team_members m
           ON m.team_id = t.team_id
          AND m.member_status = 'active'
         WHERE t.deleted_at IS NULL
           AND t.status IN (${inClause})
         GROUP BY t.team_id, t.team_code, team_name, t.status
         ORDER BY t.team_id ASC`,
        params
    );
    return rows as DashboardTeamMemberCountRow[];
}

export async function getDashboardGenderCounts(
    db: DB,
    statuses: DashboardTeamStatus[]
): Promise<DashboardGenderCountRow[]> {
    const { inClause, params } = buildStatusFilter(statuses);
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT u.gender, COUNT(DISTINCT u.user_id) AS count
         FROM team_teams t
         JOIN team_members m
           ON m.team_id = t.team_id
          AND m.member_status = 'active'
         JOIN user_users u
           ON u.user_id = m.user_id
          AND u.is_active = 1
          AND u.deleted_at IS NULL
         WHERE t.deleted_at IS NULL
           AND t.status IN (${inClause})
         GROUP BY u.gender`,
        params
    );
    return rows as DashboardGenderCountRow[];
}

export async function getDashboardProvinceCounts(
    db: DB,
    statuses: DashboardTeamStatus[]
): Promise<DashboardProvinceCountRow[]> {
    const { inClause, params } = buildStatusFilter(statuses);
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT u.home_province AS province, COUNT(DISTINCT u.user_id) AS count
         FROM team_teams t
         JOIN team_members m
           ON m.team_id = t.team_id
          AND m.member_status = 'active'
         JOIN user_users u
           ON u.user_id = m.user_id
          AND u.is_active = 1
          AND u.deleted_at IS NULL
         WHERE t.deleted_at IS NULL
           AND t.status IN (${inClause})
         GROUP BY u.home_province
         ORDER BY count DESC`,
        params
    );
    return rows as DashboardProvinceCountRow[];
}

export async function getDashboardTrend(
    db: DB,
    days: number
): Promise<DashboardTrendRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT
            DATE(d.day_date) AS date_label,
            COALESCE(SUM(CASE WHEN e.event_status = 'submitted' THEN 1 ELSE 0 END), 0) AS submitted,
            COALESCE(SUM(CASE WHEN e.event_status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
            COALESCE(SUM(CASE WHEN e.event_status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
         FROM (
            SELECT DATE(NOW()) - INTERVAL seq.day DAY AS day_date
            FROM (
                SELECT 0 AS day UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
                UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
                UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
                UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
                UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
                UNION ALL SELECT 30 UNION ALL SELECT 31 UNION ALL SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34
                UNION ALL SELECT 35 UNION ALL SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39
                UNION ALL SELECT 40 UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43 UNION ALL SELECT 44
                UNION ALL SELECT 45 UNION ALL SELECT 46 UNION ALL SELECT 47 UNION ALL SELECT 48 UNION ALL SELECT 49
                UNION ALL SELECT 50 UNION ALL SELECT 51 UNION ALL SELECT 52 UNION ALL SELECT 53 UNION ALL SELECT 54
                UNION ALL SELECT 55 UNION ALL SELECT 56 UNION ALL SELECT 57 UNION ALL SELECT 58 UNION ALL SELECT 59
                UNION ALL SELECT 60 UNION ALL SELECT 61 UNION ALL SELECT 62 UNION ALL SELECT 63 UNION ALL SELECT 64
                UNION ALL SELECT 65 UNION ALL SELECT 66 UNION ALL SELECT 67 UNION ALL SELECT 68 UNION ALL SELECT 69
                UNION ALL SELECT 70 UNION ALL SELECT 71 UNION ALL SELECT 72 UNION ALL SELECT 73 UNION ALL SELECT 74
                UNION ALL SELECT 75 UNION ALL SELECT 76 UNION ALL SELECT 77 UNION ALL SELECT 78 UNION ALL SELECT 79
                UNION ALL SELECT 80 UNION ALL SELECT 81 UNION ALL SELECT 82 UNION ALL SELECT 83 UNION ALL SELECT 84
                UNION ALL SELECT 85 UNION ALL SELECT 86 UNION ALL SELECT 87 UNION ALL SELECT 88 UNION ALL SELECT 89
                UNION ALL SELECT 90 UNION ALL SELECT 91 UNION ALL SELECT 92 UNION ALL SELECT 93 UNION ALL SELECT 94
                UNION ALL SELECT 95 UNION ALL SELECT 96 UNION ALL SELECT 97 UNION ALL SELECT 98 UNION ALL SELECT 99
                UNION ALL SELECT 100 UNION ALL SELECT 101 UNION ALL SELECT 102 UNION ALL SELECT 103 UNION ALL SELECT 104
                UNION ALL SELECT 105 UNION ALL SELECT 106 UNION ALL SELECT 107 UNION ALL SELECT 108 UNION ALL SELECT 109
                UNION ALL SELECT 110 UNION ALL SELECT 111 UNION ALL SELECT 112 UNION ALL SELECT 113 UNION ALL SELECT 114
                UNION ALL SELECT 115 UNION ALL SELECT 116 UNION ALL SELECT 117 UNION ALL SELECT 118 UNION ALL SELECT 119
                UNION ALL SELECT 120 UNION ALL SELECT 121 UNION ALL SELECT 122 UNION ALL SELECT 123 UNION ALL SELECT 124
                UNION ALL SELECT 125 UNION ALL SELECT 126 UNION ALL SELECT 127 UNION ALL SELECT 128 UNION ALL SELECT 129
                UNION ALL SELECT 130 UNION ALL SELECT 131 UNION ALL SELECT 132 UNION ALL SELECT 133 UNION ALL SELECT 134
                UNION ALL SELECT 135 UNION ALL SELECT 136 UNION ALL SELECT 137 UNION ALL SELECT 138 UNION ALL SELECT 139
                UNION ALL SELECT 140 UNION ALL SELECT 141 UNION ALL SELECT 142 UNION ALL SELECT 143 UNION ALL SELECT 144
                UNION ALL SELECT 145 UNION ALL SELECT 146 UNION ALL SELECT 147 UNION ALL SELECT 148 UNION ALL SELECT 149
                UNION ALL SELECT 150 UNION ALL SELECT 151 UNION ALL SELECT 152 UNION ALL SELECT 153 UNION ALL SELECT 154
                UNION ALL SELECT 155 UNION ALL SELECT 156 UNION ALL SELECT 157 UNION ALL SELECT 158 UNION ALL SELECT 159
                UNION ALL SELECT 160 UNION ALL SELECT 161 UNION ALL SELECT 162 UNION ALL SELECT 163 UNION ALL SELECT 164
                UNION ALL SELECT 165 UNION ALL SELECT 166 UNION ALL SELECT 167 UNION ALL SELECT 168 UNION ALL SELECT 169
                UNION ALL SELECT 170 UNION ALL SELECT 171 UNION ALL SELECT 172 UNION ALL SELECT 173 UNION ALL SELECT 174
                UNION ALL SELECT 175 UNION ALL SELECT 176 UNION ALL SELECT 177 UNION ALL SELECT 178 UNION ALL SELECT 179
            ) AS seq
            WHERE seq.day < :days
         ) d
         LEFT JOIN (
            SELECT DATE(v.submitted_at) AS event_date, 'submitted' AS event_status
            FROM verify_review_rounds v
            JOIN team_teams t1 ON t1.team_id = v.team_id AND t1.deleted_at IS NULL
            WHERE v.submitted_at IS NOT NULL

            UNION ALL

            SELECT DATE(t2.approved_at) AS event_date, 'approved' AS event_status
            FROM team_teams t2
            WHERE t2.deleted_at IS NULL
              AND t2.approved_at IS NOT NULL

            UNION ALL

            SELECT DATE(t3.rejected_at) AS event_date, 'rejected' AS event_status
            FROM team_teams t3
            WHERE t3.deleted_at IS NULL
              AND t3.rejected_at IS NOT NULL
         ) e
           ON e.event_date = d.day_date
         GROUP BY DATE(d.day_date)
         ORDER BY DATE(d.day_date) ASC`,
        { days }
    );
    return rows as DashboardTrendRow[];
}

export async function getDashboardDuplicateMembers(
    db: DB,
    statuses: DashboardTeamStatus[]
): Promise<DashboardDuplicateMemberRow[]> {
    const { inClause, params } = buildStatusFilter(statuses);
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT
            t.team_id,
            t.team_code,
            COALESCE(NULLIF(t.team_name_th, ''), t.team_name_en) AS team_name,
            t.status,
            u.user_id,
            u.user_name,
            u.first_name_th,
            u.last_name_th,
            u.first_name_en,
            u.last_name_en
         FROM team_teams t
         JOIN team_members m
           ON m.team_id = t.team_id
          AND m.member_status = 'active'
         JOIN user_users u
           ON u.user_id = m.user_id
          AND u.is_active = 1
          AND u.deleted_at IS NULL
         WHERE t.deleted_at IS NULL
           AND t.status IN (${inClause})`,
        params
    );
    return rows as DashboardDuplicateMemberRow[];
}

export async function getSubmittedTeamsForExport(db: DB): Promise<ExportSubmittedTeamRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT
            t.team_id,
            t.team_code,
            t.team_name_th,
            t.team_name_en,
            t.status,
            t.visibility,
            t.current_leader_user_id,
            t.video_link,
            t.approved_at,
            t.selected_at,
            t.rejected_at,
            t.created_at,
            t.updated_at
        FROM team_teams t
        WHERE t.deleted_at IS NULL
          AND t.status = 'submitted'
        ORDER BY t.team_id ASC
    `);
    return rows as ExportSubmittedTeamRow[];
}

export async function getTeamAdvisorsForExport(db: DB, teamIds: number[]): Promise<ExportTeamAdvisorRow[]> {
    if (teamIds.length === 0) return [];

    const params: Record<string, number> = {};
    const tokens = teamIds.map((teamId, idx) => {
        const key = `teamId${idx}`;
        params[key] = teamId;
        return `:${key}`;
    });

    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT
            a.team_id,
            a.prefix,
            a.first_name_th,
            a.last_name_th,
            a.first_name_en,
            a.last_name_en,
            a.email,
            a.phone,
            a.institution_name_th,
            a.position
        FROM team_advisors a
        WHERE a.team_id IN (${tokens.join(', ')})
        ORDER BY a.team_id ASC, a.created_at ASC
    `, params);

    return rows as ExportTeamAdvisorRow[];
}

export async function getTeamMembersForExport(db: DB, teamIds: number[]): Promise<ExportTeamMemberRow[]> {
    if (teamIds.length === 0) return [];

    const params: Record<string, number> = {};
    const tokens = teamIds.map((teamId, idx) => {
        const key = `teamId${idx}`;
        params[key] = teamId;
        return `:${key}`;
    });

    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT
            t.team_id,
            t.team_code,
            t.team_name_th,
            t.team_name_en,
            t.status AS team_status,
            m.user_id,
            u.user_name,
            m.role,
            m.member_status,
            m.joined_at,
            m.left_at,
            u.first_name_th,
            u.last_name_th,
            u.first_name_en,
            u.last_name_en,
            u.email,
            u.phone,
            u.institution_name_th,
            u.institution_name_en,
            u.gender,
            u.birth_date,
            u.education_level,
            u.home_province,
            vr.verify_round_id,
            vp.is_profile_complete,
            vp.is_member_confirmed,
            vp.member_confirmed_at,
            vp.member_unconfirmed_at,
            vp.completed_at AS profile_completed_at,
            vp.updated_at AS profile_updated_at
        FROM team_teams t
        JOIN team_members m
          ON m.team_id = t.team_id
         AND m.member_status = 'active'
        JOIN user_users u
          ON u.user_id = m.user_id
        LEFT JOIN (
            SELECT v1.team_id, v1.verify_round_id
            FROM verify_review_rounds v1
            INNER JOIN (
                SELECT team_id, MAX(round_no) AS max_round_no
                FROM verify_review_rounds
                GROUP BY team_id
            ) latest
                ON latest.team_id = v1.team_id
               AND latest.max_round_no = v1.round_no
        ) vr
          ON vr.team_id = t.team_id
        LEFT JOIN verify_member_profiles vp
          ON vp.team_id = t.team_id
         AND vp.user_id = m.user_id
         AND vp.verify_round_id = vr.verify_round_id
        WHERE t.team_id IN (${tokens.join(', ')})
        ORDER BY t.team_id ASC,
                 CASE WHEN m.role = 'leader' THEN 0 ELSE 1 END,
                 m.joined_at ASC
    `, params);

    return rows as ExportTeamMemberRow[];
}
