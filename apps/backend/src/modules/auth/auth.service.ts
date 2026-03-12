import { createHash, randomInt } from 'node:crypto';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import type { DB } from '../../config/db.js';
import type {
    RegisterInput,
    LoginInput,
    UserSafe,
    RegisterVerifyInput,
    RegisterResendInput,
} from './auth.types.js';
import { AppError, BadRequestError, ConflictError, UnauthorizedError } from '../../shared/errors.js';
import * as repo from './auth.repo.js';

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_EXPIRES_IN_SECONDS = 5 * 60;
const VERIFICATION_MAX_ATTEMPTS = 10;
const requireModule = createRequire(import.meta.url);

type PendingRegistrationPayload = Omit<RegisterInput, 'password'> & {
    passwordHash: string;
};

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

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function buildIdentityConfig(email: string): { identityType: 'local' | 'email'; domainRule: 'any' | 'ac_th_only' } {
    const isAcTh = isAcThEmail(email);
    return {
        identityType: isAcTh ? 'email' : 'local',
        domainRule: isAcTh ? 'ac_th_only' : 'any',
    };
}

function generateVerificationCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashVerificationCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
}

function parsePendingPayload(payloadJson: string): PendingRegistrationPayload {
    try {
        const parsed = JSON.parse(payloadJson) as Partial<PendingRegistrationPayload>;
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid payload object');
        }

        const requiredStringKeys: Array<keyof PendingRegistrationPayload> = [
            'userName',
            'email',
            'phone',
            'firstNameTh',
            'lastNameTh',
            'firstNameEn',
            'lastNameEn',
            'gender',
            'birthDate',
            'educationLevel',
            'institutionNameTh',
            'institutionNameEn',
            'homeProvince',
            'passwordHash',
        ];

        for (const key of requiredStringKeys) {
            if (typeof parsed[key] !== 'string' || String(parsed[key]).trim() === '') {
                throw new Error(`Invalid payload field: ${String(key)}`);
            }
        }

        return {
            userName: parsed.userName!,
            email: parsed.email!,
            phone: parsed.phone!,
            firstNameTh: parsed.firstNameTh!,
            lastNameTh: parsed.lastNameTh!,
            firstNameEn: parsed.firstNameEn!,
            lastNameEn: parsed.lastNameEn!,
            gender: parsed.gender! as PendingRegistrationPayload['gender'],
            birthDate: parsed.birthDate!,
            educationLevel: parsed.educationLevel! as PendingRegistrationPayload['educationLevel'],
            institutionNameTh: parsed.institutionNameTh!,
            institutionNameEn: parsed.institutionNameEn!,
            homeProvince: parsed.homeProvince!,
            passwordHash: parsed.passwordHash!,
            acceptedConsentDocIds: repo.sanitizeConsentDocIds(parsed.acceptedConsentDocIds),
        };
    } catch {
        throw new BadRequestError('ข้อมูลลงทะเบียนไม่สมบูรณ์ กรุณาสมัครใหม่อีกครั้ง');
    }
}

function getTransporter() {
    const host = process.env['SMTP_HOST']?.trim();
    if (!host) return { transporter: null, reason: 'SMTP_HOST is empty' as const };

    const port = Number(process.env['SMTP_PORT'] || 587);
    const secure = String(process.env['SMTP_SECURE'] || 'false').toLowerCase() === 'true';
    const user = process.env['SMTP_USER']?.trim();
    const pass = process.env['SMTP_PASS']?.trim();
    const skipTlsVerify = String(process.env['SMTP_SKIP_TLS_VERIFY'] || '0') === '1';

    let nodemailerModule: any;
    try {
        nodemailerModule = requireModule('nodemailer');
    } catch {
        return { transporter: null, reason: 'nodemailer is not installed' as const };
    }

    const transporter = nodemailerModule.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
        tls: skipTlsVerify ? { rejectUnauthorized: false } : undefined,
    });

    return { transporter, reason: null };
}

async function sendRegistrationVerificationEmail(email: string, code: string): Promise<void> {
    const { transporter, reason } = getTransporter();
    if (!transporter) {
        throw new AppError(`ระบบอีเมลยังไม่พร้อมใช้งาน (${reason})`, 500);
    }

    const fromEmail = process.env['SMTP_FROM']?.trim() || process.env['SMTP_USER']?.trim() || 'noreply@hackathon.local';
    const subject = 'รหัสยืนยันการสมัครสมาชิก (ใช้ได้ 5 นาที)';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
            <h2 style="margin: 0 0 12px;">ยืนยันการสมัครสมาชิก</h2>
            <p style="margin: 0 0 16px;">กรุณาใช้รหัสด้านล่างเพื่อยืนยันการสมัครสมาชิกภายใน <strong>5 นาที</strong></p>
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 12px 0 18px;">
                ${code}
            </div>
            <p style="margin: 0; color: #475569;">หากคุณไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยอีเมลฉบับนี้</p>
        </div>
    `;

    await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject,
        html,
    });
}

async function ensureUniqueIdentity(db: DB, email: string, userName: string): Promise<void> {
    const emailDup = await repo.emailExists(db, email);
    if (emailDup) {
        throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const userNameDup = await repo.userNameExists(db, userName);
    if (userNameDup) {
        throw new ConflictError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    }
}

async function buildUserResponse(db: DB, input: {
    userId: number;
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
}): Promise<UserSafe> {
    const accessRole = await repo.findAccessRole(db, input.userId);
    const teamInfo = await repo.findUserTeam(db, input.userId);

    return {
        userId: input.userId,
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
        } : {}),
    };
}

/** Get access role for a user */
export async function getAccessRole(db: DB, userId: number): Promise<'admin' | 'judge' | null> {
    return repo.findAccessRole(db, userId);
}

export async function requestRegistrationVerification(
    db: DB,
    input: RegisterInput,
): Promise<{ email: string; expiresAt: string; expiresInSeconds: number }> {
    const normalizedEmail = normalizeEmail(input.email);
    await ensureUniqueIdentity(db, normalizedEmail, input.userName);

    const pendingByUserName = await repo.findActivePendingRegistrationByUserName(db, input.userName);
    if (pendingByUserName && normalizeEmail(pendingByUserName.email) !== normalizedEmail) {
        throw new ConflictError('ชื่อผู้ใช้นี้กำลังรอยืนยันอีเมล');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = hashVerificationCode(verificationCode);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRES_IN_SECONDS * 1000);

    const payload: PendingRegistrationPayload = {
        ...input,
        email: normalizedEmail,
        acceptedConsentDocIds: repo.sanitizeConsentDocIds(input.acceptedConsentDocIds),
        passwordHash,
    };

    await repo.upsertPendingRegistration(db, {
        email: normalizedEmail,
        userName: input.userName,
        verificationCodeHash,
        payloadJson: JSON.stringify(payload),
        expiresAt,
    });

    await sendRegistrationVerificationEmail(normalizedEmail, verificationCode);

    return {
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: VERIFICATION_CODE_EXPIRES_IN_SECONDS,
    };
}

export async function resendRegistrationVerification(
    db: DB,
    input: RegisterResendInput,
): Promise<{ email: string; expiresAt: string; expiresInSeconds: number }> {
    const normalizedEmail = normalizeEmail(input.email);
    const pending = await repo.findPendingRegistrationByEmail(db, normalizedEmail);

    if (!pending) {
        throw new BadRequestError('ไม่พบคำขอลงทะเบียนสำหรับอีเมลนี้');
    }

    if (pending.consumed_at) {
        throw new ConflictError('อีเมลนี้ยืนยันแล้ว กรุณาเข้าสู่ระบบ');
    }

    if (await repo.emailExists(db, normalizedEmail)) {
        throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRES_IN_SECONDS * 1000);

    await repo.refreshPendingRegistrationCode(db, {
        email: normalizedEmail,
        verificationCodeHash: codeHash,
        expiresAt,
    });

    await sendRegistrationVerificationEmail(normalizedEmail, code);

    return {
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: VERIFICATION_CODE_EXPIRES_IN_SECONDS,
    };
}

export async function verifyRegistrationCode(
    db: DB,
    input: RegisterVerifyInput,
    meta: { acceptIp: string; userAgent: string },
): Promise<UserSafe> {
    const normalizedEmail = normalizeEmail(input.email);
    const pending = await repo.findPendingRegistrationByEmail(db, normalizedEmail);

    if (!pending) {
        throw new BadRequestError('ไม่พบคำขอลงทะเบียนสำหรับอีเมลนี้');
    }

    if (pending.consumed_at) {
        throw new ConflictError('อีเมลนี้ยืนยันแล้ว กรุณาเข้าสู่ระบบ');
    }

    if (pending.attempt_count >= VERIFICATION_MAX_ATTEMPTS) {
        throw new BadRequestError('กรอกรหัสไม่ถูกต้องหลายครั้ง กรุณาขอรหัสใหม่');
    }

    const expiresAtMs = new Date(pending.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
        throw new BadRequestError('รหัสยืนยันหมดอายุแล้ว กรุณาขอรหัสใหม่');
    }

    const receivedCodeHash = hashVerificationCode(input.code.trim());
    if (receivedCodeHash !== pending.verification_code_hash) {
        await repo.incrementPendingRegistrationAttempt(db, pending.registration_id);
        throw new BadRequestError('รหัสยืนยันไม่ถูกต้อง');
    }

    const payload = parsePendingPayload(pending.payload_json);
    await ensureUniqueIdentity(db, normalizedEmail, payload.userName);

    const userId = await repo.createUser(db, {
        userName: payload.userName,
        email: normalizedEmail,
        phone: payload.phone,
        firstNameTh: payload.firstNameTh,
        lastNameTh: payload.lastNameTh,
        firstNameEn: payload.firstNameEn,
        lastNameEn: payload.lastNameEn,
        gender: payload.gender,
        birthDate: payload.birthDate,
        educationLevel: payload.educationLevel,
        institutionNameTh: payload.institutionNameTh,
        institutionNameEn: payload.institutionNameEn,
        homeProvince: payload.homeProvince,
    });

    await repo.createCredential(db, {
        userId,
        email: normalizedEmail,
        passwordHash: payload.passwordHash,
    });

    const identity = buildIdentityConfig(normalizedEmail);
    await repo.createIdentity(db, {
        userId,
        email: normalizedEmail,
        identityType: identity.identityType,
        domainRule: identity.domainRule,
        isVerified: true,
    });

    const consentDocIds = repo.sanitizeConsentDocIds(payload.acceptedConsentDocIds);
    await Promise.all(
        consentDocIds.map((consentDocId) => repo.recordUserConsentFromSignup(db, {
            userId,
            consentDocId,
            acceptSource: 'signup_verify',
            acceptIp: meta.acceptIp.slice(0, 45),
            userAgent: meta.userAgent.slice(0, 255),
        })),
    );

    await repo.consumePendingRegistration(db, pending.registration_id);

    return buildUserResponse(db, {
        userId,
        userName: payload.userName,
        email: normalizedEmail,
        phone: payload.phone,
        firstNameTh: payload.firstNameTh,
        lastNameTh: payload.lastNameTh,
        firstNameEn: payload.firstNameEn,
        lastNameEn: payload.lastNameEn,
        gender: payload.gender,
        birthDate: payload.birthDate,
        educationLevel: payload.educationLevel,
        institutionNameTh: payload.institutionNameTh,
        institutionNameEn: payload.institutionNameEn,
        homeProvince: payload.homeProvince,
    });
}

/** Register a new user */
export async function registerUser(db: DB, input: RegisterInput): Promise<UserSafe> {
    const normalizedEmail = normalizeEmail(input.email);

    // Check duplicate email
    const emailDup = await repo.emailExists(db, normalizedEmail);
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
        email: normalizedEmail,
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
        email: normalizedEmail,
        passwordHash,
    });

    // Determine identity type and domain rule based on .ac.th email
    const identity = buildIdentityConfig(normalizedEmail);

    // Create identity record
    await repo.createIdentity(db, {
        userId,
        email: normalizedEmail,
        identityType: identity.identityType,
        domainRule: identity.domainRule,
    });

    // Look up access role and team info
    const accessRole = await repo.findAccessRole(db, userId);
    const teamInfo = await repo.findUserTeam(db, userId);

    return {
        userId,
        userName: input.userName,
        email: normalizedEmail,
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
