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

export async function emailExistsInActiveUser(db: DB, email: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1
         FROM user_users
         WHERE email = :email
           AND is_active = 1
           AND deleted_at IS NULL
         LIMIT 1`,
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

export async function userNameExistsInActiveUser(db: DB, userName: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 1
         FROM user_users
         WHERE user_name = :userName
           AND is_active = 1
           AND deleted_at IS NULL
         LIMIT 1`,
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
        gender: 'male' | 'female' | 'other';
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

export async function upsertProvisionalCredential(
    db: DB,
    data: { userId: number; email: string; passwordHash: string },
): Promise<void> {
    await db.query(
        `INSERT INTO user_credentials_local (user_id, login_email, password_hash, is_enabled, created_at, updated_at)
         VALUES (:userId, :email, :passwordHash, 0, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
            user_id = VALUES(user_id),
            password_hash = VALUES(password_hash),
            is_enabled = 0,
            updated_at = NOW()`,
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

export async function upsertProvisionalIdentity(
    db: DB,
    data: { userId: number; email: string; identityType: string; domainRule: string },
): Promise<void> {
    const [updated] = await db.query<ResultSetHeader>(
        `UPDATE user_identities
         SET identity_type = :identityType,
             identifier = :email,
             domain_rule = :domainRule,
             is_verified = 0,
             verified_at = NULL,
             updated_at = NOW()
         WHERE user_id = :userId
         LIMIT 1`,
        data,
    );

    if (updated.affectedRows > 0) return;

    await db.query(
        `INSERT INTO user_identities (user_id, identity_type, identifier, domain_rule, is_verified, verified_at, created_at, updated_at)
         VALUES (:userId, :identityType, :email, :domainRule, 0, NULL, NOW(), NOW())`,
        data,
    );
}

export async function createProvisionalUser(
    db: DB,
    data: {
        userName: string;
        email: string;
        phone: string;
        firstNameTh: string;
        lastNameTh: string;
        firstNameEn: string;
        lastNameEn: string;
        gender: 'male' | 'female' | 'other';
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
            0, NOW(), NOW()
        )`,
        data,
    );
    return result.insertId;
}

export async function updateProvisionalUser(
    db: DB,
    data: {
        userId: number;
        userName: string;
        email: string;
        phone: string;
        firstNameTh: string;
        lastNameTh: string;
        firstNameEn: string;
        lastNameEn: string;
        gender: 'male' | 'female' | 'other';
        birthDate: string;
        educationLevel: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate';
        institutionNameTh: string;
        institutionNameEn: string;
        homeProvince: string;
    },
): Promise<void> {
    await db.query(
        `UPDATE user_users
         SET user_name = :userName,
             email = :email,
             phone = :phone,
             first_name_th = :firstNameTh,
             last_name_th = :lastNameTh,
             first_name_en = :firstNameEn,
             last_name_en = :lastNameEn,
             gender = :gender,
             birth_date = :birthDate,
             education_level = :educationLevel,
             institution_name_th = :institutionNameTh,
             institution_name_en = :institutionNameEn,
             home_province = :homeProvince,
             updated_at = NOW()
         WHERE user_id = :userId
           AND is_active = 0`,
        data,
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

export async function findPendingRegistrationByLinkTokenHash(
    db: DB,
    verificationLinkTokenHash: string,
): Promise<PendingRegistrationRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM user_registration_verifications
         WHERE verification_link_token_hash = :verificationLinkTokenHash
         LIMIT 1`,
        { verificationLinkTokenHash },
    );
    return (rows[0] as PendingRegistrationRow | undefined) ?? null;
}

export async function upsertPendingRegistration(
    db: DB,
    data: {
        pendingUserId: number;
        email: string;
        userName: string;
        verificationCodeHash: string;
        verificationLinkTokenHash: string;
        expiresAt: Date;
    },
): Promise<void> {
    await db.query(
        `INSERT INTO user_registration_verifications (
            pending_user_id, email, user_name, verification_code_hash, verification_link_token_hash, expires_at,
            last_sent_at, attempt_count, consumed_at, created_at, updated_at
        )
        VALUES (
            :pendingUserId, :email, :userName, :verificationCodeHash, :verificationLinkTokenHash, :expiresAt,
            NOW(), 0, NULL, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            pending_user_id = VALUES(pending_user_id),
            user_name = VALUES(user_name),
            verification_code_hash = VALUES(verification_code_hash),
            verification_link_token_hash = VALUES(verification_link_token_hash),
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
    data: { email: string; verificationCodeHash: string; verificationLinkTokenHash: string; expiresAt: Date },
): Promise<void> {
    await db.query(
        `UPDATE user_registration_verifications
         SET verification_code_hash = :verificationCodeHash,
             verification_link_token_hash = :verificationLinkTokenHash,
             expires_at = :expiresAt,
             last_sent_at = NOW(),
             attempt_count = 0,
             consumed_at = NULL,
             updated_at = NOW()
         WHERE email = :email`,
        data,
    );
}

export async function createAuthEmailLog(
    db: DB,
    data: {
        eventCode: 'REGISTER_OTP' | 'REGISTER_OTP_RESEND';
        channel: 'email';
        registrationId: number | null;
        pendingUserId: number | null;
        recipientEmail: string | null;
        subjectText: string | null;
        messageText: string | null;
        status: 'queued' | 'sent' | 'failed' | 'skipped' | 'read';
        providerMessageId?: string | null;
        errorMessage?: string | null;
        retryAfterAt?: Date | null;
        retryCount?: number;
        sentAt?: Date | null;
    },
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO auth_email_logs (
            event_code, channel, registration_id, pending_user_id, recipient_email,
            subject_text, message_text, status, provider_message_id, error_message,
            retry_after_at, retry_count, sent_at, created_at, updated_at
        ) VALUES (
            :eventCode, :channel, :registrationId, :pendingUserId, :recipientEmail,
            :subjectText, :messageText, :status, :providerMessageId, :errorMessage,
            :retryAfterAt, :retryCount, :sentAt, NOW(), NOW()
        )`,
        {
            eventCode: data.eventCode,
            channel: data.channel,
            registrationId: data.registrationId,
            pendingUserId: data.pendingUserId,
            recipientEmail: data.recipientEmail,
            subjectText: data.subjectText,
            messageText: data.messageText,
            status: data.status,
            providerMessageId: data.providerMessageId ?? null,
            errorMessage: data.errorMessage ?? null,
            retryAfterAt: data.retryAfterAt ?? null,
            retryCount: data.retryCount ?? 0,
            sentAt: data.sentAt ?? null,
        },
    );

    return result.insertId;
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
             verification_link_token_hash = '',
             updated_at = NOW()
         WHERE registration_id = :registrationId`,
        { registrationId },
    );
}

export async function cleanupExpiredPendingRegistrationsForIdentity(
    db: DB,
    data: { email: string; userName: string },
): Promise<void> {
    await db.query(
        `DELETE u
         FROM user_users u
         INNER JOIN user_registration_verifications urv ON urv.pending_user_id = u.user_id
         WHERE u.is_active = 0
           AND urv.consumed_at IS NULL
           AND urv.expires_at <= NOW()
           AND (urv.email = :email OR urv.user_name = :userName)`,
        data,
    );
}

export async function activatePendingRegistrationUser(
    db: DB,
    data: { userId: number; email: string; identityType: 'local' | 'email'; domainRule: 'any' | 'ac_th_only' },
): Promise<void> {
    await db.query(
        `UPDATE user_users
         SET is_active = 1,
             updated_at = NOW()
         WHERE user_id = :userId`,
        { userId: data.userId },
    );

    await db.query(
        `UPDATE user_credentials_local
         SET is_enabled = 1,
             password_updated_at = COALESCE(password_updated_at, NOW()),
             updated_at = NOW()
         WHERE user_id = :userId
           AND login_email = :email`,
        { userId: data.userId, email: data.email },
    );

    await db.query(
        `UPDATE user_identities
         SET identity_type = :identityType,
             identifier = :email,
             domain_rule = :domainRule,
             is_verified = 1,
             verified_at = COALESCE(verified_at, NOW()),
             updated_at = NOW()
         WHERE user_id = :userId`,
        data,
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
