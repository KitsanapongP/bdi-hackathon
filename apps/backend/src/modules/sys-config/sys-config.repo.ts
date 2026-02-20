import type { DB } from '../../config/db.js';
import type { SysConfigRow } from './sys-config.types.js';
import type { RowDataPacket } from 'mysql2/promise';

/** Get all system configs */
export async function findAll(db: DB): Promise<SysConfigRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT config_key, config_value, description_th, description_en, updated_at
         FROM sys_configs
         ORDER BY config_key`,
    );
    return rows as SysConfigRow[];
}

/** Get a single config by key */
export async function findByKey(db: DB, configKey: string): Promise<SysConfigRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT config_key, config_value, description_th, description_en, updated_at
         FROM sys_configs
         WHERE config_key = :configKey
         LIMIT 1`,
        { configKey },
    );
    return (rows[0] as SysConfigRow | undefined) ?? null;
}

/** Upsert a config value (insert or update if key exists) */
export async function upsert(db: DB, configKey: string, configValue: string): Promise<void> {
    await db.query(
        `INSERT INTO sys_configs (config_key, config_value, updated_at)
         VALUES (:configKey, :configValue, NOW())
         ON DUPLICATE KEY UPDATE config_value = :configValue, updated_at = NOW()`,
        { configKey, configValue },
    );
}
