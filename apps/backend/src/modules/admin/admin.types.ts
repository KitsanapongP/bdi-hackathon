export interface AllowlistRow {
    allow_id: number;
    user_id: number;
    access_role: 'admin' | 'judge';
    is_active: number;
    note: string | null;
    granted_at: Date;
    granted_by_user_id: number | null;
}

export interface AllowlistResponse {
    allowId: number;
    userId: number;
    accessRole: 'admin' | 'judge';
    isActive: boolean;
    note: string | null;
    grantedAt: string;
    grantedByUserId: number | null;
}

export type DashboardTeamStatus = 'submitted' | 'approved' | 'rejected';

export interface DashboardStatusCountRow {
    status: DashboardTeamStatus;
    count: number;
}

export interface DashboardTrendRow {
    date_label: string;
    submitted: number;
    approved: number;
    rejected: number;
}

export interface DashboardTeamMemberCountRow {
    team_id: number;
    team_code: string;
    team_name: string;
    status: DashboardTeamStatus;
    member_count: number;
}

export interface DashboardGenderCountRow {
    gender: string | null;
    count: number;
}

export interface DashboardProvinceCountRow {
    province: string | null;
    count: number;
}

export interface DashboardDuplicateMemberRow {
    team_id: number;
    team_code: string;
    team_name: string;
    status: DashboardTeamStatus;
    user_id: number;
    user_name: string;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
}

export interface ExportSubmittedTeamRow {
    team_id: number;
    team_code: string;
    team_name_th: string;
    team_name_en: string;
    status: string;
    visibility: 'public' | 'private';
    current_leader_user_id: number;
    video_link: string | null;
    approved_at: Date | null;
    selected_at: Date | null;
    rejected_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface ExportTeamAdvisorRow {
    team_id: number;
    prefix: string | null;
    first_name_th: string;
    last_name_th: string;
    first_name_en: string | null;
    last_name_en: string | null;
    email: string | null;
    phone: string | null;
    institution_name_th: string | null;
    position: string | null;
}

export interface ExportTeamMemberRow {
    team_id: number;
    team_code: string;
    team_name_th: string;
    team_name_en: string;
    team_status: string;
    user_id: number;
    user_name: string;
    role: 'leader' | 'member';
    member_status: 'active' | 'left' | 'removed';
    joined_at: Date;
    left_at: Date | null;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
    email: string | null;
    phone: string | null;
    institution_name_th: string | null;
    institution_name_en: string | null;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
    birth_date: string | null;
    education_level: 'secondary' | 'high_school' | 'bachelor' | 'master' | 'doctorate' | null;
    home_province: string | null;
    verify_round_id: number | null;
    is_profile_complete: number | null;
    is_member_confirmed: number | null;
    member_confirmed_at: Date | null;
    member_unconfirmed_at: Date | null;
    profile_completed_at: Date | null;
    profile_updated_at: Date | null;
}
