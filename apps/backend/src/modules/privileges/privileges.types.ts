import type { RowDataPacket } from 'mysql2/promise';

export type PrivilegeType = 'auto_admin' | 'souvenir_qr';
export type ClaimStatus = 'pending' | 'claimed';
export type ClaimMethod = 'qr_scan' | 'admin_manual' | 'team_bulk' | null;

export interface PrivilegeTemplateRow extends RowDataPacket {
  privilege_id: number;
  privilege_code: string;
  privilege_name_th: string;
  privilege_name_en: string | null;
  description_th: string | null;
  description_en: string | null;
  privilege_type: PrivilegeType;
  is_active: number;
  is_published: number;
  sort_order: number;
  created_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PrivilegeClaimRow extends RowDataPacket {
  privilege_claim_id: number;
  privilege_id: number;
  user_id: number;
  team_id: number;
  qr_token: string;
  token_version: number;
  claim_status: ClaimStatus;
  claim_method: ClaimMethod;
  claimed_at: Date | null;
  claimed_by_user_id: number | null;
  claim_note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PrivilegeClaimAdminRow extends PrivilegeClaimRow {
  privilege_code: string;
  privilege_name_th: string;
  privilege_name_en: string | null;
  privilege_type: PrivilegeType;
  user_name: string;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  team_code: string;
  team_name_th: string;
  team_name_en: string;
}

export interface ConfirmedMemberRow extends RowDataPacket {
  user_id: number;
  user_name: string;
  first_name_th: string | null;
  last_name_th: string | null;
  first_name_en: string | null;
  last_name_en: string | null;
  team_id: number;
  team_code: string;
  team_name_th: string;
  team_name_en: string;
}

export interface ConfirmedTeamRow extends RowDataPacket {
  team_id: number;
  team_code: string;
  team_name_th: string;
  team_name_en: string;
}
