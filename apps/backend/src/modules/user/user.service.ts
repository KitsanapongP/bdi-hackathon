import type { DB } from '../../config/db.js';
import type { UserProfileSafe, PrivacySettingsSafe, SocialLinkSafe, PublicProfileSafe, SocialLinkRow } from './user.types.js';
import { BadRequestError, NotFoundError } from '../../shared/errors.js';
import * as repo from './user.repo.js';
import path from 'node:path';
import crypto from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

const LOCKED_TEAM_STATUSES = new Set(['submitted', 'passed', 'confirmed', 'failed', 'not_joined', 'disbanded']);
const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_STATIC_PREFIX = '/static/uploads/avatars/';
const AVATAR_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

type AvatarFormat = 'jpg' | 'png' | 'webp';

const ALLOWED_AVATAR_MIME: Record<string, AvatarFormat> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
};

function detectAvatarFormat(buffer: Buffer): AvatarFormat | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpg';
    }

    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'png';
    }

    if (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return 'webp';
    }

    return null;
}

async function readStreamToBufferWithLimit(stream: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of stream) {
        const piece = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += piece.length;
        if (total > maxBytes) {
            throw new BadRequestError('ขนาดไฟล์ต้องไม่เกิน 2MB');
        }
        chunks.push(piece);
    }

    if (total <= 0) {
        throw new BadRequestError('ไม่พบข้อมูลไฟล์');
    }

    return Buffer.concat(chunks, total);
}

function avatarUrlToDiskPath(avatarUrl: string | null | undefined): string | null {
    const raw = String(avatarUrl || '').trim();
    if (!raw) return null;

    let pathname = raw;
    if (/^https?:\/\//i.test(pathname)) {
        try {
            pathname = new URL(pathname).pathname;
        } catch {
            return null;
        }
    }

    pathname = pathname.replace(/\\/g, '/');
    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
    if (!normalizedPath.startsWith(AVATAR_STATIC_PREFIX)) {
        return null;
    }

    const relative = normalizedPath.slice(AVATAR_STATIC_PREFIX.length).replace(/^\/+/, '');
    const normalized = path.posix.normalize(relative);
    if (!normalized || normalized === '.' || normalized.startsWith('..') || normalized.includes('/../')) {
        return null;
    }

    return path.join(AVATAR_UPLOADS_DIR, ...normalized.split('/'));
}

async function safeUnlink(filePath: string | null): Promise<void> {
    if (!filePath) return;
    try {
        await unlink(filePath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw err;
        }
    }
}

async function assertProfileEditable(db: DB, userId: number): Promise<void> {
    const team = await repo.getActiveTeamByUserId(db, userId);
    if (team && LOCKED_TEAM_STATUSES.has(String(team.status || '').toLowerCase())) {
        throw new BadRequestError('โปรไฟล์ถูกล็อกหลังทีมส่งเอกสารยืนยันตัวตนแล้ว');
    }
}

/* ═══════════════════════════════════════════════════
   1.6  Profile
   ═══════════════════════════════════════════════════ */

export async function getProfile(db: DB, userId: number): Promise<UserProfileSafe> {
    const row = await repo.getProfile(db, userId);
    if (!row) throw new NotFoundError('ไม่พบผู้ใช้');
    return {
        userId: row.user_id,
        userName: row.user_name,
        avatarUrl: row.avatar_url,
        email: row.email,
        phone: row.phone,
        institutionNameTh: row.institution_name_th,
        institutionNameEn: row.institution_name_en,
        gender: row.gender,
        birthDate: row.birth_date,
        educationLevel: row.education_level,
        homeProvince: row.home_province,
        firstNameTh: row.first_name_th,
        lastNameTh: row.last_name_th,
        firstNameEn: row.first_name_en,
        lastNameEn: row.last_name_en,
    };
}

export async function updateProfile(
    db: DB,
    userId: number,
    data: {
        userName?: string | undefined;
        firstNameTh?: string | undefined;
        lastNameTh?: string | undefined;
        firstNameEn?: string | undefined;
        lastNameEn?: string | undefined;
        phone?: string | undefined;
        institutionNameTh?: string | undefined;
        institutionNameEn?: string | undefined;
        gender?: 'male' | 'female' | 'other' | undefined;
        birthDate?: string | undefined;
        educationLevel?: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | undefined;
        homeProvince?: string | undefined;
    },
): Promise<UserProfileSafe> {
    await assertProfileEditable(db, userId);
    await repo.updateProfile(db, userId, data);
    return getProfile(db, userId);
}

export async function uploadProfileAvatar(
    db: DB,
    userId: number,
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream },
): Promise<{ avatarUrl: string }> {
    const profile = await repo.getProfile(db, userId);
    if (!profile) throw new NotFoundError('ไม่พบผู้ใช้');

    await assertProfileEditable(db, userId);

    const declaredMime = String(file.mimetype || '').toLowerCase();
    const expectedFormat = ALLOWED_AVATAR_MIME[declaredMime];
    if (!expectedFormat) {
        throw new BadRequestError('รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP');
    }

    const buffer = await readStreamToBufferWithLimit(file.file, AVATAR_MAX_SIZE_BYTES);
    const detectedFormat = detectAvatarFormat(buffer);
    if (!detectedFormat) {
        throw new BadRequestError('ไฟล์รูปภาพไม่ถูกต้อง หรือเสียหาย');
    }
    if (detectedFormat !== expectedFormat) {
        throw new BadRequestError('ชนิดไฟล์ไม่ตรงกับข้อมูลที่ส่งมา');
    }

    const userFolder = `u_${userId}`;
    const uploadDir = path.join(AVATAR_UPLOADS_DIR, userFolder);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}_${crypto.randomUUID()}.${detectedFormat}`;
    const diskPath = path.join(uploadDir, fileName);
    const avatarUrl = `${AVATAR_STATIC_PREFIX}${userFolder}/${fileName}`;

    await writeFile(diskPath, buffer);

    const oldAvatarPath = avatarUrlToDiskPath(profile.avatar_url);
    try {
        await repo.updateAvatarUrl(db, userId, avatarUrl);
    } catch (err) {
        await safeUnlink(diskPath);
        throw err;
    }

    if (oldAvatarPath && oldAvatarPath !== diskPath) {
        await safeUnlink(oldAvatarPath);
    }

    return { avatarUrl };
}

export async function deleteProfileAvatar(db: DB, userId: number): Promise<{ avatarUrl: null }> {
    const profile = await repo.getProfile(db, userId);
    if (!profile) throw new NotFoundError('ไม่พบผู้ใช้');

    await assertProfileEditable(db, userId);

    const oldAvatarPath = avatarUrlToDiskPath(profile.avatar_url);
    await repo.updateAvatarUrl(db, userId, null);
    await safeUnlink(oldAvatarPath);

    return { avatarUrl: null };
}

/* ═══════════════════════════════════════════════════
   1.7  Privacy settings
   ═══════════════════════════════════════════════════ */

export async function getPrivacy(db: DB, userId: number): Promise<PrivacySettingsSafe> {
    const row = await repo.getPrivacy(db, userId);
    // Return defaults if no row exists yet
    return {
        showEmail: row ? row.show_email === 1 : false,
        showPhone: row ? row.show_phone === 1 : false,
        showUniversity: row ? row.show_university === 1 : true,
        showRealName: row ? row.show_real_name === 1 : false,
        showSocialLinks: row ? row.show_social_links === 1 : true,
    };
}

export async function updatePrivacy(
    db: DB,
    userId: number,
    data: {
        showEmail?: boolean | undefined;
        showPhone?: boolean | undefined;
        showUniversity?: boolean | undefined;
        showRealName?: boolean | undefined;
        showSocialLinks?: boolean | undefined;
    },
): Promise<PrivacySettingsSafe> {
    await repo.upsertPrivacy(db, userId, data);
    return getPrivacy(db, userId);
}

/* ═══════════════════════════════════════════════════
   1.8  Social links
   ═══════════════════════════════════════════════════ */

function toSocialLinkSafe(row: SocialLinkRow): SocialLinkSafe {
    return {
        socialLinkId: row.social_link_id,
        platformCode: row.platform_code,
        profileUrl: row.profile_url,
        displayText: row.display_text,
        isVisible: row.is_visible === 1,
    };
}

export async function getSocialLinks(db: DB, userId: number): Promise<SocialLinkSafe[]> {
    const rows = await repo.getSocialLinks(db, userId);
    return rows.map(toSocialLinkSafe);
}

export async function createSocialLink(
    db: DB,
    userId: number,
    data: { platformCode: string; profileUrl: string; displayText?: string | undefined },
): Promise<SocialLinkSafe> {
    const linkId = await repo.createSocialLink(db, userId, data);
    const row = await repo.getSocialLinkById(db, linkId, userId);
    if (!row) throw new NotFoundError('ไม่พบ social link');
    return toSocialLinkSafe(row);
}

export async function updateSocialLink(
    db: DB,
    linkId: number,
    userId: number,
    data: { profileUrl?: string | undefined; displayText?: string | undefined; isVisible?: boolean | undefined },
): Promise<SocialLinkSafe> {
    const existing = await repo.getSocialLinkById(db, linkId, userId);
    if (!existing) throw new NotFoundError('ไม่พบ social link');

    await repo.updateSocialLink(db, linkId, userId, data);
    const row = await repo.getSocialLinkById(db, linkId, userId);
    if (!row) throw new NotFoundError('ไม่พบ social link');
    return toSocialLinkSafe(row);
}

export async function deleteSocialLink(db: DB, linkId: number, userId: number): Promise<void> {
    const existing = await repo.getSocialLinkById(db, linkId, userId);
    if (!existing) throw new NotFoundError('ไม่พบ social link');
    await repo.deleteSocialLink(db, linkId, userId);
}

/* ═══════════════════════════════════════════════════
   1.9  Public profile
   ═══════════════════════════════════════════════════ */

function toPublicProfileSafe(row: { user_id: number; user_name: string; avatar_url: string | null; bio_th: string | null; bio_en: string | null; looking_for_team: number; contact_note: string | null }): PublicProfileSafe {
    return {
        userId: row.user_id,
        userName: row.user_name,
        avatarUrl: row.avatar_url,
        bioTh: row.bio_th,
        bioEn: row.bio_en,
        lookingForTeam: row.looking_for_team === 1,
        contactNote: row.contact_note,
    };
}

export async function getPublicProfile(db: DB, userId: number): Promise<PublicProfileSafe | null> {
    const row = await repo.getPublicProfile(db, userId);
    if (!row) return null;
    return toPublicProfileSafe(row);
}

export async function updatePublicProfile(
    db: DB,
    userId: number,
    data: { bioTh?: string | null | undefined; bioEn?: string | null | undefined; lookingForTeam?: boolean | undefined; contactNote?: string | null | undefined },
): Promise<PublicProfileSafe> {
    await repo.upsertPublicProfile(db, userId, data);
    const row = await repo.getPublicProfile(db, userId);
    if (!row) throw new NotFoundError('ไม่พบ public profile');
    return toPublicProfileSafe(row);
}

export async function findLookingForTeam(db: DB): Promise<PublicProfileSafe[]> {
    const rows = await repo.findLookingForTeam(db);
    return rows.map(toPublicProfileSafe);
}
