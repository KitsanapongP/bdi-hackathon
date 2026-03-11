import type { DB } from '../../config/db.js';
import type { UserProfileRow, PrivacySettingsRow, SocialLinkRow, PublicProfileRow } from './user.types.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/* ═══════════════════════════════════════════════════
   1.6  Profile
   ═══════════════════════════════════════════════════ */

export async function getProfile(db: DB, userId: number): Promise<UserProfileRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT user_id, user_name, email, phone,
                institution_name_th, institution_name_en,
                first_name_th, last_name_th, first_name_en, last_name_en,
                gender, birth_date, education_level, home_province,
                is_active, created_at, updated_at
         FROM user_users
         WHERE user_id = :userId AND is_active = 1 AND deleted_at IS NULL
         LIMIT 1`,
        { userId },
    );
    return (rows[0] as UserProfileRow | undefined) ?? null;
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
        gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | undefined;
        birthDate?: string | undefined;
        educationLevel?: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | undefined;
        homeProvince?: string | undefined;
    },
): Promise<void> {
    const sets: string[] = [];
    const params: Record<string, unknown> = { userId };

    if (data.userName !== undefined) { sets.push('user_name = :userName'); params.userName = data.userName; }
    if (data.firstNameTh !== undefined) { sets.push('first_name_th = :firstNameTh'); params.firstNameTh = data.firstNameTh; }
    if (data.lastNameTh !== undefined) { sets.push('last_name_th = :lastNameTh'); params.lastNameTh = data.lastNameTh; }
    if (data.firstNameEn !== undefined) { sets.push('first_name_en = :firstNameEn'); params.firstNameEn = data.firstNameEn; }
    if (data.lastNameEn !== undefined) { sets.push('last_name_en = :lastNameEn'); params.lastNameEn = data.lastNameEn; }
    if (data.phone !== undefined) { sets.push('phone = :phone'); params.phone = data.phone; }
    if (data.institutionNameTh !== undefined) { sets.push('institution_name_th = :institutionNameTh'); params.institutionNameTh = data.institutionNameTh; }
    if (data.institutionNameEn !== undefined) { sets.push('institution_name_en = :institutionNameEn'); params.institutionNameEn = data.institutionNameEn; }
    if (data.gender !== undefined) { sets.push('gender = :gender'); params.gender = data.gender; }
    if (data.birthDate !== undefined) { sets.push('birth_date = :birthDate'); params.birthDate = data.birthDate; }
    if (data.educationLevel !== undefined) { sets.push('education_level = :educationLevel'); params.educationLevel = data.educationLevel; }
    if (data.homeProvince !== undefined) { sets.push('home_province = :homeProvince'); params.homeProvince = data.homeProvince; }

    if (sets.length === 0) return;

    await db.query(
        `UPDATE user_users SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = :userId`,
        params,
    );
}

export async function getActiveTeamByUserId(db: DB, userId: number): Promise<{ team_id: number; status: string } | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT t.team_id, t.status
         FROM team_members m
         INNER JOIN team_teams t ON t.team_id = m.team_id
         WHERE m.user_id = :userId
           AND m.member_status = 'active'
           AND t.deleted_at IS NULL
         ORDER BY m.team_member_id DESC
         LIMIT 1`,
        { userId },
    );
    return (rows[0] as { team_id: number; status: string } | undefined) ?? null;
}

/* ═══════════════════════════════════════════════════
   1.7  Privacy settings
   ═══════════════════════════════════════════════════ */

export async function getPrivacy(db: DB, userId: number): Promise<PrivacySettingsRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_privacy_settings WHERE user_id = :userId LIMIT 1`,
        { userId },
    );
    return (rows[0] as PrivacySettingsRow | undefined) ?? null;
}

export async function upsertPrivacy(
    db: DB,
    userId: number,
    data: {
        showEmail?: boolean | undefined;
        showPhone?: boolean | undefined;
        showUniversity?: boolean | undefined;
        showRealName?: boolean | undefined;
        showSocialLinks?: boolean | undefined;
    },
): Promise<void> {
    // Check if row exists
    const existing = await getPrivacy(db, userId);

    if (!existing) {
        // Insert with defaults for unspecified fields
        await db.query(
            `INSERT INTO user_privacy_settings (user_id, show_email, show_phone, show_university, show_real_name, show_social_links, updated_at)
             VALUES (:userId, :showEmail, :showPhone, :showUniversity, :showRealName, :showSocialLinks, NOW())`,
            {
                userId,
                showEmail: data.showEmail ? 1 : 0,
                showPhone: data.showPhone ? 1 : 0,
                showUniversity: data.showUniversity !== false ? 1 : 0,
                showRealName: data.showRealName ? 1 : 0,
                showSocialLinks: data.showSocialLinks !== false ? 1 : 0,
            },
        );
        return;
    }

    const sets: string[] = [];
    const params: Record<string, unknown> = { userId };

    if (data.showEmail !== undefined) { sets.push('show_email = :showEmail'); params.showEmail = data.showEmail ? 1 : 0; }
    if (data.showPhone !== undefined) { sets.push('show_phone = :showPhone'); params.showPhone = data.showPhone ? 1 : 0; }
    if (data.showUniversity !== undefined) { sets.push('show_university = :showUniversity'); params.showUniversity = data.showUniversity ? 1 : 0; }
    if (data.showRealName !== undefined) { sets.push('show_real_name = :showRealName'); params.showRealName = data.showRealName ? 1 : 0; }
    if (data.showSocialLinks !== undefined) { sets.push('show_social_links = :showSocialLinks'); params.showSocialLinks = data.showSocialLinks ? 1 : 0; }

    if (sets.length === 0) return;

    await db.query(
        `UPDATE user_privacy_settings SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = :userId`,
        params,
    );
}

/* ═══════════════════════════════════════════════════
   1.8  Social links
   ═══════════════════════════════════════════════════ */

export async function getSocialLinks(db: DB, userId: number): Promise<SocialLinkRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_social_links WHERE user_id = :userId ORDER BY created_at`,
        { userId },
    );
    return rows as SocialLinkRow[];
}

export async function getSocialLinkById(db: DB, linkId: number, userId: number): Promise<SocialLinkRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM user_social_links WHERE social_link_id = :linkId AND user_id = :userId LIMIT 1`,
        { linkId, userId },
    );
    return (rows[0] as SocialLinkRow | undefined) ?? null;
}

export async function createSocialLink(
    db: DB,
    userId: number,
    data: { platformCode: string; profileUrl: string; displayText?: string | undefined },
): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO user_social_links (user_id, platform_code, profile_url, display_text, is_visible, created_at, updated_at)
         VALUES (:userId, :platformCode, :profileUrl, :displayText, 1, NOW(), NOW())`,
        { userId, platformCode: data.platformCode, profileUrl: data.profileUrl, displayText: data.displayText ?? null },
    );
    return result.insertId;
}

export async function updateSocialLink(
    db: DB,
    linkId: number,
    userId: number,
    data: { profileUrl?: string | undefined; displayText?: string | undefined; isVisible?: boolean | undefined },
): Promise<void> {
    const sets: string[] = [];
    const params: Record<string, unknown> = { linkId, userId };

    if (data.profileUrl !== undefined) { sets.push('profile_url = :profileUrl'); params.profileUrl = data.profileUrl; }
    if (data.displayText !== undefined) { sets.push('display_text = :displayText'); params.displayText = data.displayText; }
    if (data.isVisible !== undefined) { sets.push('is_visible = :isVisible'); params.isVisible = data.isVisible ? 1 : 0; }

    if (sets.length === 0) return;

    await db.query(
        `UPDATE user_social_links SET ${sets.join(', ')}, updated_at = NOW()
         WHERE social_link_id = :linkId AND user_id = :userId`,
        params,
    );
}

export async function deleteSocialLink(db: DB, linkId: number, userId: number): Promise<void> {
    await db.query(
        `DELETE FROM user_social_links WHERE social_link_id = :linkId AND user_id = :userId`,
        { linkId, userId },
    );
}

/* ═══════════════════════════════════════════════════
   1.9  Public profile
   ═══════════════════════════════════════════════════ */

export async function getPublicProfile(db: DB, userId: number): Promise<(PublicProfileRow & { user_name: string }) | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT pp.*, u.user_name
         FROM user_public_profiles pp
         INNER JOIN user_users u ON u.user_id = pp.user_id
         WHERE pp.user_id = :userId AND u.is_active = 1 AND u.deleted_at IS NULL
         LIMIT 1`,
        { userId },
    );
    return (rows[0] as (PublicProfileRow & { user_name: string }) | undefined) ?? null;
}

export async function upsertPublicProfile(
    db: DB,
    userId: number,
    data: { bioTh?: string | null | undefined; bioEn?: string | null | undefined; lookingForTeam?: boolean | undefined; contactNote?: string | null | undefined },
): Promise<void> {
    const existing = await getPublicProfile(db, userId);

    if (!existing) {
        await db.query(
            `INSERT INTO user_public_profiles (user_id, bio_th, bio_en, looking_for_team, contact_note, updated_at)
             VALUES (:userId, :bioTh, :bioEn, :lookingForTeam, :contactNote, NOW())`,
            {
                userId,
                bioTh: data.bioTh ?? null,
                bioEn: data.bioEn ?? null,
                lookingForTeam: data.lookingForTeam ? 1 : 0,
                contactNote: data.contactNote ?? null,
            },
        );
        return;
    }

    const sets: string[] = [];
    const params: Record<string, unknown> = { userId };

    if (data.bioTh !== undefined) { sets.push('bio_th = :bioTh'); params.bioTh = data.bioTh; }
    if (data.bioEn !== undefined) { sets.push('bio_en = :bioEn'); params.bioEn = data.bioEn; }
    if (data.lookingForTeam !== undefined) { sets.push('looking_for_team = :lookingForTeam'); params.lookingForTeam = data.lookingForTeam ? 1 : 0; }
    if (data.contactNote !== undefined) { sets.push('contact_note = :contactNote'); params.contactNote = data.contactNote; }

    if (sets.length === 0) return;

    await db.query(
        `UPDATE user_public_profiles SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = :userId`,
        params,
    );
}

/** List users looking for team (for team discovery) */
export async function findLookingForTeam(db: DB): Promise<(PublicProfileRow & { user_name: string })[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT pp.*, u.user_name
         FROM user_public_profiles pp
         INNER JOIN user_users u ON u.user_id = pp.user_id
         WHERE pp.looking_for_team = 1 AND u.is_active = 1 AND u.deleted_at IS NULL
         ORDER BY pp.updated_at DESC`,
    );
    return rows as (PublicProfileRow & { user_name: string })[];
}
