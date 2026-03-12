import type { DB } from '../../config/db.js';
import type { UserRow, CredentialRow, PendingRegistrationRow, RegisterInput } from './auth.types.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

/** Find a user by email in user_credentials_local (join user_users) */
export async function findUserByEmail(db: DB, email: string): Promise<(UserRow & Pick<CredentialRow, 'password_hash' | 'cred_id'>) | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT u.*, c.password_hash, c.cred_id
     FROM user_users u
     INNER JOIN user_credentials_local c ON c.user_id = u.user_id
     WHERE c.login_email = :email
       AND c.is_enabled = 1
       AND u.is_active = 1
       AND u.deleted_at IS NULL
     LIMIT 1`,
        { email },
    );
    return (rows[0] as (UserRow & Pick<CredentialRow, 'password_hash' | 'cred_id'>) | undefined) ?? null;
}

/** Find a user by user_id */
export async function findUserById(db: DB, userId: number): Promise<UserRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_users
     WHERE user_id = :userId
       AND is_active = 1
       AND deleted_at IS NULL
     LIMIT 1`,
        { userId },
    );
    return (rows[0] as UserRow | undefined) ?? null;
}

/** Check if email already exists */
export async function emailExists(db: DB, email: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM user_credentials_local WHERE login_email = :email LIMIT 1`,
        { email },
    );
    return rows.length > 0;
}

/** Check if user_name already exists */
export async function userNameExists(db: DB, userName: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1 FROM user_users WHERE user_name = :userName AND deleted_at IS NULL LIMIT 1`,
        { userName },
    );
    return rows.length > 0;
}

/** Create a new user in user_users and return the inserted id */
export async function createUser(
    db: DB,
    data: {
        userName: string;
        email: string;
        phone: string;
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
    },
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO user_users (
        user_name, email, phone,
        first_name_th, last_name_th, first_name_en, last_name_en,
        gender, birth_date, education_level,
        institution_name_th, institution_name_en, home_province,
        is_active, created_at, updated_at
     )
     VALUES (
        :userName, :email, :phone,
        :firstNameTh, :lastNameTh, :firstNameEn, :lastNameEn,
        :gender, :birthDate, :educationLevel,
        :institutionNameTh, :institutionNameEn, :homeProvince,
        1, NOW(), NOW()
     )`,
        data,
    );
    return result.insertId;
}

/** Create local credentials for a user */
export async function createCredential(
    db: DB,
    data: { userId: number; email: string; passwordHash: string },
): Promise<void> {
    await db.query(
        `INSERT INTO user_credentials_local (user_id, login_email, password_hash, is_enabled, created_at, updated_at)
     VALUES (:userId, :email, :passwordHash, 1, NOW(), NOW())`,
        { userId: data.userId, email: data.email, passwordHash: data.passwordHash },
    );
}

/** Create an identity record */
export async function createIdentity(
    db: DB,
    data: { userId: number; email: string; identityType: string; domainRule: string; isVerified?: boolean },
): Promise<void> {
    await db.query(
        `INSERT INTO user_identities (user_id, identity_type, identifier, domain_rule, is_verified, verified_at, created_at, updated_at)
     VALUES (:userId, :identityType, :email, :domainRule, :isVerified, :verifiedAt, NOW(), NOW())`,
        {
            userId: data.userId,
            identityType: data.identityType,
            email: data.email,
            domainRule: data.domainRule,
            isVerified: data.isVerified ? 1 : 0,
            verifiedAt: data.isVerified ? new Date() : null,
        },
    );
}

export async function findPendingRegistrationByEmail(db: DB, email: string): Promise<PendingRegistrationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_registration_verifications WHERE email = :email LIMIT 1`,
        { email },
    );
    return (rows[0] as PendingRegistrationRow | undefined) ?? null;
}

export async function findActivePendingRegistrationByUserName(db: DB, userName: string): Promise<PendingRegistrationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM user_registration_verifications
         WHERE user_name = :userName
           AND consumed_at IS NULL
           AND expires_at > NOW()
         LIMIT 1`,
        { userName },
    );
    return (rows[0] as PendingRegistrationRow | undefined) ?? null;
}

export async function upsertPendingRegistration(
    db: DB,
    data: {
        email: string;
        userName: string;
        verificationCodeHash: string;
        payloadJson: string;
        expiresAt: Date;
    },
): Promise<void> {
    await db.query(
        `INSERT INTO user_registration_verifications (
            email, user_name, verification_code_hash, payload_json, expires_at,
            last_sent_at, attempt_count, consumed_at, created_at, updated_at
        )
        VALUES (
            :email, :userName, :verificationCodeHash, :payloadJson, :expiresAt,
            NOW(), 0, NULL, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            user_name = VALUES(user_name),
            verification_code_hash = VALUES(verification_code_hash),
            payload_json = VALUES(payload_json),
            expires_at = VALUES(expires_at),
            last_sent_at = NOW(),
            attempt_count = 0,
            consumed_at = NULL,
            updated_at = NOW()`,
        data,
    );
}

export async function refreshPendingRegistrationCode(
    db: DB,
    data: { email: string; verificationCodeHash: string; expiresAt: Date },
): Promise<void> {
    await db.query(
        `UPDATE user_registration_verifications
         SET verification_code_hash = :verificationCodeHash,
             expires_at = :expiresAt,
             last_sent_at = NOW(),
             attempt_count = 0,
             consumed_at = NULL,
             updated_at = NOW()
         WHERE email = :email`,
        data,
    );
}

export async function incrementPendingRegistrationAttempt(db: DB, registrationId: number): Promise<void> {
    await db.query(
        `UPDATE user_registration_verifications
         SET attempt_count = attempt_count + 1,
             updated_at = NOW()
         WHERE registration_id = :registrationId`,
        { registrationId },
    );
}

export async function consumePendingRegistration(db: DB, registrationId: number): Promise<void> {
    await db.query(
        `UPDATE user_registration_verifications
         SET consumed_at = NOW(),
             verification_code_hash = '',
             updated_at = NOW()
         WHERE registration_id = :registrationId`,
        { registrationId },
    );
}

export async function recordUserConsentFromSignup(
    db: DB,
    data: {
        userId: number;
        consentDocId: number;
        acceptSource: string;
        acceptIp: string;
        userAgent: string;
    },
): Promise<void> {
    await db.query(
        `INSERT INTO user_consents (user_id, consent_doc_id, accepted_at, accept_source, accept_ip, user_agent, created_at)
         SELECT :userId, d.consent_doc_id, NOW(), :acceptSource, :acceptIp, :userAgent, NOW()
         FROM user_consent_documents d
         WHERE d.consent_doc_id = :consentDocId
           AND d.is_active = 1
         ON DUPLICATE KEY UPDATE
           accepted_at = VALUES(accepted_at),
           accept_source = VALUES(accept_source),
           accept_ip = VALUES(accept_ip),
           user_agent = VALUES(user_agent)`,
        data,
    );
}

export function sanitizeConsentDocIds(ids: RegisterInput['acceptedConsentDocIds']): number[] {
    if (!Array.isArray(ids)) return [];
    const uniq = new Set<number>();
    for (const value of ids) {
        if (Number.isInteger(value) && value > 0) {
            uniq.add(value);
        }
    }
    return Array.from(uniq);
}

/** Find access role for a user from access_allowlist */
export async function findAccessRole(db: DB, userId: number): Promise<'admin' | 'judge' | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT access_role FROM access_allowlist
     WHERE user_id = :userId AND is_active = 1
     ORDER BY FIELD(access_role, 'admin', 'judge')
     LIMIT 1`,
        { userId },
    );
    return (rows[0]?.access_role as 'admin' | 'judge' | undefined) ?? null;
}

/** Find active team info for a user */
export async function findUserTeam(db: DB, userId: number): Promise<{ teamId: number; teamCode: string; role: string } | null> {
    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT m.team_id, t.team_code, m.role 
        FROM team_members m
        JOIN team_teams t ON m.team_id = t.team_id
        WHERE m.user_id = :userId AND m.member_status = 'active' AND t.deleted_at IS NULL
        LIMIT 1
    `, { userId });
    const row = rows[0] as { team_id: number; team_code: string; role: string } | undefined;
    return row ? { teamId: row.team_id, teamCode: row.team_code, role: row.role } : null;
}
