import bcrypt from 'bcryptjs';
import type { DB } from '../../config/db.js';
import type { RegisterInput, LoginInput, UserSafe } from './auth.types.js';
import { ConflictError, UnauthorizedError } from '../../shared/errors.js';
import * as repo from './auth.repo.js';

const SALT_ROUNDS = 10;

/** Convert a DB row to a safe user object */
function toUserSafe(row: {
    user_id: number;
    user_name: string;
    email: string | null;
    first_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    last_name_en?: string | null;
    is_active: number;
}, accessRole: 'admin' | 'judge' | null = null): UserSafe {
    return {
        userId: row.user_id,
        userName: row.user_name,
        email: row.email,
        firstNameTh: row.first_name_th ?? null,
        lastNameTh: row.last_name_th ?? null,
        firstNameEn: row.first_name_en ?? null,
        lastNameEn: row.last_name_en ?? null,
        isActive: row.is_active === 1,
        accessRole,
    };
}

/** Check if email ends with .ac.th domain */
function isAcThEmail(email: string): boolean {
    return email.toLowerCase().endsWith('.ac.th');
}

/** Get access role for a user */
export async function getAccessRole(db: DB, userId: number): Promise<'admin' | 'judge' | null> {
    return repo.findAccessRole(db, userId);
}

/** Register a new user */
export async function registerUser(db: DB, input: RegisterInput): Promise<UserSafe> {
    // Check duplicate email
    const emailDup = await repo.emailExists(db, input.email);
    if (emailDup) {
        throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Check duplicate user_name
    const userNameDup = await repo.userNameExists(db, input.userName);
    if (userNameDup) {
        throw new ConflictError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user
    const userId = await repo.createUser(db, {
        userName: input.userName,
        email: input.email,
    });

    // Create local credential
    await repo.createCredential(db, {
        userId,
        email: input.email,
        passwordHash,
    });

    // Determine identity type and domain rule based on .ac.th email
    const isAcTh = isAcThEmail(input.email);
    const identityType = isAcTh ? 'email' : 'local';
    const domainRule = isAcTh ? 'ac_th_only' : 'any';

    // Create identity record
    await repo.createIdentity(db, {
        userId,
        email: input.email,
        identityType,
        domainRule,
    });

    // Look up access role (newly registered users typically won't have one)
    const accessRole = await repo.findAccessRole(db, userId);

    return {
        userId,
        userName: input.userName,
        email: input.email,
        firstNameTh: null,
        lastNameTh: null,
        firstNameEn: null,
        lastNameEn: null,
        isActive: true,
        accessRole,
    };
}

/** Authenticate a user by email/password */
export async function loginUser(db: DB, input: LoginInput): Promise<UserSafe> {
    const row = await repo.findUserByEmail(db, input.email);

    if (!row) {
        throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const valid = await bcrypt.compare(input.password, row.password_hash);
    if (!valid) {
        throw new UnauthorizedError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const accessRole = await repo.findAccessRole(db, row.user_id);
    return toUserSafe(row, accessRole);
}

/** Get user by ID */
export async function getUserById(db: DB, userId: number): Promise<UserSafe> {
    const row = await repo.findUserById(db, userId);
    if (!row) {
        throw new UnauthorizedError('ไม่พบผู้ใช้');
    }
    const accessRole = await repo.findAccessRole(db, userId);
    return toUserSafe(row, accessRole);
}
