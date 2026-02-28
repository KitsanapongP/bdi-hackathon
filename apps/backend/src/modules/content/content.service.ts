import type { DB } from '../../config/db.js';
import * as repo from './content.repo.js';
import type { ContentReward, ContentSponsor, ContentRewardAdmin } from './content.types.js';
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