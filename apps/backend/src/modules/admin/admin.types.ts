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

export type DashboardTeamStatus = 'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded';

export interface DashboardStatusCountRow {
    status: DashboardTeamStatus;
    count: number;
}

export interface DashboardTrendRow {
    date_label: string;
    submitted: number;
    passed: number;
    failed: number;
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

export interface DashboardEducationLevelCountRow {
    education_level: string | null;
    count: number;
}

export interface DashboardInstitutionCountRow {
    institution_name: string;
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
    confirmation_deadline_at: Date | null;
    confirmed_at: Date | null;
    confirmed_by_user_id: number | null;
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
}

export interface ExportTeamMemberRow {
    team_id: number;
    team_code: string;
    team_name_th: string;
    team_name_en: string;
    team_status: string;
    member_order: number;
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
    gender: 'male' | 'female' | 'other' | null;
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

export interface SelectionTeamRow {
    team_id: number;
    team_code: string;
    team_name_th: string;
    team_name_en: string;
    status: 'submitted' | 'passed' | 'failed' | 'confirmed' | 'forming' | 'disbanded' | 'not_joined';
    current_leader_user_id: number;
    leader_name: string | null;
    member_count: number;
    confirmation_deadline_at: Date | null;
    confirmed_at: Date | null;
    confirmed_by_user_id: number | null;
    updated_at: Date;
}

export interface ExportMemberDocumentRow {
    team_id: number;
    user_id: number;
    user_name: string;
    first_name_th: string | null;
    last_name_th: string | null;
    first_name_en: string | null;
    last_name_en: string | null;
    file_storage_key: string;
    file_original_name: string;
    uploaded_at: Date;
}

export interface ExportSubmissionFileRow {
    team_id: number;
    team_submission_task_id: number | null;
    task_name: string | null;
    task_sort_order: number | null;
    file_storage_key: string;
    file_original_name: string;
    uploaded_at: Date;
}

export interface ExportSubmissionLinkRow {
    team_id: number;
    team_submission_task_id: number;
    task_name: string | null;
    task_sort_order: number | null;
    link_url: string;
    updated_at: Date;
}

export type ExportTeamStatus = 'forming' | 'submitted' | 'passed' | 'failed' | 'confirmed' | 'not_joined' | 'disbanded';

export interface ExportTeamsForSheetRow {
    team_id: number;
    team_code: string;
    team_name_th: string | null;
    team_name_en: string | null;
    status: ExportTeamStatus;
    current_leader_user_id: number | null;
    leader_user_name: string | null;
    video_link: string | null;
    confirmation_deadline_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface AdminSubmissionTaskRow {
    submission_task_id: number;
    task_name: string;
    description: string | null;
    task_type: 'link' | 'file';
    stage: 'pre_selection' | 'training' | 'onsite';
    is_required: number;
    allowed_extensions: string | null;
    sort_order: number;
    deadline_at: Date | null;
    is_enabled: number;
    is_default: number;
    created_by_user_id: number | null;
    created_at: Date;
    updated_at: Date;
    assigned_team_count: number;
}

export interface AdminSubmissionTaskAssignedTeamRow {
    team_id: number;
    team_code: string;
    team_name_th: string | null;
    team_name_en: string | null;
    status: 'submitted' | 'passed' | 'failed' | 'confirmed' | 'forming' | 'disbanded' | 'not_joined';
    is_submission_open: number;
}
