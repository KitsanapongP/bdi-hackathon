import type { DB } from '../../config/db.js';
import * as repo from './admin.repo.js';
import type { AllowlistInput, UpdateAllowlistInput } from './admin.schema.js';
import type { AllowlistResponse } from './admin.types.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';

function toAllowlistResponse(row: any): AllowlistResponse {
    return {
        allowId: row.allow_id,
        userId: row.user_id,
        accessRole: row.access_role,
        isActive: row.is_active === 1,
        note: row.note,
        grantedAt: row.granted_at.toISOString(),
        grantedByUserId: row.granted_by_user_id,
    };
}

export async function getAllowlist(db: DB): Promise<AllowlistResponse[]> {
    const rows = await repo.getAllAllowlist(db);
    return rows.map(toAllowlistResponse);
}

export async function createAllowlistEntry(
    db: DB,
    input: AllowlistInput,
    grantedByUserId: number
): Promise<AllowlistResponse> {
    const exists = await repo.userExistsInAllowlist(db, input.userId);
    if (exists) {
        throw new ConflictError('ผู้ใช้นี้มีสิทธิ์ในระบบอยู่แล้ว (กรุณาแก้ไขข้อมูลเดิมแทนการสร้างใหม่)');
    }

    const allowId = await repo.createAllowlist(db, input, grantedByUserId);
    const row = await repo.getAllowlistById(db, allowId);
    return toAllowlistResponse(row!);
}

export async function updateAllowlistEntry(
    db: DB,
    allowId: number,
    input: UpdateAllowlistInput
): Promise<AllowlistResponse> {
    const existing = await repo.getAllowlistById(db, allowId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลสิทธิ์นี้ในระบบ');
    }

    await repo.updateAllowlist(db, allowId, input);

    const updated = await repo.getAllowlistById(db, allowId);
    return toAllowlistResponse(updated!);
}
