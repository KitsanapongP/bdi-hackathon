/** Types matching DB schema for sys_configs table */

/** Row from `sys_configs` table */
export interface SysConfigRow {
    config_key: string;
    config_value: string;
    description_th: string | null;
    description_en: string | null;
    updated_at: Date;
}

/** Safe config object returned in API responses (camelCase) */
export interface SysConfigSafe {
    configKey: string;
    configValue: string;
    descriptionTh: string | null;
    descriptionEn: string | null;
    updatedAt: Date;
}
