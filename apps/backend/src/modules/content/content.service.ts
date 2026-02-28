import type { DB } from '../../config/db.js';
import * as repo from './content.repo.js';
import type { ContentReward, ContentSponsor, ContentRewardAdmin, ContentSponsorAdmin } from './content.types.js';
import { NotFoundError } from '../../shared/errors.js';

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
        nameTh: string;
        link: string;
        displayOrder: number;
        isActive: boolean;
        logo: string;
        tierCode?: string | null;
        tierNameTh?: string | null;
        tierNameEn?: string | null;
    }
): Promise<ContentSponsorAdmin> {
    const sponsorId = await repo.createSponsor(db, {
        nameEn: data.name,
        nameTh: data.nameTh,
        logoStorageKey: data.logo,
        websiteUrl: data.link || null,
        tierCode: data.tierCode || null,
        tierNameTh: data.tierNameTh || null,
        tierNameEn: data.tierNameEn || null,
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
        link?: string;
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

    await repo.updateSponsor(db, sponsorId, {
        nameEn: data.name ?? undefined,
        nameTh: data.nameTh ?? undefined,
        logoStorageKey: data.logo ?? undefined,
        websiteUrl: data.link,
        tierCode: data.tierCode,
        tierNameTh: data.tierNameTh,
        tierNameEn: data.tierNameEn,
        sortOrder: data.displayOrder ?? undefined,
        isEnabled: data.isActive,
    });

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

export async function reorderSponsorsAdmin(db: DB, updates: { id: number; displayOrder: number }[]): Promise<void> {
    await repo.updateSponsorsOrder(db, updates.map(u => ({ id: u.id, sortOrder: u.displayOrder })));
}