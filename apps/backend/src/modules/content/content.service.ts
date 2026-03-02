import type { DB } from '../../config/db.js';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import * as repo from './content.repo.js';
import type {
    ContentContact,
    ContentPage,
    ContentReward,
    ContentRewardAdmin,
    ContentSponsor,
    ContentSponsorAdmin,
} from './content.types.js';
import { BadRequestError, NotFoundError } from '../../shared/errors.js';

function toRewardAdminResponse(row: any): ContentRewardAdmin {
    return {
        id: row.reward_id,
        rank: row.reward_rank,
        title: row.reward_name_en,
        titleTh: row.reward_name_th,
        amount: row.prize_amount === null ? null : Number(row.prize_amount),
        currency: row.prize_currency,
        prizeTextTh: row.prize_text_th,
        prizeTextEn: row.prize_text_en,
        descriptionTh: row.description_th,
        descriptionEn: row.description_en,
        sortOrder: row.sort_order,
        isActive: row.is_enabled === 1,
    };
}

const DEFAULT_SPONSOR_TIER = {
    code: 'co_organizer',
    nameTh: 'ผู้ร่วมจัด',
    nameEn: 'Co-Organizer',
};

function normalizeTierCode(tierCode?: string | null): string {
    const normalized = (tierCode || '').trim();
    return normalized || DEFAULT_SPONSOR_TIER.code;
}

function normalizeSponsorLogoStorageKey(logoInput: string, tierCode?: string | null): string {
    const tierFolder = normalizeTierCode(tierCode).replace(/_/g, '-');
    let normalizedPath = (logoInput || '').trim();

    if (/^https?:\/\//i.test(normalizedPath)) {
        try {
            normalizedPath = new URL(normalizedPath).pathname;
        } catch {
            normalizedPath = '';
        }
    }

    normalizedPath = normalizedPath.replace(/^\/+/, '');

    if (normalizedPath.startsWith('static/content/sponsors/')) {
        return `/${normalizedPath}`;
    }

    if (normalizedPath.startsWith('content/sponsors/')) {
        return `/static/${normalizedPath}`;
    }

    const fileName = path.posix.basename(normalizedPath);
    return `/static/content/sponsors/${tierFolder}/${fileName}`;
}

function sanitizeFileName(name: string): string {
    const parsed = path.parse((name || '').trim());
    const normalizedBase = (parsed.name || 'sponsor-logo')
        .normalize('NFKD')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
    const safeBase = normalizedBase || 'sponsor-logo';

    const ext = (parsed.ext || '').toLowerCase();
    const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
    const safeExt = allowedExts.has(ext) ? ext : '';

    return `${safeBase}${safeExt}`;
}

function extensionFromMimeType(mimeType: string): string {
    switch ((mimeType || '').toLowerCase()) {
        case 'image/png': return '.png';
        case 'image/jpeg': return '.jpg';
        case 'image/webp': return '.webp';
        case 'image/svg+xml': return '.svg';
        default: return '';
    }
}

export async function getRewards(db: DB): Promise<ContentReward[]> {
    const rewards = await repo.getEnabledRewards(db);

    return rewards.map((reward) => ({
        id: reward.reward_id,
        rank: reward.reward_rank,
        nameTh: reward.reward_name_th,
        nameEn: reward.reward_name_en,
        amount: reward.prize_amount === null ? null : Number(reward.prize_amount),
        currency: reward.prize_currency,
        prizeTextTh: reward.prize_text_th,
        prizeTextEn: reward.prize_text_en,
        descriptionTh: reward.description_th,
        descriptionEn: reward.description_en,
        sortOrder: reward.sort_order,
    }));
}

export async function getAllRewardsAdmin(db: DB): Promise<ContentRewardAdmin[]> {
    const rewards = await repo.getAllRewards(db);
    return rewards.map(toRewardAdminResponse);
}

export async function getRewardByIdAdmin(db: DB, rewardId: number): Promise<ContentRewardAdmin> {
    const reward = await repo.getRewardById(db, rewardId);
    if (!reward) {
        throw new NotFoundError('ไม่พบข้อมูลรางวัลนี้');
    }
    return toRewardAdminResponse(reward);
}

export async function createRewardAdmin(
    db: DB,
    data: {
        rank: string;
        title: string;
        titleTh: string;
        amount: number | null;
        currency: string | null;
        prizeTextTh: string | null;
        prizeTextEn: string | null;
        descriptionTh: string | null;
        descriptionEn: string | null;
        sortOrder: number;
        isActive: boolean;
    }
): Promise<ContentRewardAdmin> {
    const rewardId = await repo.createReward(db, {
        rewardRank: data.rank,
        rewardNameTh: data.titleTh,
        rewardNameEn: data.title,
        prizeAmount: data.amount,
        prizeCurrency: data.currency,
        prizeTextTh: data.prizeTextTh,
        prizeTextEn: data.prizeTextEn,
        descriptionTh: data.descriptionTh,
        descriptionEn: data.descriptionEn,
        sortOrder: data.sortOrder,
        isEnabled: data.isActive,
    });

    const reward = await repo.getRewardById(db, rewardId);
    return toRewardAdminResponse(reward!);
}

export async function updateRewardAdmin(
    db: DB,
    rewardId: number,
    data: {
        rank?: string;
        title?: string;
        titleTh?: string;
        amount?: number | null;
        currency?: string | null;
        prizeTextTh?: string | null;
        prizeTextEn?: string | null;
        descriptionTh?: string | null;
        descriptionEn?: string | null;
        sortOrder?: number;
        isActive?: boolean;
    }
): Promise<ContentRewardAdmin> {
    const existing = await repo.getRewardById(db, rewardId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลรางวัลนี้');
    }

    await repo.updateReward(db, rewardId, {
        rewardRank: data.rank ?? undefined,
        rewardNameTh: data.titleTh ?? undefined,
        rewardNameEn: data.title ?? undefined,
        prizeAmount: data.amount ?? undefined,
        prizeCurrency: data.currency ?? undefined,
        prizeTextTh: data.prizeTextTh ?? undefined,
        prizeTextEn: data.prizeTextEn ?? undefined,
        descriptionTh: data.descriptionTh ?? undefined,
        descriptionEn: data.descriptionEn ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        isEnabled: data.isActive,
    });

    const updated = await repo.getRewardById(db, rewardId);
    return toRewardAdminResponse(updated!);
}

export async function deleteRewardAdmin(db: DB, rewardId: number): Promise<void> {
    const existing = await repo.getRewardById(db, rewardId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูลรางวัลนี้');
    }
    await repo.deleteReward(db, rewardId);
}

export async function getSponsors(db: DB, tierCode?: string): Promise<ContentSponsor[]> {
    const sponsors = await repo.getEnabledSponsors(db, tierCode);

    return sponsors.map((sponsor) => ({
        id: sponsor.sponsor_id,
        nameTh: sponsor.sponsor_name_th,
        nameEn: sponsor.sponsor_name_en,
        logoStorageKey: sponsor.logo_storage_key,
        logoUrl: sponsor.logo_storage_key,
        websiteUrl: sponsor.website_url,
        tierCode: sponsor.tier_code,
        tierNameTh: sponsor.tier_name_th,
        tierNameEn: sponsor.tier_name_en,
        sortOrder: sponsor.sort_order,
    }));
}

function toSponsorAdminResponse(row: any): ContentSponsorAdmin {
    return {
        id: row.sponsor_id,
        name: row.sponsor_name_en,
        nameTh: row.sponsor_name_th,
        link: row.website_url || '',
        displayOrder: row.sort_order,
        isActive: row.is_enabled === 1,
        logo: row.logo_storage_key || '',
        logoMeta: null,
        tierCode: row.tier_code,
        tierNameTh: row.tier_name_th,
        tierNameEn: row.tier_name_en,
    };
}

export async function getAllSponsorsAdmin(db: DB): Promise<ContentSponsorAdmin[]> {
    const sponsors = await repo.getAllSponsors(db);
    return sponsors.map(toSponsorAdminResponse);
}

export async function getSponsorByIdAdmin(db: DB, sponsorId: number): Promise<ContentSponsorAdmin> {
    const sponsor = await repo.getSponsorById(db, sponsorId);
    if (!sponsor) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }
    return toSponsorAdminResponse(sponsor);
}

export async function createSponsorAdmin(
    db: DB,
    data: {
        name: string;
        nameTh?: string;
        link?: string | null;
        displayOrder: number;
        isActive: boolean;
        logo: string;
        tierCode?: string | null;
        tierNameTh?: string | null;
        tierNameEn?: string | null;
    }
): Promise<ContentSponsorAdmin> {
    const tierCode = normalizeTierCode(data.tierCode);
    const nameEn = data.name.trim();
    const nameTh = (data.nameTh || '').trim() || nameEn;

    const sponsorId = await repo.createSponsor(db, {
        nameEn,
        nameTh,
        logoStorageKey: normalizeSponsorLogoStorageKey(data.logo, tierCode),
        websiteUrl: (data.link || '').trim() || null,
        tierCode,
        tierNameTh: (data.tierNameTh || '').trim() || DEFAULT_SPONSOR_TIER.nameTh,
        tierNameEn: (data.tierNameEn || '').trim() || DEFAULT_SPONSOR_TIER.nameEn,
        sortOrder: data.displayOrder,
        isEnabled: data.isActive,
    });

    const sponsor = await repo.getSponsorById(db, sponsorId);
    return toSponsorAdminResponse(sponsor!);
}

export async function updateSponsorAdmin(
    db: DB,
    sponsorId: number,
    data: {
        name?: string;
        nameTh?: string;
        link?: string | null;
        displayOrder?: number;
        isActive?: boolean;
        logo?: string;
        tierCode?: string | null;
        tierNameTh?: string | null;
        tierNameEn?: string | null;
    }
): Promise<ContentSponsorAdmin> {
    const existing = await repo.getSponsorById(db, sponsorId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }

    const updatePayload: {
        nameEn?: string | undefined;
        nameTh?: string | undefined;
        logoStorageKey?: string | undefined;
        websiteUrl?: string | null | undefined;
        tierCode?: string | null | undefined;
        tierNameTh?: string | null | undefined;
        tierNameEn?: string | null | undefined;
        sortOrder?: number | undefined;
        isEnabled?: boolean | undefined;
    } = {};

    if (data.name !== undefined) updatePayload.nameEn = data.name.trim();
    if (data.nameTh !== undefined) updatePayload.nameTh = data.nameTh.trim();
    if (data.link !== undefined) updatePayload.websiteUrl = (data.link || '').trim() || null;
    if (data.tierCode !== undefined) updatePayload.tierCode = normalizeTierCode(data.tierCode);
    if (data.tierNameTh !== undefined) updatePayload.tierNameTh = (data.tierNameTh || '').trim() || null;
    if (data.tierNameEn !== undefined) updatePayload.tierNameEn = (data.tierNameEn || '').trim() || null;
    if (data.displayOrder !== undefined) updatePayload.sortOrder = data.displayOrder;
    if (data.isActive !== undefined) updatePayload.isEnabled = data.isActive;

    if (data.logo !== undefined) {
        updatePayload.logoStorageKey = normalizeSponsorLogoStorageKey(
            data.logo,
            data.tierCode !== undefined ? data.tierCode : existing.tier_code
        );
    }

    await repo.updateSponsor(db, sponsorId, updatePayload);

    const updated = await repo.getSponsorById(db, sponsorId);
    return toSponsorAdminResponse(updated!);
}

export async function deleteSponsorAdmin(db: DB, sponsorId: number): Promise<void> {
    const existing = await repo.getSponsorById(db, sponsorId);
    if (!existing) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }
    await repo.deleteSponsor(db, sponsorId);
}

export async function uploadSponsorLogoAdmin(
    db: DB,
    sponsorId: number,
    input: {
        stream: NodeJS.ReadableStream;
        originalName: string;
        mimeType: string;
        requestedFileName?: string | null;
        tierCode?: string | null;
    }
): Promise<ContentSponsorAdmin> {
    const sponsor = await repo.getSponsorById(db, sponsorId);
    if (!sponsor) {
        throw new NotFoundError('ไม่พบข้อมูล sponsor นี้');
    }

    const extFromMime = extensionFromMimeType(input.mimeType);
    if (!extFromMime) {
        throw new BadRequestError('รองรับเฉพาะ PNG/JPG/WEBP/SVG');
    }

    const chosenTierCode = normalizeTierCode(input.tierCode ?? sponsor.tier_code);
    const tierFolder = chosenTierCode.replace(/_/g, '-');

    const preferredName = (input.requestedFileName || '').trim() || input.originalName;
    let safeFileName = sanitizeFileName(preferredName);
    if (!safeFileName || !path.posix.extname(safeFileName)) {
        safeFileName = `${sanitizeFileName(path.posix.parse(preferredName).name || 'sponsor-logo')}${extFromMime}`;
    }

    const uploadDir = path.join(process.cwd(), 'public', 'content', 'sponsors', tierFolder);
    await mkdir(uploadDir, { recursive: true });

    const diskPath = path.join(uploadDir, safeFileName);
    await pipeline(input.stream, createWriteStream(diskPath));

    const logoStorageKey = `/static/content/sponsors/${tierFolder}/${safeFileName}`;

    await repo.updateSponsor(db, sponsorId, {
        logoStorageKey,
        tierCode: chosenTierCode,
    });

    const updated = await repo.getSponsorById(db, sponsorId);
    return toSponsorAdminResponse(updated!);
}

export async function reorderSponsorsAdmin(db: DB, updates: { id: number; displayOrder: number }[]): Promise<void> {
    await repo.updateSponsorsOrder(db, updates.map(u => ({ id: u.id, sortOrder: u.displayOrder })));
}

export async function getPublishedPageByCode(db: DB, pageCode: string): Promise<ContentPage> {
    const page = await repo.getPublishedPageByCode(db, pageCode);
    if (!page) {
        throw new NotFoundError('ไม่พบข้อมูลหน้าที่ร้องขอ');
    }

    return {
        id: page.page_id,
        code: page.page_code,
        titleTh: page.title_th,
        titleEn: page.title_en,
        contentHtmlTh: page.content_html_th,
        contentHtmlEn: page.content_html_en,
    };
}

export async function getContacts(db: DB): Promise<ContentContact[]> {
    const [contacts, channels] = await Promise.all([
        repo.getEnabledContacts(db),
        repo.getEnabledContactChannels(db),
    ]);

    const channelsByContact = new Map<number, ContentContact['channels']>();

    for (const channel of channels) {
        const list = channelsByContact.get(channel.contact_id) ?? [];
        list.push({
            id: channel.channel_id,
            type: channel.channel_type,
            labelTh: channel.label_th,
            labelEn: channel.label_en,
            value: channel.value,
            url: channel.url,
            isPrimary: channel.is_primary === 1,
            sortOrder: channel.sort_order,
        });
        channelsByContact.set(channel.contact_id, list);
    }

    return contacts.map((contact) => ({
        id: contact.contact_id,
        displayNameTh: contact.display_name_th,
        displayNameEn: contact.display_name_en,
        roleTh: contact.role_th,
        roleEn: contact.role_en,
        organizationTh: contact.organization_th,
        organizationEn: contact.organization_en,
        departmentTh: contact.department_th,
        departmentEn: contact.department_en,
        bioTh: contact.bio_th,
        bioEn: contact.bio_en,
        avatarUrl: contact.avatar_url,
        avatarAltTh: contact.avatar_alt_th,
        avatarAltEn: contact.avatar_alt_en,
        isFeatured: contact.is_featured === 1,
        sortOrder: contact.sort_order,
        channels: channelsByContact.get(contact.contact_id) ?? [],
    }));
}
