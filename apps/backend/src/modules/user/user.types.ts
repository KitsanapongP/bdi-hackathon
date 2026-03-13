/* ── user_users profile fields ── */
export interface UserProfileRow {
    user_id: number;
    user_name: string;
    email: string | null;
    phone: string | null;
    institution_name_th: string | null;
    institution_name_en: string | null;
    gender: 'male' | 'female' | 'other' | null;
    birth_date: string | null;
    education_level: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | null;
    home_province: string | null;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export interface UserProfileSafe {
    userId: number;
    userName: string;
    email: string | null;
    phone: string | null;
    institutionNameTh: string | null;
    institutionNameEn: string | null;
    gender: 'male' | 'female' | 'other' | null;
    birthDate: string | null;
    educationLevel: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | null;
    homeProvince: string | null;
    firstNameTh: string | null;
    lastNameTh: string | null;
    firstNameEn: string | null;
    lastNameEn: string | null;
}

/* ── user_privacy_settings ── */
export interface PrivacySettingsRow {
    user_id: number;
    show_email: number;
    show_phone: number;
    show_university: number;
    show_real_name: number;
    show_social_links: number;
    updated_at: string;
}

export interface PrivacySettingsSafe {
    showEmail: boolean;
    showPhone: boolean;
    showUniversity: boolean;
    showRealName: boolean;
    showSocialLinks: boolean;
}

/* ── user_social_links ── */
export interface SocialLinkRow {
    social_link_id: number;
    user_id: number;
    platform_code: string;
    profile_url: string;
    display_text: string | null;
    is_visible: number;
    created_at: string;
    updated_at: string;
}

export interface SocialLinkSafe {
    socialLinkId: number;
    platformCode: string;
    profileUrl: string;
    displayText: string | null;
    isVisible: boolean;
}

/* ── user_public_profiles ── */
export interface PublicProfileRow {
    user_id: number;
    bio_th: string | null;
    bio_en: string | null;
    looking_for_team: number;
    contact_note: string | null;
    updated_at: string;
}

export interface PublicProfileSafe {
    userId: number;
    userName: string;
    bioTh: string | null;
    bioEn: string | null;
    lookingForTeam: boolean;
    contactNote: string | null;
}
