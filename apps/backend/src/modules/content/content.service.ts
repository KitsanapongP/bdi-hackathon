import type { DB } from '../../config/db.js';
import * as repo from './content.repo.js';
import type { ContentReward } from './content.types.js';

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
