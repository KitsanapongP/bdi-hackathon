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
