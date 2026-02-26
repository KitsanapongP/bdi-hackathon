export type ContentRewardRow = {
    reward_id: number;
    reward_rank: string;
    reward_name_th: string;
    reward_name_en: string;
    prize_amount: string | number | null;
    prize_currency: string | null;
    prize_text_th: string | null;
    prize_text_en: string | null;
    description_th: string | null;
    description_en: string | null;
    sort_order: number;
    is_enabled: number;
    created_at: string;
    updated_at: string;
};

export type ContentReward = {
    id: number;
    rank: string;
    nameTh: string;
    nameEn: string;
    amount: number | null;
    currency: string | null;
    prizeTextTh: string | null;
    prizeTextEn: string | null;
    descriptionTh: string | null;
    descriptionEn: string | null;
    sortOrder: number;
};
