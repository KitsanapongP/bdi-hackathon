import type { RowDataPacket } from 'mysql2/promise';

export interface VerifyMemberProfileRow extends RowDataPacket {
    verify_profile_id: number;
    verify_round_id: number;
    team_id: number;
    user_id: number;
    national_id_hash: string | null;
    birth_date: string | null;
    address_text: string | null;
    extra_data_json: string | null;
    is_profile_complete: number;
    completed_at: Date | null;
    is_member_confirmed: number;
    member_confirmed_at: Date | null;
    member_unconfirmed_at: Date | null;
    updated_at: Date;
}

export interface VerifyMemberDocumentRow extends RowDataPacket {
    document_id: number;
    verify_round_id: number;
    team_id: number;
    user_id: number;
    requirement_id: number;
    file_storage_key: string;
    file_original_name: string;
    file_mime_type: string | null;
    file_size_bytes: number | null;
    is_current: number;
    uploaded_at: Date;
    uploaded_by_user_id: number;
    deleted_at: Date | null;
}

export interface VerifyReviewRoundRow extends RowDataPacket {
    verify_round_id: number;
    team_id: number;
    round_no: number;
    status: 'draft' | 'locked' | 'submitted' | 'returned' | 'completed' | 'cancelled';
    created_by_user_id: number;
    created_at: Date;
    locked_at: Date | null;
    submitted_at: Date | null;
}

export interface MemberVerificationStatus {
    user_id: number;
    user_name: string;
    first_name_th: string | null;
    last_name_th: string | null;
    institution_name_th: string | null;
    email: string | null;
    role: 'leader' | 'member';
    is_member_confirmed: boolean;
    member_confirmed_at: Date | null;
    document_count: number;
}

export interface TeamVerificationResponse {
    teamId: number;
    teamStatus: string;
    roundId: number | null;
    roundStatus: string | null;
    isTeamSubmitted: boolean;
    members: MemberVerificationStatus[];
    myDocuments: VerifyMemberDocumentRow[];
    myProfile: VerifyMemberProfileRow | null;
}
