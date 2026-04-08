import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import type { DB } from '../../config/db.js';
import type {
    RegisterInput,
    LoginInput,
    UserSafe,
    RegisterVerifyInput,
    RegisterResendInput,
    RegisterVerifyLinkInput,
} from './auth.types.js';
import { AppError, BadRequestError, ConflictError, UnauthorizedError } from '../../shared/errors.js';
import * as repo from './auth.repo.js';
import {
    evaluateWindowStatus,
    getRegistrationWindow,
} from '../sys-config/sys-config-window.js';

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_EXPIRES_IN_SECONDS = 5 * 60;
const VERIFICATION_MAX_ATTEMPTS = 5;
const requireModule = createRequire(import.meta.url);

/** Convert a DB row to a safe user object */
function toUserSafe(row: {
    user_id: number;
    user_name: string;
    avatar_url?: string | null;
    email: string | null;
    phone?: string | null;
    first_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    last_name_en?: string | null;
    gender?: 'male' | 'female' | 'other' | null;
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
        avatarUrl: row.avatar_url ?? null,
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

function generateVerificationLinkToken(): string {
    return randomBytes(32).toString('base64url');
}

function hashVerificationLinkToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

function getFrontendBaseUrl(): string {
    const value = process.env['FRONTEND_BASE_URL']?.trim();

    if (value) {
        try {
            const parsed = new URL(value);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error('invalid protocol');
            }
            return value.replace(/\/+$/, '');
        } catch {
            throw new AppError('FRONTEND_BASE_URL ไม่ถูกต้อง ต้องเป็น URL แบบ http/https', 500);
        }
    }

    if (process.env['NODE_ENV'] === 'production') {
        throw new AppError('ระบบยืนยันอีเมลยังไม่พร้อมใช้งาน (กรุณาตั้งค่า FRONTEND_BASE_URL)', 500);
    }

    return 'http://localhost:5173';
}

function buildRegisterVerifyLink(token: string): string {
    const url = new URL('/home/register', getFrontendBaseUrl());
    url.searchParams.set('verifyToken', token);
    return url.toString();
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

function buildAuthEmailHtml(input: {
    eventTitle: string;
    headline: string;
    body: string;
    code: string;
    footer: string;
    verifyLink?: string;
}): string {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
            <div style="padding: 18px 20px; background: #0b2545; color: #ffffff; border-radius: 12px 12px 0 0;">
                <div style="font-size: 12px; letter-spacing: 0.08em; opacity: 0.9; text-transform: uppercase;">Intelligent Living Hackathon 2026</div>
                <h2 style="margin: 8px 0 0 0; font-size: 20px;">${input.eventTitle}</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #dbe3ef; border-top: 0; border-radius: 0 0 12px 12px; background: #ffffff;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #102a43;">${input.headline}</h3>
                <p style="margin: 0 0 16px 0; color: #243b53;">${input.body}</p>
                ${input.verifyLink ? `<p style="margin: 0 0 16px 0; color: #243b53;">หรือกด <a href="${input.verifyLink}" style="color: #0b5ed7; font-weight: 600; text-decoration: underline;">ที่ลิงก์นี้เพื่อยืนยันทันที</a></p>` : ''}
                <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; background: #f8fafc; border: 1px solid #dbe3ef; border-radius: 10px; padding: 16px; margin: 12px 0 18px;">
                    ${input.code}
                </div>
                <p style="margin: 0; font-size: 13px; color: #627d98;">${input.footer}</p>
            </div>
        </div>
    `;
}

async function sendRegistrationVerificationEmail(email: string, code: string, verifyLink: string): Promise<void> {
    const { transporter, reason } = getTransporter();
    if (!transporter) {
        throw new AppError(`ระบบอีเมลยังไม่พร้อมใช้งาน (${reason})`, 500);
    }

    const fromEmail = process.env['SMTP_FROM']?.trim() || process.env['SMTP_USER']?.trim() || 'noreply@hackathon.local';
    const subject = 'รหัสยืนยันการสมัครสมาชิก';
    const html = buildAuthEmailHtml({
        eventTitle: 'ยืนยันการสมัครสมาชิก',
        headline: 'รหัสยืนยันสำหรับลงทะเบียน',
        body: 'กรุณาใช้รหัสด้านล่างเพื่อยืนยันการสมัครสมาชิกภายใน 5 นาที',
        code,
        footer: 'หากคุณไม่ได้เป็นผู้สมัคร กรุณาเพิกเฉยอีเมลฉบับนี้ ลิงก์นี้ใช้ได้ครั้งเดียวเท่านั้น',
        verifyLink,
    });

    await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject,
        html,
    });
}

async function ensureUniqueIdentity(db: DB, email: string, userName: string): Promise<void> {
    const emailDup = await repo.emailExistsInActiveUser(db, email);
    if (emailDup) {
        throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    const userNameDup = await repo.userNameExistsInActiveUser(db, userName);
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
    gender: 'male' | 'female' | 'other';
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
        avatarUrl: null,
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
    meta: { acceptIp: string; userAgent: string },
): Promise<{ email: string; expiresAt: string; expiresInSeconds: number }> {
    const registrationWindow = await getRegistrationWindow(db);
    const registrationStatus = evaluateWindowStatus(registrationWindow);
    if (registrationStatus === 'not_open') {
        throw new AppError('ยังไม่ถึงเวลาที่เปิดลงทะเบียน', 400);
    }
    if (registrationStatus === 'closed') {
        throw new AppError('หมดเขตการลงทะเบียน', 400);
    }

    const normalizedEmail = normalizeEmail(input.email);
    await repo.cleanupExpiredPendingRegistrationsForIdentity(db, {
        email: normalizedEmail,
        userName: input.userName,
    });

    await ensureUniqueIdentity(db, normalizedEmail, input.userName);

    const pendingByUserName = await repo.findActivePendingRegistrationByUserName(db, input.userName);
    if (pendingByUserName && normalizeEmail(pendingByUserName.email) !== normalizedEmail) {
        throw new ConflictError('ชื่อผู้ใช้นี้กำลังรอยืนยันอีเมล');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = hashVerificationCode(verificationCode);
    const verificationLinkToken = generateVerificationLinkToken();
    const verificationLinkTokenHash = hashVerificationLinkToken(verificationLinkToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRES_IN_SECONDS * 1000);
    const identity = buildIdentityConfig(normalizedEmail);

    const pendingByEmail = await repo.findPendingRegistrationByEmail(db, normalizedEmail);
    if (pendingByEmail?.consumed_at) {
        throw new ConflictError('อีเมลนี้ยืนยันแล้ว กรุณาเข้าสู่ระบบ');
    }

    let pendingUserId = pendingByEmail?.pending_user_id ?? null;
    if (pendingUserId) {
        await repo.updateProvisionalUser(db, {
            userId: pendingUserId,
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
    } else {
        pendingUserId = await repo.createProvisionalUser(db, {
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
    }

    await repo.upsertProvisionalCredential(db, {
        userId: pendingUserId,
        email: normalizedEmail,
        passwordHash,
    });

    await repo.upsertProvisionalIdentity(db, {
        userId: pendingUserId,
        email: normalizedEmail,
        identityType: identity.identityType,
        domainRule: identity.domainRule,
    });

    const consentDocIds = repo.sanitizeConsentDocIds(input.acceptedConsentDocIds);
    await Promise.all(
        consentDocIds.map((consentDocId) => repo.recordUserConsentFromSignup(db, {
            userId: pendingUserId,
            consentDocId,
            acceptSource: 'signup_request',
            acceptIp: meta.acceptIp.slice(0, 45),
            userAgent: meta.userAgent.slice(0, 255),
        })),
    );

    await repo.upsertPendingRegistration(db, {
        pendingUserId,
        email: normalizedEmail,
        userName: input.userName,
        verificationCodeHash,
        verificationLinkTokenHash,
        expiresAt,
    });

    await sendRegistrationVerificationEmail(normalizedEmail, verificationCode, buildRegisterVerifyLink(verificationLinkToken));

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
    const registrationWindow = await getRegistrationWindow(db);
    const registrationStatus = evaluateWindowStatus(registrationWindow);
    if (registrationStatus === 'not_open') {
        throw new AppError('ยังไม่ถึงเวลาที่เปิดลงทะเบียน', 400);
    }
    if (registrationStatus === 'closed') {
        throw new AppError('หมดเขตการลงทะเบียน', 400);
    }

    const normalizedEmail = normalizeEmail(input.email);
    const pending = await repo.findPendingRegistrationByEmail(db, normalizedEmail);

    if (!pending) {
        throw new BadRequestError('ไม่พบคำขอลงทะเบียนสำหรับอีเมลนี้');
    }

    if (pending.consumed_at) {
        throw new ConflictError('อีเมลนี้ยืนยันแล้ว กรุณาเข้าสู่ระบบ');
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const verificationLinkToken = generateVerificationLinkToken();
    const verificationLinkTokenHash = hashVerificationLinkToken(verificationLinkToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRES_IN_SECONDS * 1000);

    await repo.refreshPendingRegistrationCode(db, {
        email: normalizedEmail,
        verificationCodeHash: codeHash,
        verificationLinkTokenHash,
        expiresAt,
    });

    await sendRegistrationVerificationEmail(normalizedEmail, code, buildRegisterVerifyLink(verificationLinkToken));

    return {
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: VERIFICATION_CODE_EXPIRES_IN_SECONDS,
    };
}

async function completePendingRegistration(db: DB, pending: { registration_id: number; pending_user_id: number | null; email: string }): Promise<UserSafe> {
    if (!pending.pending_user_id) {
        throw new BadRequestError('ข้อมูลลงทะเบียนไม่สมบูรณ์ กรุณาสมัครใหม่อีกครั้ง');
    }

    const normalizedEmail = normalizeEmail(pending.email);
    const identity = buildIdentityConfig(normalizedEmail);

    await repo.activatePendingRegistrationUser(db, {
        userId: pending.pending_user_id,
        email: normalizedEmail,
        identityType: identity.identityType,
        domainRule: identity.domainRule,
    });
    await repo.consumePendingRegistration(db, pending.registration_id);

    const row = await repo.findUserById(db, pending.pending_user_id);
    if (!row) {
        throw new UnauthorizedError('ไม่พบผู้ใช้');
    }
    const accessRole = await repo.findAccessRole(db, row.user_id);
    const teamInfo = await repo.findUserTeam(db, row.user_id);
    return toUserSafe(row, accessRole, teamInfo);
}

export async function verifyRegistrationCode(db: DB, input: RegisterVerifyInput): Promise<UserSafe> {
    const registrationWindow = await getRegistrationWindow(db);
    const registrationStatus = evaluateWindowStatus(registrationWindow);
    if (registrationStatus === 'not_open') {
        throw new AppError('ยังไม่ถึงเวลาที่เปิดลงทะเบียน', 400);
    }
    if (registrationStatus === 'closed') {
        throw new AppError('หมดเขตการลงทะเบียน', 400);
    }

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
        const nextAttempt = pending.attempt_count + 1;
        if (nextAttempt >= VERIFICATION_MAX_ATTEMPTS) {
            throw new BadRequestError('กรอกรหัสยืนยันไม่ถูกต้องครบ 5 ครั้ง กรุณาขอรหัสใหม่');
        }
        throw new BadRequestError('รหัสยืนยันไม่ถูกต้อง');
    }

    return completePendingRegistration(db, pending);
}

export async function verifyRegistrationLink(db: DB, input: RegisterVerifyLinkInput): Promise<UserSafe> {
    const registrationWindow = await getRegistrationWindow(db);
    const registrationStatus = evaluateWindowStatus(registrationWindow);
    if (registrationStatus === 'not_open') {
        throw new AppError('ยังไม่ถึงเวลาที่เปิดลงทะเบียน', 400);
    }
    if (registrationStatus === 'closed') {
        throw new AppError('หมดเขตการลงทะเบียน', 400);
    }

    const tokenHash = hashVerificationLinkToken(input.token.trim());
    const pending = await repo.findPendingRegistrationByLinkTokenHash(db, tokenHash);
    if (!pending) {
        throw new BadRequestError('ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว');
    }

    if (pending.consumed_at) {
        throw new ConflictError('ลิงก์นี้ถูกใช้งานแล้ว');
    }

    const expiresAtMs = new Date(pending.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
        throw new BadRequestError('ลิงก์ยืนยันหมดอายุแล้ว กรุณาขอรหัสใหม่');
    }

    return completePendingRegistration(db, pending);
}

/** Register a new user */
export async function registerUser(db: DB, input: RegisterInput): Promise<UserSafe> {
    const normalizedEmail = normalizeEmail(input.email);

    // Check duplicate email
    const emailDup = await repo.emailExistsInActiveUser(db, normalizedEmail);
    if (emailDup) {
        throw new ConflictError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Check duplicate user_name
    const userNameDup = await repo.userNameExistsInActiveUser(db, input.userName);
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
        avatarUrl: null,
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
