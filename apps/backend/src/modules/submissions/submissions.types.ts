import type { RowDataPacket } from 'mysql2/promise';

export interface SubmissionFileRow extends RowDataPacket {
    file_id: number;
    team_id: number;
    file_storage_key: string;
    file_original_name: string;
    file_mime_type: string | null;
    file_size_bytes: number | null;
    uploaded_by_user_id: number;
    uploaded_at: Date;
    deleted_at: Date | null;
}

export interface TeamAdvisorRow extends RowDataPacket {
    advisor_id: number;
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
    added_by_user_id: number;
    created_at: Date;
    updated_at: Date;
}
