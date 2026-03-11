export interface TeamRow {
    team_id: number;
    team_code: string;
    team_name_th: string;
    team_name_en: string;
    visibility: 'public' | 'private';
    current_leader_user_id: number;
    status: 'forming' | 'submitted' | 'disbanded' | 'passed' | 'failed' | 'confirmed' | 'not_joined';
    confirmation_deadline_at: Date | null;
    confirmed_at: Date | null;
    confirmed_by_user_id: number | null;
    video_link: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TeamMemberRow {
    team_member_id: number;
    team_id: number;
    user_id: number;
    role: 'leader' | 'member';
    member_status: 'active' | 'left' | 'removed';
    joined_at: Date;
    left_at: Date | null;
}

export interface TeamCodeRow {
    team_code_id: number;
    team_id: number;
    invite_code: string;
    is_active: boolean;
    expires_at: Date | null;
    created_at: Date;
    created_by_user_id: number;
}

export interface TeamJoinRequestRow {
    join_request_id: number;
    team_id: number;
    requester_user_id: number;
    request_source: 'public_listing' | 'invite_code';
    used_invite_code: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    leader_action_by_user_id: number | null;
    leader_action_at: Date | null;
    leader_reason: string | null;
    created_at: Date;
    updated_at: Date;
    requester_user_name?: string;
}

export interface TeamInvitationRow {
    invitation_id: number;
    team_id: number;
    invitee_user_id: number;
    status: 'pending' | 'accepted' | 'declined' | 'cancelled';
    created_at: Date;
    updated_at: Date;
    created_by_user_id: number;
    team_name_th?: string;
    team_code?: string;
    invited_by_user_name?: string;
}
