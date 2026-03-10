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

export type ContentCarouselSlideRow = {
    slide_id: number;
    title_th: string | null;
    title_en: string | null;
    description_th: string | null;
    description_en: string | null;
    image_storage_key: string;
    image_alt_th: string | null;
    image_alt_en: string | null;
    target_url: string | null;
    open_in_new_tab: number;
    sort_order: number;
    is_enabled: number;
    start_at: string | null;
    end_at: string | null;
    created_by_user_id: number | null;
    created_at: string;
    updated_at: string;
};

export type ContentCarouselSlide = {
    id: number;
    titleTh: string | null;
    titleEn: string | null;
    descriptionTh: string | null;
    descriptionEn: string | null;
    imageStorageKey: string;
    imageUrl: string;
    imageAltTh: string | null;
    imageAltEn: string | null;
    targetUrl: string | null;
    openInNewTab: boolean;
    sortOrder: number;
};

export type ContentCarouselSlideAdmin = ContentCarouselSlide & {
    isEnabled: boolean;
    startAt: string | null;
    endAt: string | null;
    createdByUserId: number | null;
};

export type ContentPageRow = {
    page_id: number;
    page_code: string;
    title_th: string;
    title_en: string;
    content_html_th: string | null;
    content_html_en: string | null;
    is_published: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
};

export type ContentPage = {
    id: number;
    code: string;
    titleTh: string;
    titleEn: string;
    contentHtmlTh: string | null;
    contentHtmlEn: string | null;
};

export type ContentContactRow = {
    contact_id: number;
    display_name_th: string;
    display_name_en: string;
    role_th: string | null;
    role_en: string | null;
    organization_th: string | null;
    organization_en: string | null;
    department_th: string | null;
    department_en: string | null;
    bio_th: string | null;
    bio_en: string | null;
    avatar_url: string | null;
    avatar_alt_th: string | null;
    avatar_alt_en: string | null;
    is_featured: number;
    sort_order: number;
    is_enabled: number;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

export type ContentContactChannelRow = {
    channel_id: number;
    contact_id: number;
    channel_type: string;
    label_th: string | null;
    label_en: string | null;
    value: string;
    url: string | null;
    is_primary: number;
    sort_order: number;
    is_enabled: number;
    created_at: string;
    updated_at: string;
};

export type ContentContactChannel = {
    id: number;
    type: string;
    labelTh: string | null;
    labelEn: string | null;
    value: string;
    url: string | null;
    isPrimary: boolean;
    sortOrder: number;
};

export type ContentContact = {
    id: number;
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
    channels: ContentContactChannel[];
};

export type ContentContactChannelAdmin = {
    id: number;
    contactId: number;
    channelType: string;
    labelTh: string | null;
    labelEn: string | null;
    value: string;
    url: string | null;
    isPrimary: boolean;
    sortOrder: number;
    isEnabled: boolean;
};

export type ContentContactAdmin = {
    id: number;
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
    channels: ContentContactChannelAdmin[];
};
