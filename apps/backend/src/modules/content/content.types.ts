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

export type ContentRewardAdmin = {
    id: number;
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
};

export type ContentSponsorRow = {
    sponsor_id: number;
    sponsor_name_th: string;
    sponsor_name_en: string;
    logo_storage_key: string;
    website_url: string | null;
    tier_code: string | null;
    tier_name_th: string | null;
    tier_name_en: string | null;
    sort_order: number;
    is_enabled: number;
    created_at: string;
    updated_at: string;
};

export type ContentSponsor = {
    id: number;
    nameTh: string;
    nameEn: string;
    logoStorageKey: string;
    logoUrl: string;
    websiteUrl: string | null;
    tierCode: string | null;
    tierNameTh: string | null;
    tierNameEn: string | null;
    sortOrder: number;
};

export type ContentSponsorAdmin = {
    id: number;
    name: string;
    nameTh: string;
    link: string;
    displayOrder: number;
    isActive: boolean;
    logo: string;
    logoMeta: { type: string; sizeKb: number } | null;
    tierCode: string | null;
    tierNameTh: string | null;
    tierNameEn: string | null;
};
