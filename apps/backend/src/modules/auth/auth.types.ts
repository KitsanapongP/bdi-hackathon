/** Types matching DB schema from 001_init.sql.sql */

/** Row from `user_users` table */
export interface UserRow {
    user_id: number;
    user_name: string;
    email: string | null;
    phone: string | null;
    institution_name_th: string | null;
    institution_name_en: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
    birth_date: string | null;
    education_level: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | null;
    home_province: string | null;
    is_active: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

/** Row from `user_credentials_local` table */
export interface CredentialRow {
    cred_id: number;
    user_id: number;
    login_email: string;
    password_hash: string;
    password_updated_at: Date | null;
    is_enabled: number;
    created_at: Date;
    updated_at: Date;
}

/** Input for POST /api/auth/register */
export interface RegisterInput {
    email: string;
    password: string;
    userName: string;
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string;
    lastNameEn: string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    birthDate: string;
    educationLevel: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate';
    institutionNameTh: string;
    institutionNameEn: string;
    homeProvince: string;
}

/** Input for POST /api/auth/login */
export interface LoginInput {
    email: string;
    password: string;
}

/** JWT payload stored in token */
export interface JwtPayload {
    userId: number;
    email: string;
    userName: string;
    accessRole: 'admin' | 'judge' | null;
}

/** Safe user object returned in API responses (no password_hash) */
export interface UserSafe {
    userId: number;
    userName: string;
    email: string | null;
    firstNameTh: string | null;
    lastNameTh: string | null;
    firstNameEn: string | null;
    lastNameEn: string | null;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
    birthDate: string | null;
    educationLevel: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | null;
    institutionNameTh: string | null;
    institutionNameEn: string | null;
    homeProvince: string | null;
    isActive: boolean;
    accessRole: 'admin' | 'judge' | null;
    hasTeam?: boolean;
    teamId?: number;
    teamCode?: string;
    teamRole?: string;
}
