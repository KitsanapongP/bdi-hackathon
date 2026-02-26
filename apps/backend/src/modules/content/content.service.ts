import type { DB } from '../../config/db.js';
import * as repo from './content.repo.js';
import type { ContentReward, ContentSponsor } from './content.types.js';

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
