import type { DB } from '../../config/db.js';
import type { SysConfigRow, SysConfigSafe } from './sys-config.types.js';
import { NotFoundError } from '../../shared/errors.js';
import * as repo from './sys-config.repo.js';

/** Convert a DB row to a safe API object */
function toSafe(row: SysConfigRow): SysConfigSafe {
    return {
        configKey: row.config_key,
        configValue: row.config_value,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        updatedAt: row.updated_at,
    };
}

/** Get all system configs */
export async function getAllConfigs(db: DB): Promise<SysConfigSafe[]> {
    const rows = await repo.findAll(db);
    return rows.map(toSafe);
}

/** Get a single config by key */
export async function getConfigByKey(db: DB, key: string): Promise<SysConfigSafe> {
    const row = await repo.findByKey(db, key);
    if (!row) {
        throw new NotFoundError(`ไม่พบ config key: ${key}`);
    }
    return toSafe(row);
}

/** Update a config value (upsert) and return the updated row */
export async function updateConfig(db: DB, key: string, value: string): Promise<SysConfigSafe> {
    await repo.upsert(db, key, value);
    const row = await repo.findByKey(db, key);
    if (!row) {
        throw new NotFoundError(`ไม่พบ config key: ${key}`);
    }
    return toSafe(row);
}
