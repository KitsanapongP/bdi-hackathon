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
    phone?: string | null;
    first_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    last_name_en?: string | null;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
    birth_date?: string | null;
    education_level?: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | null;
    institution_name_th?: string | null;
    institution_name_en?: string | null;
    home_province?: string | null;
    is_active: number;
}, accessRole: 'admin' | 'judge' | null = null, teamInfo: { teamId: number; teamCode: string; role: string } | null = null): UserSafe {
    return {
        userId: row.user_id,
        userName: row.user_name,
        email: row.email,
        phone: row.phone ?? null,
        firstNameTh: row.first_name_th ?? null,
        lastNameTh: row.last_name_th ?? null,
        firstNameEn: row.first_name_en ?? null,
        lastNameEn: row.last_name_en ?? null,
        gender: row.gender ?? null,
        birthDate: row.birth_date ?? null,
        educationLevel: row.education_level ?? null,
        institutionNameTh: row.institution_name_th ?? null,
        institutionNameEn: row.institution_name_en ?? null,
        homeProvince: row.home_province ?? null,
        isActive: row.is_active === 1,
        accessRole,
        hasTeam: teamInfo !== null,
        ...(teamInfo ? {
            teamId: teamInfo.teamId,
            teamCode: teamInfo.teamCode,
            teamRole: teamInfo.role,
        } : {})
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
        phone: input.phone,
        firstNameTh: input.firstNameTh,
        lastNameTh: input.lastNameTh,
        firstNameEn: input.firstNameEn,
        lastNameEn: input.lastNameEn,
        gender: input.gender,
        birthDate: input.birthDate,
        educationLevel: input.educationLevel,
        institutionNameTh: input.institutionNameTh,
        institutionNameEn: input.institutionNameEn,
        homeProvince: input.homeProvince,
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

    // Look up access role and team info
    const accessRole = await repo.findAccessRole(db, userId);
    const teamInfo = await repo.findUserTeam(db, userId);

    return {
        userId,
        userName: input.userName,
        email: input.email,
        phone: input.phone,
        firstNameTh: input.firstNameTh,
        lastNameTh: input.lastNameTh,
        firstNameEn: input.firstNameEn,
        lastNameEn: input.lastNameEn,
        gender: input.gender,
        birthDate: input.birthDate,
        educationLevel: input.educationLevel,
        institutionNameTh: input.institutionNameTh,
        institutionNameEn: input.institutionNameEn,
        homeProvince: input.homeProvince,
        isActive: true,
        accessRole,
        hasTeam: teamInfo !== null,
        ...(teamInfo ? {
            teamId: teamInfo.teamId,
            teamCode: teamInfo.teamCode,
            teamRole: teamInfo.role,
        } : {})
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
    const teamInfo = await repo.findUserTeam(db, row.user_id);
    return toUserSafe(row, accessRole, teamInfo);
}

/** Get user by ID */
export async function getUserById(db: DB, userId: number): Promise<UserSafe> {
    const row = await repo.findUserById(db, userId);
    if (!row) {
        throw new UnauthorizedError('ไม่พบผู้ใช้');
    }
    const accessRole = await repo.findAccessRole(db, userId);
    const teamInfo = await repo.findUserTeam(db, userId);
    return toUserSafe(row, accessRole, teamInfo);
}
