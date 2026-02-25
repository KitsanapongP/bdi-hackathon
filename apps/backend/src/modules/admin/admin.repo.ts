import type { DB } from '../../config/db.js';
import type { AllowlistRow } from './admin.types.js';
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
