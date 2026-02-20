import type { DB } from '../../config/db.js';
import type { UserProfileSafe, PrivacySettingsSafe, SocialLinkSafe, PublicProfileSafe, SocialLinkRow } from './user.types.js';
import { NotFoundError } from '../../shared/errors.js';
import * as repo from './user.repo.js';

/* ═══════════════════════════════════════════════════
   1.6  Profile
   ═══════════════════════════════════════════════════ */

export async function getProfile(db: DB, userId: number): Promise<UserProfileSafe> {
    const row = await repo.getProfile(db, userId);
    if (!row) throw new NotFoundError('ไม่พบผู้ใช้');
    return {
        userId: row.user_id,
        userName: row.user_name,
        email: row.email,
        phone: row.phone,
        universityNameTh: row.university_name_th,
        universityNameEn: row.university_name_en,
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
        universityNameTh?: string | undefined;
        universityNameEn?: string | undefined;
    },
): Promise<UserProfileSafe> {
    await repo.updateProfile(db, userId, data);
    return getProfile(db, userId);
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

function toPublicProfileSafe(row: { user_id: number; user_name: string; bio_th: string | null; bio_en: string | null; looking_for_team: number; contact_note: string | null }): PublicProfileSafe {
    return {
        userId: row.user_id,
        userName: row.user_name,
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
