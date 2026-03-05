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
