import type { DB } from '../../config/db.js';
import type { UserRow, CredentialRow } from './auth.types.js';
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
    data: { userName: string; email: string },
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO user_users (user_name, email, is_active, created_at, updated_at)
     VALUES (:userName, :email, 1, NOW(), NOW())`,
        { userName: data.userName, email: data.email },
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
    data: { userId: number; email: string; identityType: string; domainRule: string },
): Promise<void> {
    await db.query(
        `INSERT INTO user_identities (user_id, identity_type, identifier, domain_rule, is_verified, created_at, updated_at)
     VALUES (:userId, :identityType, :email, :domainRule, 0, NOW(), NOW())`,
        { userId: data.userId, identityType: data.identityType, email: data.email, domainRule: data.domainRule },
    );
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
