/** Types matching DB schema from 001_init.sql.sql */

/** Row from `user_users` table */
export interface UserRow {
    user_id: number;
    user_name: string;
    email: string | null;
    phone: string | null;
    university_name_th: string | null;
    university_name_en: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
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
    isActive: boolean;
    accessRole: 'admin' | 'judge' | null;
}
