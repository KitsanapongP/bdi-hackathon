import type { RowDataPacket } from 'mysql2/promise';

export type SubmissionTaskType = 'link' | 'file';

export interface SubmissionTaskRow extends RowDataPacket {
    submission_task_id: number;
    task_name: string;
    task_type: SubmissionTaskType;
    is_required: number;
    allowed_extensions: string | null;
    sort_order: number;
    is_enabled: number;
    is_default: number;
    created_by_user_id: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TeamSubmissionTaskRow extends RowDataPacket {
    team_submission_task_id: number;
    team_id: number;
    submission_task_id: number;
    link_url: string | null;
    deadline_at: Date | null;
    is_submission_open: number;
    assigned_by_user_id: number | null;
    assigned_source: 'default' | 'admin_team' | 'admin_status' | 'system_backfill';
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface TeamSubmissionTaskWithMetaRow extends TeamSubmissionTaskRow {
    task_name: string;
    task_type: SubmissionTaskType;
    is_required: number;
    task_is_default: number;
    allowed_extensions: string | null;
    sort_order: number;
    task_is_enabled: number;
}

export interface SubmissionFileRow extends RowDataPacket {
    file_id: number;
    team_id: number;
    team_submission_task_id: number;
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
    added_by_user_id: number;
    created_at: Date;
    updated_at: Date;
}
