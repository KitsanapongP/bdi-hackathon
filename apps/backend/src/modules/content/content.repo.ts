import type { RowDataPacket } from 'mysql2/promise';
import type { DB } from '../../config/db.js';
import type {
    ContentCarouselSlideRow,
    ContentContactChannelRow,
    ContentContactRow,
    ContentPageRow,
    ContentRewardRow,
    ContentSponsorRow,
} from './content.types.js';

export async function getEnabledRewards(db: DB): Promise<ContentRewardRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_rewards
         WHERE is_enabled = 1
         ORDER BY sort_order ASC, reward_id ASC`
    );

    return rows as ContentRewardRow[];
}

export async function getAllRewards(db: DB): Promise<ContentRewardRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_rewards
         ORDER BY sort_order ASC, reward_id ASC`
    );

    return rows as ContentRewardRow[];
}

export async function getRewardById(db: DB, rewardId: number): Promise<ContentRewardRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM content_rewards WHERE reward_id = ?`,
        [rewardId]
    );
    const result = rows as ContentRewardRow[];
    return result[0] || null;
}

export async function createReward(
    db: DB,
    data: {
        rewardRank: string;
        rewardNameTh: string;
        rewardNameEn: string;
        prizeAmount: string | number | null;
        prizeCurrency: string | null;
        prizeTextTh: string | null;
        prizeTextEn: string | null;
        descriptionTh: string | null;
        descriptionEn: string | null;
        sortOrder: number;
        isEnabled: boolean;
    }
): Promise<number> {
    const [result] = await db.query(
        `INSERT INTO content_rewards 
         (reward_rank, reward_name_th, reward_name_en, prize_amount, prize_currency, 
          prize_text_th, prize_text_en, description_th, description_en, sort_order, is_enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.rewardRank,
            data.rewardNameTh,
            data.rewardNameEn,
            data.prizeAmount,
            data.prizeCurrency,
            data.prizeTextTh,
            data.prizeTextEn,
            data.descriptionTh,
            data.descriptionEn,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
        ]
    );
    return (result as any).insertId;
}

export async function updateReward(
    db: DB,
    rewardId: number,
    data: {
        rewardRank?: string | undefined;
        rewardNameTh?: string | undefined;
        rewardNameEn?: string | undefined;
        prizeAmount?: string | number | null | undefined;
        prizeCurrency?: string | null | undefined;
        prizeTextTh?: string | null | undefined;
        prizeTextEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.rewardRank !== undefined) { fields.push('reward_rank = ?'); values.push(data.rewardRank); }
    if (data.rewardNameTh !== undefined) { fields.push('reward_name_th = ?'); values.push(data.rewardNameTh); }
    if (data.rewardNameEn !== undefined) { fields.push('reward_name_en = ?'); values.push(data.rewardNameEn); }
    if (data.prizeAmount !== undefined) { fields.push('prize_amount = ?'); values.push(data.prizeAmount); }
    if (data.prizeCurrency !== undefined) { fields.push('prize_currency = ?'); values.push(data.prizeCurrency); }
    if (data.prizeTextTh !== undefined) { fields.push('prize_text_th = ?'); values.push(data.prizeTextTh); }
    if (data.prizeTextEn !== undefined) { fields.push('prize_text_en = ?'); values.push(data.prizeTextEn); }
    if (data.descriptionTh !== undefined) { fields.push('description_th = ?'); values.push(data.descriptionTh); }
    if (data.descriptionEn !== undefined) { fields.push('description_en = ?'); values.push(data.descriptionEn); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }

    if (fields.length === 0) return;

    values.push(rewardId);
    await db.query(
        `UPDATE content_rewards SET ${fields.join(', ')} WHERE reward_id = ?`,
        values
    );
}

export async function deleteReward(db: DB, rewardId: number): Promise<void> {
    await db.query(`DELETE FROM content_rewards WHERE reward_id = ?`, [rewardId]);
}

export async function getEnabledSponsors(db: DB, tierCode?: string): Promise<ContentSponsorRow[]> {
    const query = tierCode
        ? `SELECT *
           FROM content_sponsors
           WHERE is_enabled = 1 AND tier_code = ?
           ORDER BY sort_order ASC, sponsor_id ASC`
        : `SELECT *
           FROM content_sponsors
           WHERE is_enabled = 1
           ORDER BY sort_order ASC, sponsor_id ASC`;

    const params = tierCode ? [tierCode] : [];
    const [rows] = await db.query<RowDataPacket[]>(query, params);

    return rows as ContentSponsorRow[];
}

export async function getAllSponsors(db: DB): Promise<ContentSponsorRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM content_sponsors ORDER BY sort_order ASC, sponsor_id ASC`
    );
    return rows as ContentSponsorRow[];
}

export async function getSponsorById(db: DB, sponsorId: number): Promise<ContentSponsorRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT * FROM content_sponsors WHERE sponsor_id = ?`,
        [sponsorId]
    );
    const result = rows as ContentSponsorRow[];
    return result[0] || null;
}

export async function createSponsor(
    db: DB,
    data: {
        nameTh: string;
        nameEn: string;
        logoStorageKey: string;
        websiteUrl?: string | null;
        tierCode?: string | null;
        tierNameTh?: string | null;
        tierNameEn?: string | null;
        sortOrder: number;
        isEnabled: boolean;
    }
): Promise<number> {
    const [result] = await db.query(
        `INSERT INTO content_sponsors 
         (sponsor_name_th, sponsor_name_en, logo_storage_key, website_url, tier_code, tier_name_th, tier_name_en, sort_order, is_enabled) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.nameTh,
            data.nameEn,
            data.logoStorageKey,
            data.websiteUrl || null,
            data.tierCode || null,
            data.tierNameTh || null,
            data.tierNameEn || null,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
        ]
    );
    return (result as any).insertId;
}

export async function updateSponsor(
    db: DB,
    sponsorId: number,
    data: {
        nameTh?: string | undefined;
        nameEn?: string | undefined;
        logoStorageKey?: string | undefined;
        websiteUrl?: string | null | undefined;
        tierCode?: string | null | undefined;
        tierNameTh?: string | null | undefined;
        tierNameEn?: string | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.nameTh !== undefined) { fields.push('sponsor_name_th = ?'); values.push(data.nameTh); }
    if (data.nameEn !== undefined) { fields.push('sponsor_name_en = ?'); values.push(data.nameEn); }
    if (data.logoStorageKey !== undefined) { fields.push('logo_storage_key = ?'); values.push(data.logoStorageKey); }
    if (data.websiteUrl !== undefined) { fields.push('website_url = ?'); values.push(data.websiteUrl); }
    if (data.tierCode !== undefined) { fields.push('tier_code = ?'); values.push(data.tierCode); }
    if (data.tierNameTh !== undefined) { fields.push('tier_name_th = ?'); values.push(data.tierNameTh); }
    if (data.tierNameEn !== undefined) { fields.push('tier_name_en = ?'); values.push(data.tierNameEn); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }

    if (fields.length === 0) return;

    values.push(sponsorId);
    await db.query(
        `UPDATE content_sponsors SET ${fields.join(', ')} WHERE sponsor_id = ?`,
        values
    );
}

export async function deleteSponsor(db: DB, sponsorId: number): Promise<void> {
    await db.query(`DELETE FROM content_sponsors WHERE sponsor_id = ?`, [sponsorId]);
}

export async function updateSponsorsOrder(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
        await db.query(`UPDATE content_sponsors SET sort_order = ? WHERE sponsor_id = ?`, [update.sortOrder, update.id]);
    }
}

export async function getEnabledCarouselSlides(db: DB): Promise<ContentCarouselSlideRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_carousel_slides
         WHERE is_enabled = 1
           AND (start_at IS NULL OR start_at <= NOW())
           AND (end_at IS NULL OR end_at >= NOW())
         ORDER BY sort_order ASC, slide_id ASC`
    );

    return rows as ContentCarouselSlideRow[];
}

export async function getAllCarouselSlidesAdmin(db: DB): Promise<ContentCarouselSlideRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_carousel_slides
         ORDER BY sort_order ASC, slide_id ASC`
    );

    return rows as ContentCarouselSlideRow[];
}

export async function getCarouselSlideByIdAdmin(db: DB, slideId: number): Promise<ContentCarouselSlideRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_carousel_slides
         WHERE slide_id = ?
         LIMIT 1`,
        [slideId]
    );

    const result = rows as ContentCarouselSlideRow[];
    return result[0] ?? null;
}

export async function createCarouselSlideAdmin(
    db: DB,
    data: {
        titleTh: string | null;
        titleEn: string | null;
        descriptionTh: string | null;
        descriptionEn: string | null;
        imageStorageKey: string;
        imageAltTh: string | null;
        imageAltEn: string | null;
        targetUrl: string | null;
        openInNewTab: boolean;
        sortOrder: number;
        isEnabled: boolean;
        startAt: string | null;
        endAt: string | null;
        createdByUserId: number | null;
    }
): Promise<number> {
    const [result] = await db.query(
        `INSERT INTO content_carousel_slides (
            title_th,
            title_en,
            description_th,
            description_en,
            image_storage_key,
            image_alt_th,
            image_alt_en,
            target_url,
            open_in_new_tab,
            sort_order,
            is_enabled,
            start_at,
            end_at,
            created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.titleTh,
            data.titleEn,
            data.descriptionTh,
            data.descriptionEn,
            data.imageStorageKey,
            data.imageAltTh,
            data.imageAltEn,
            data.targetUrl,
            data.openInNewTab ? 1 : 0,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
            data.startAt,
            data.endAt,
            data.createdByUserId,
        ]
    );

    return (result as { insertId: number }).insertId;
}

export async function updateCarouselSlideAdmin(
    db: DB,
    slideId: number,
    data: {
        titleTh?: string | null | undefined;
        titleEn?: string | null | undefined;
        descriptionTh?: string | null | undefined;
        descriptionEn?: string | null | undefined;
        imageStorageKey?: string | undefined;
        imageAltTh?: string | null | undefined;
        imageAltEn?: string | null | undefined;
        targetUrl?: string | null | undefined;
        openInNewTab?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
        startAt?: string | null | undefined;
        endAt?: string | null | undefined;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (data.titleTh !== undefined) { fields.push('title_th = ?'); values.push(data.titleTh); }
    if (data.titleEn !== undefined) { fields.push('title_en = ?'); values.push(data.titleEn); }
    if (data.descriptionTh !== undefined) { fields.push('description_th = ?'); values.push(data.descriptionTh); }
    if (data.descriptionEn !== undefined) { fields.push('description_en = ?'); values.push(data.descriptionEn); }
    if (data.imageStorageKey !== undefined) { fields.push('image_storage_key = ?'); values.push(data.imageStorageKey); }
    if (data.imageAltTh !== undefined) { fields.push('image_alt_th = ?'); values.push(data.imageAltTh); }
    if (data.imageAltEn !== undefined) { fields.push('image_alt_en = ?'); values.push(data.imageAltEn); }
    if (data.targetUrl !== undefined) { fields.push('target_url = ?'); values.push(data.targetUrl); }
    if (data.openInNewTab !== undefined) { fields.push('open_in_new_tab = ?'); values.push(data.openInNewTab ? 1 : 0); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }
    if (data.startAt !== undefined) { fields.push('start_at = ?'); values.push(data.startAt); }
    if (data.endAt !== undefined) { fields.push('end_at = ?'); values.push(data.endAt); }

    if (!fields.length) return;

    values.push(slideId);
    await db.query(
        `UPDATE content_carousel_slides
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE slide_id = ?`,
        values
    );
}

export async function deleteCarouselSlideAdmin(db: DB, slideId: number): Promise<void> {
    await db.query(`DELETE FROM content_carousel_slides WHERE slide_id = ?`, [slideId]);
}

export async function updateCarouselSlidesOrderAdmin(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
        await db.query(
            `UPDATE content_carousel_slides
             SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
             WHERE slide_id = ?`,
            [update.sortOrder, update.id]
        );
    }
}

export async function getPublishedPageByCode(db: DB, pageCode: string): Promise<ContentPageRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_pages
         WHERE UPPER(page_code) = UPPER(?)
           AND is_published = 1
         ORDER BY published_at DESC, page_id DESC
         LIMIT 1`,
        [pageCode]
    );

    const result = rows as ContentPageRow[];
    return result[0] || null;
}

export async function getPageByCodeAdmin(db: DB, pageCode: string): Promise<ContentPageRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_pages
         WHERE UPPER(page_code) = UPPER(?)
         ORDER BY page_id DESC
         LIMIT 1`,
        [pageCode]
    );

    const result = rows as ContentPageRow[];
    return result[0] ?? null;
}

export async function updatePageByCodeAdmin(
    db: DB,
    pageCode: string,
    data: {
        titleTh?: string;
        titleEn?: string;
        contentHtmlTh?: string | null;
        contentHtmlEn?: string | null;
        isPublished?: boolean;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (data.titleTh !== undefined) {
        fields.push('title_th = ?');
        values.push(data.titleTh);
    }
    if (data.titleEn !== undefined) {
        fields.push('title_en = ?');
        values.push(data.titleEn);
    }
    if (data.contentHtmlTh !== undefined) {
        fields.push('content_html_th = ?');
        values.push(data.contentHtmlTh);
    }
    if (data.contentHtmlEn !== undefined) {
        fields.push('content_html_en = ?');
        values.push(data.contentHtmlEn);
    }
    if (data.isPublished !== undefined) {
        fields.push('is_published = ?');
        values.push(data.isPublished ? 1 : 0);
        fields.push('published_at = ?');
        values.push(data.isPublished ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null);
    }

    if (!fields.length) return;

    values.push(pageCode);

    await db.query(
        `UPDATE content_pages
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE UPPER(page_code) = UPPER(?)`,
        values
    );
}

export async function getEnabledContacts(db: DB): Promise<ContentContactRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_contacts
         WHERE is_enabled = 1
           AND deleted_at IS NULL
         ORDER BY is_featured DESC, sort_order ASC, contact_id ASC`
    );

    return rows as ContentContactRow[];
}

export async function getEnabledContactChannels(db: DB): Promise<ContentContactChannelRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_contact_channels
         WHERE is_enabled = 1
         ORDER BY contact_id ASC, is_primary DESC, sort_order ASC, channel_id ASC`
    );

    return rows as ContentContactChannelRow[];
}

export async function getAllContactsAdmin(db: DB): Promise<ContentContactRow[]> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_contacts
         WHERE deleted_at IS NULL
         ORDER BY is_featured DESC, sort_order ASC, contact_id ASC`
    );

    return rows as ContentContactRow[];
}

export async function getContactByIdAdmin(db: DB, contactId: number): Promise<ContentContactRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT *
         FROM content_contacts
         WHERE contact_id = ?
           AND deleted_at IS NULL
         LIMIT 1`,
        [contactId]
    );

    const result = rows as ContentContactRow[];
    return result[0] ?? null;
}

export async function createContactAdmin(
    db: DB,
    data: {
        displayNameTh: string;
        displayNameEn: string;
        roleTh: string | null;
        roleEn: string | null;
        organizationTh: string | null;
        organizationEn: string | null;
        departmentTh: string | null;
        departmentEn: string | null;
        bioTh: string | null;
        bioEn: string | null;
        avatarUrl: string | null;
        avatarAltTh: string | null;
        avatarAltEn: string | null;
        isFeatured: boolean;
        sortOrder: number;
        isEnabled: boolean;
        publishedAt: string | null;
    }
): Promise<number> {
    const [result] = await db.query(
        `INSERT INTO content_contacts (
            display_name_th,
            display_name_en,
            role_th,
            role_en,
            organization_th,
            organization_en,
            department_th,
            department_en,
            bio_th,
            bio_en,
            avatar_url,
            avatar_alt_th,
            avatar_alt_en,
            is_featured,
            sort_order,
            is_enabled,
            published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.displayNameTh,
            data.displayNameEn,
            data.roleTh,
            data.roleEn,
            data.organizationTh,
            data.organizationEn,
            data.departmentTh,
            data.departmentEn,
            data.bioTh,
            data.bioEn,
            data.avatarUrl,
            data.avatarAltTh,
            data.avatarAltEn,
            data.isFeatured ? 1 : 0,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
            data.publishedAt,
        ]
    );

    return (result as { insertId: number }).insertId;
}

export async function updateContactAdmin(
    db: DB,
    contactId: number,
    data: {
        displayNameTh?: string | undefined;
        displayNameEn?: string | undefined;
        roleTh?: string | null | undefined;
        roleEn?: string | null | undefined;
        organizationTh?: string | null | undefined;
        organizationEn?: string | null | undefined;
        departmentTh?: string | null | undefined;
        departmentEn?: string | null | undefined;
        bioTh?: string | null | undefined;
        bioEn?: string | null | undefined;
        avatarUrl?: string | null | undefined;
        avatarAltTh?: string | null | undefined;
        avatarAltEn?: string | null | undefined;
        isFeatured?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
        publishedAt?: string | null | undefined;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (data.displayNameTh !== undefined) { fields.push('display_name_th = ?'); values.push(data.displayNameTh); }
    if (data.displayNameEn !== undefined) { fields.push('display_name_en = ?'); values.push(data.displayNameEn); }
    if (data.roleTh !== undefined) { fields.push('role_th = ?'); values.push(data.roleTh); }
    if (data.roleEn !== undefined) { fields.push('role_en = ?'); values.push(data.roleEn); }
    if (data.organizationTh !== undefined) { fields.push('organization_th = ?'); values.push(data.organizationTh); }
    if (data.organizationEn !== undefined) { fields.push('organization_en = ?'); values.push(data.organizationEn); }
    if (data.departmentTh !== undefined) { fields.push('department_th = ?'); values.push(data.departmentTh); }
    if (data.departmentEn !== undefined) { fields.push('department_en = ?'); values.push(data.departmentEn); }
    if (data.bioTh !== undefined) { fields.push('bio_th = ?'); values.push(data.bioTh); }
    if (data.bioEn !== undefined) { fields.push('bio_en = ?'); values.push(data.bioEn); }
    if (data.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatarUrl); }
    if (data.avatarAltTh !== undefined) { fields.push('avatar_alt_th = ?'); values.push(data.avatarAltTh); }
    if (data.avatarAltEn !== undefined) { fields.push('avatar_alt_en = ?'); values.push(data.avatarAltEn); }
    if (data.isFeatured !== undefined) { fields.push('is_featured = ?'); values.push(data.isFeatured ? 1 : 0); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }
    if (data.publishedAt !== undefined) { fields.push('published_at = ?'); values.push(data.publishedAt); }

    if (!fields.length) return;

    values.push(contactId);
    await db.query(
        `UPDATE content_contacts
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE contact_id = ?
           AND deleted_at IS NULL`,
        values
    );
}

export async function softDeleteContactAdmin(db: DB, contactId: number): Promise<void> {
    await db.query(
        `UPDATE content_contacts
         SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE contact_id = ?
           AND deleted_at IS NULL`,
        [contactId]
    );
}

export async function updateContactsOrderAdmin(db: DB, updates: { id: number; sortOrder: number }[]): Promise<void> {
    for (const update of updates) {
        await db.query(
            `UPDATE content_contacts
             SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
             WHERE contact_id = ?
               AND deleted_at IS NULL`,
            [update.sortOrder, update.id]
        );
    }
}

export async function getChannelsByContactIdsAdmin(db: DB, contactIds: number[]): Promise<ContentContactChannelRow[]> {
    if (!contactIds.length) return [];
    const placeholders = contactIds.map(() => '?').join(', ');
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT c.*
         FROM content_contact_channels c
         INNER JOIN content_contacts ct ON ct.contact_id = c.contact_id
         WHERE c.contact_id IN (${placeholders})
           AND ct.deleted_at IS NULL
         ORDER BY c.contact_id ASC, c.is_primary DESC, c.sort_order ASC, c.channel_id ASC`,
        contactIds
    );

    return rows as ContentContactChannelRow[];
}

export async function getContactChannelByIdAdmin(db: DB, channelId: number): Promise<ContentContactChannelRow | null> {
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT c.*
         FROM content_contact_channels c
         INNER JOIN content_contacts ct ON ct.contact_id = c.contact_id
         WHERE c.channel_id = ?
           AND ct.deleted_at IS NULL
         LIMIT 1`,
        [channelId]
    );

    const result = rows as ContentContactChannelRow[];
    return result[0] ?? null;
}

export async function createContactChannelAdmin(
    db: DB,
    data: {
        contactId: number;
        channelType: string;
        labelTh: string | null;
        labelEn: string | null;
        value: string;
        url: string | null;
        isPrimary: boolean;
        sortOrder: number;
        isEnabled: boolean;
    }
): Promise<number> {
    const [result] = await db.query(
        `INSERT INTO content_contact_channels (
            contact_id,
            channel_type,
            label_th,
            label_en,
            value,
            url,
            is_primary,
            sort_order,
            is_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.contactId,
            data.channelType,
            data.labelTh,
            data.labelEn,
            data.value,
            data.url,
            data.isPrimary ? 1 : 0,
            data.sortOrder,
            data.isEnabled ? 1 : 0,
        ]
    );

    return (result as { insertId: number }).insertId;
}

export async function updateContactChannelAdmin(
    db: DB,
    channelId: number,
    data: {
        channelType?: string | undefined;
        labelTh?: string | null | undefined;
        labelEn?: string | null | undefined;
        value?: string | undefined;
        url?: string | null | undefined;
        isPrimary?: boolean | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    }
): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (data.channelType !== undefined) { fields.push('channel_type = ?'); values.push(data.channelType); }
    if (data.labelTh !== undefined) { fields.push('label_th = ?'); values.push(data.labelTh); }
    if (data.labelEn !== undefined) { fields.push('label_en = ?'); values.push(data.labelEn); }
    if (data.value !== undefined) { fields.push('value = ?'); values.push(data.value); }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.isPrimary !== undefined) { fields.push('is_primary = ?'); values.push(data.isPrimary ? 1 : 0); }
    if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
    if (data.isEnabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.isEnabled ? 1 : 0); }

    if (!fields.length) return;

    values.push(channelId);
    await db.query(
        `UPDATE content_contact_channels
         SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE channel_id = ?`,
        values
    );
}

export async function deleteContactChannelAdmin(db: DB, channelId: number): Promise<void> {
    await db.query(`DELETE FROM content_contact_channels WHERE channel_id = ?`, [channelId]);
}

export async function updateContactChannelsOrderAdmin(
    db: DB,
    contactId: number,
    updates: { id: number; sortOrder: number }[]
): Promise<void> {
    for (const update of updates) {
        await db.query(
            `UPDATE content_contact_channels
             SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
             WHERE channel_id = ?
               AND contact_id = ?`,
            [update.sortOrder, update.id, contactId]
        );
    }
}
