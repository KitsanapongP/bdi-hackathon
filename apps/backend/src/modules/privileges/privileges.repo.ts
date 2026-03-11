import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DB } from '../../config/db.js';
import type {
  ClaimMethod,
  ClaimStatus,
  ConfirmedMemberRow,
  ConfirmedTeamRow,
  PrivilegeClaimAdminRow,
  PrivilegeClaimRow,
  PrivilegeTemplateRow,
  PrivilegeType,
} from './privileges.types.js';

export async function listTemplates(db: DB): Promise<PrivilegeTemplateRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT *
    FROM privileges
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, privilege_id ASC
  `);
  return rows as PrivilegeTemplateRow[];
}

export async function getTemplateById(db: DB, templateId: number): Promise<PrivilegeTemplateRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT *
    FROM privileges
    WHERE privilege_id = :templateId
      AND deleted_at IS NULL
    LIMIT 1
  `, { templateId });
  return (rows[0] as PrivilegeTemplateRow | undefined) ?? null;
}

export async function getTemplateByCode(db: DB, privilegeCode: string): Promise<PrivilegeTemplateRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT *
    FROM privileges
    WHERE privilege_code = :privilegeCode
      AND deleted_at IS NULL
    LIMIT 1
  `, { privilegeCode });
  return (rows[0] as PrivilegeTemplateRow | undefined) ?? null;
}

export async function createTemplate(
  db: DB,
  data: {
    privilegeCode: string;
    privilegeNameTh: string;
    privilegeNameEn: string | null;
    descriptionTh: string | null;
    descriptionEn: string | null;
    privilegeType: PrivilegeType;
    isActive: boolean;
    isPublished: boolean;
    sortOrder: number;
    createdByUserId: number;
  },
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(`
    INSERT INTO privileges (
      privilege_code,
      privilege_name_th,
      privilege_name_en,
      description_th,
      description_en,
      privilege_type,
      is_active,
      is_published,
      sort_order,
      created_by_user_id,
      created_at,
      updated_at
    ) VALUES (
      :privilegeCode,
      :privilegeNameTh,
      :privilegeNameEn,
      :descriptionTh,
      :descriptionEn,
      :privilegeType,
      :isActive,
      :isPublished,
      :sortOrder,
      :createdByUserId,
      NOW(),
      NOW()
    )
  `, {
    privilegeCode: data.privilegeCode,
    privilegeNameTh: data.privilegeNameTh,
    privilegeNameEn: data.privilegeNameEn,
    descriptionTh: data.descriptionTh,
    descriptionEn: data.descriptionEn,
    privilegeType: data.privilegeType,
    isActive: data.isActive ? 1 : 0,
    isPublished: data.isPublished ? 1 : 0,
    sortOrder: data.sortOrder,
    createdByUserId: data.createdByUserId,
  });
  return result.insertId;
}

export async function updateTemplate(
  db: DB,
  templateId: number,
  patch: {
    privilegeCode?: string | undefined;
    privilegeNameTh?: string | undefined;
    privilegeNameEn?: string | null | undefined;
    descriptionTh?: string | null | undefined;
    descriptionEn?: string | null | undefined;
    privilegeType?: PrivilegeType | undefined;
    isActive?: boolean | undefined;
    isPublished?: boolean | undefined;
    sortOrder?: number | undefined;
  },
): Promise<void> {
  const updates: string[] = [];
  const params: Record<string, unknown> = { templateId };

  if (patch.privilegeCode !== undefined) {
    updates.push('privilege_code = :privilegeCode');
    params.privilegeCode = patch.privilegeCode;
  }
  if (patch.privilegeNameTh !== undefined) {
    updates.push('privilege_name_th = :privilegeNameTh');
    params.privilegeNameTh = patch.privilegeNameTh;
  }
  if (patch.privilegeNameEn !== undefined) {
    updates.push('privilege_name_en = :privilegeNameEn');
    params.privilegeNameEn = patch.privilegeNameEn;
  }
  if (patch.descriptionTh !== undefined) {
    updates.push('description_th = :descriptionTh');
    params.descriptionTh = patch.descriptionTh;
  }
  if (patch.descriptionEn !== undefined) {
    updates.push('description_en = :descriptionEn');
    params.descriptionEn = patch.descriptionEn;
  }
  if (patch.privilegeType !== undefined) {
    updates.push('privilege_type = :privilegeType');
    params.privilegeType = patch.privilegeType;
  }
  if (patch.isActive !== undefined) {
    updates.push('is_active = :isActive');
    params.isActive = patch.isActive ? 1 : 0;
  }
  if (patch.isPublished !== undefined) {
    updates.push('is_published = :isPublished');
    params.isPublished = patch.isPublished ? 1 : 0;
  }
  if (patch.sortOrder !== undefined) {
    updates.push('sort_order = :sortOrder');
    params.sortOrder = patch.sortOrder;
  }

  if (!updates.length) return;

  await db.query(`
    UPDATE privileges
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE privilege_id = :templateId
      AND deleted_at IS NULL
  `, params);
}

export async function softDeleteTemplate(db: DB, templateId: number): Promise<void> {
  await db.query(`
    UPDATE privileges
    SET is_active = 0,
        is_published = 0,
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE privilege_id = :templateId
      AND deleted_at IS NULL
  `, { templateId });
}

export async function setTemplatePublished(db: DB, templateId: number, isPublished: boolean): Promise<void> {
  await db.query(`
    UPDATE privileges
    SET is_published = :isPublished,
        updated_at = NOW()
    WHERE privilege_id = :templateId
      AND deleted_at IS NULL
  `, {
    templateId,
    isPublished: isPublished ? 1 : 0,
  });
}

export async function listPublishedActiveTemplates(db: DB): Promise<PrivilegeTemplateRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT *
    FROM privileges
    WHERE deleted_at IS NULL
      AND is_active = 1
      AND is_published = 1
    ORDER BY sort_order ASC, privilege_id ASC
  `);
  return rows as PrivilegeTemplateRow[];
}

export async function getConfirmedMembers(db: DB, teamId?: number): Promise<ConfirmedMemberRow[]> {
  const params: Record<string, unknown> = {};
  const byTeam = typeof teamId === 'number' ? ' AND t.team_id = :teamId' : '';
  if (typeof teamId === 'number') params.teamId = teamId;

  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      u.user_id,
      u.user_name,
      u.first_name_th,
      u.last_name_th,
      u.first_name_en,
      u.last_name_en,
      t.team_id,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM team_members m
    JOIN team_teams t
      ON t.team_id = m.team_id
    JOIN user_users u
      ON u.user_id = m.user_id
    WHERE m.member_status = 'active'
      AND t.status = 'confirmed'
      AND t.deleted_at IS NULL
      AND u.is_active = 1
      AND u.deleted_at IS NULL
      ${byTeam}
    ORDER BY t.team_id ASC, m.role DESC, m.team_member_id ASC
  `, params);
  return rows as ConfirmedMemberRow[];
}

export async function getConfirmedTeamByUser(db: DB, userId: number): Promise<ConfirmedTeamRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      t.team_id,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM team_members m
    JOIN team_teams t
      ON t.team_id = m.team_id
    WHERE m.user_id = :userId
      AND m.member_status = 'active'
      AND t.status = 'confirmed'
      AND t.deleted_at IS NULL
    LIMIT 1
  `, { userId });
  return (rows[0] as ConfirmedTeamRow | undefined) ?? null;
}

export async function getConfirmedTeamById(db: DB, teamId: number): Promise<ConfirmedTeamRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      t.team_id,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM team_teams t
    WHERE t.team_id = :teamId
      AND t.status = 'confirmed'
      AND t.deleted_at IS NULL
    LIMIT 1
  `, { teamId });
  return (rows[0] as ConfirmedTeamRow | undefined) ?? null;
}

export async function upsertClaim(
  db: DB,
  data: {
    privilegeId: number;
    userId: number;
    teamId: number;
    qrToken: string;
  },
): Promise<{ claimId: number; isNew: boolean }> {
  const [result] = await db.query<ResultSetHeader>(`
    INSERT INTO user_privilege_claims (
      privilege_id,
      user_id,
      team_id,
      qr_token,
      token_version,
      claim_status,
      created_at,
      updated_at
    ) VALUES (
      :privilegeId,
      :userId,
      :teamId,
      :qrToken,
      1,
      'pending',
      NOW(),
      NOW()
    )
    ON DUPLICATE KEY UPDATE
      privilege_claim_id = LAST_INSERT_ID(privilege_claim_id),
      team_id = VALUES(team_id),
      updated_at = NOW()
  `, data);

  return {
    claimId: result.insertId,
    isNew: result.affectedRows === 1,
  };
}

export async function getClaimById(db: DB, claimId: number): Promise<PrivilegeClaimRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT *
    FROM user_privilege_claims
    WHERE privilege_claim_id = :claimId
    LIMIT 1
  `, { claimId });
  return (rows[0] as PrivilegeClaimRow | undefined) ?? null;
}

export async function getClaimByIdForUser(
  db: DB,
  claimId: number,
  userId: number,
): Promise<PrivilegeClaimAdminRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      c.*,
      p.privilege_code,
      p.privilege_name_th,
      p.privilege_name_en,
      p.privilege_type,
      u.user_name,
      u.first_name_th,
      u.last_name_th,
      u.first_name_en,
      u.last_name_en,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM user_privilege_claims c
    JOIN privileges p ON p.privilege_id = c.privilege_id
    JOIN user_users u ON u.user_id = c.user_id
    JOIN team_teams t ON t.team_id = c.team_id
    WHERE c.privilege_claim_id = :claimId
      AND c.user_id = :userId
      AND p.deleted_at IS NULL
    LIMIT 1
  `, { claimId, userId });
  return (rows[0] as PrivilegeClaimAdminRow | undefined) ?? null;
}

export async function rotateClaimTokenForUser(
  db: DB,
  data: {
    claimId: number;
    userId: number;
    newToken: string;
  },
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(`
    UPDATE user_privilege_claims
    SET qr_token = :newToken,
        token_version = token_version + 1,
        updated_at = NOW()
    WHERE privilege_claim_id = :claimId
      AND user_id = :userId
      AND claim_status = 'pending'
  `, {
    claimId: data.claimId,
    userId: data.userId,
    newToken: data.newToken,
  });

  return result.affectedRows;
}

export async function getClaimsByUserAndTeam(db: DB, userId: number, teamId: number): Promise<PrivilegeClaimAdminRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      c.*,
      p.privilege_code,
      p.privilege_name_th,
      p.privilege_name_en,
      p.privilege_type,
      u.user_name,
      u.first_name_th,
      u.last_name_th,
      u.first_name_en,
      u.last_name_en,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM user_privilege_claims c
    JOIN privileges p ON p.privilege_id = c.privilege_id
    JOIN user_users u ON u.user_id = c.user_id
    JOIN team_teams t ON t.team_id = c.team_id
    WHERE c.user_id = :userId
      AND c.team_id = :teamId
      AND p.deleted_at IS NULL
      AND p.is_active = 1
      AND p.is_published = 1
    ORDER BY p.sort_order ASC, p.privilege_id ASC
  `, { userId, teamId });
  return rows as PrivilegeClaimAdminRow[];
}

export async function getClaimByToken(db: DB, qrToken: string): Promise<PrivilegeClaimAdminRow | null> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      c.*,
      p.privilege_code,
      p.privilege_name_th,
      p.privilege_name_en,
      p.privilege_type,
      u.user_name,
      u.first_name_th,
      u.last_name_th,
      u.first_name_en,
      u.last_name_en,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM user_privilege_claims c
    JOIN privileges p ON p.privilege_id = c.privilege_id
    JOIN user_users u ON u.user_id = c.user_id
    JOIN team_teams t ON t.team_id = c.team_id
    WHERE c.qr_token = :qrToken
      AND p.deleted_at IS NULL
    LIMIT 1
  `, { qrToken });
  return (rows[0] as PrivilegeClaimAdminRow | undefined) ?? null;
}

export async function markClaimAsClaimedByToken(
  db: DB,
  qrToken: string,
  claimedByUserId: number,
): Promise<number> {
  const [result] = await db.query<ResultSetHeader>(`
    UPDATE user_privilege_claims
    SET claim_status = 'claimed',
        claim_method = 'qr_scan',
        claimed_at = NOW(),
        claimed_by_user_id = :claimedByUserId,
        updated_at = NOW()
    WHERE qr_token = :qrToken
      AND claim_status = 'pending'
  `, {
    qrToken,
    claimedByUserId,
  });
  return result.affectedRows;
}

export async function updateClaimStatusById(
  db: DB,
  data: {
    claimId: number;
    claimStatus: ClaimStatus;
    claimMethod: ClaimMethod;
    actorUserId: number | null;
    claimNote: string | null;
  },
): Promise<number> {
  if (data.claimStatus === 'claimed') {
    const [result] = await db.query<ResultSetHeader>(`
      UPDATE user_privilege_claims
      SET claim_status = 'claimed',
          claim_method = :claimMethod,
          claimed_at = IF(claim_status = 'claimed', claimed_at, NOW()),
          claimed_by_user_id = :actorUserId,
          claim_note = :claimNote,
          updated_at = NOW()
      WHERE privilege_claim_id = :claimId
    `, {
      claimId: data.claimId,
      claimMethod: data.claimMethod,
      actorUserId: data.actorUserId,
      claimNote: data.claimNote,
    });
    return result.affectedRows;
  }

  const [result] = await db.query<ResultSetHeader>(`
    UPDATE user_privilege_claims
    SET claim_status = 'pending',
        claim_method = NULL,
        claimed_at = NULL,
        claimed_by_user_id = NULL,
        claim_note = :claimNote,
        updated_at = NOW()
    WHERE privilege_claim_id = :claimId
  `, {
    claimId: data.claimId,
    claimNote: data.claimNote,
  });
  return result.affectedRows;
}

export async function listClaimsAdmin(
  db: DB,
  query: {
    teamId?: number | undefined;
    privilegeId?: number | undefined;
    claimStatus?: ClaimStatus | undefined;
    q?: string | undefined;
    limit: number;
  },
): Promise<PrivilegeClaimAdminRow[]> {
  let sql = `
    SELECT
      c.*,
      p.privilege_code,
      p.privilege_name_th,
      p.privilege_name_en,
      p.privilege_type,
      u.user_name,
      u.first_name_th,
      u.last_name_th,
      u.first_name_en,
      u.last_name_en,
      t.team_code,
      t.team_name_th,
      t.team_name_en
    FROM user_privilege_claims c
    JOIN privileges p ON p.privilege_id = c.privilege_id
    JOIN user_users u ON u.user_id = c.user_id
    JOIN team_teams t ON t.team_id = c.team_id
    WHERE p.deleted_at IS NULL
  `;

  const params: Record<string, unknown> = {
    limit: query.limit,
  };

  if (query.teamId) {
    sql += ' AND c.team_id = :teamId';
    params.teamId = query.teamId;
  }
  if (query.privilegeId) {
    sql += ' AND c.privilege_id = :privilegeId';
    params.privilegeId = query.privilegeId;
  }
  if (query.claimStatus) {
    sql += ' AND c.claim_status = :claimStatus';
    params.claimStatus = query.claimStatus;
  }
  if (query.q && query.q.trim()) {
    sql += `
      AND (
        u.user_name LIKE :q
        OR t.team_code LIKE :q
        OR t.team_name_th LIKE :q
        OR t.team_name_en LIKE :q
        OR p.privilege_code LIKE :q
        OR p.privilege_name_th LIKE :q
        OR p.privilege_name_en LIKE :q
      )
    `;
    params.q = `%${query.q.trim()}%`;
  }

  sql += ' ORDER BY c.updated_at DESC, c.privilege_claim_id DESC LIMIT :limit';

  const [rows] = await db.query<RowDataPacket[]>(sql, params);
  return rows as PrivilegeClaimAdminRow[];
}

export async function listClaimIdsByTeamPrivilege(db: DB, teamId: number, privilegeId: number): Promise<number[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT privilege_claim_id
    FROM user_privilege_claims
    WHERE team_id = :teamId
      AND privilege_id = :privilegeId
    ORDER BY privilege_claim_id ASC
  `, {
    teamId,
    privilegeId,
  });

  return rows.map((row) => Number((row as { privilege_claim_id: number }).privilege_claim_id));
}

export async function bulkUpdateTeamPrivilegeStatus(
  db: DB,
  data: {
    teamId: number;
    privilegeId: number;
    claimStatus: ClaimStatus;
    claimMethod: ClaimMethod;
    actorUserId: number | null;
    claimNote: string | null;
  },
): Promise<number> {
  if (data.claimStatus === 'claimed') {
    const [result] = await db.query<ResultSetHeader>(`
      UPDATE user_privilege_claims
      SET claim_status = 'claimed',
          claim_method = :claimMethod,
          claimed_at = IF(claim_status = 'claimed', claimed_at, NOW()),
          claimed_by_user_id = :actorUserId,
          claim_note = :claimNote,
          updated_at = NOW()
      WHERE team_id = :teamId
        AND privilege_id = :privilegeId
    `, {
      teamId: data.teamId,
      privilegeId: data.privilegeId,
      claimMethod: data.claimMethod,
      actorUserId: data.actorUserId,
      claimNote: data.claimNote,
    });
    return result.affectedRows;
  }

  const [result] = await db.query<ResultSetHeader>(`
    UPDATE user_privilege_claims
    SET claim_status = 'pending',
        claim_method = NULL,
        claimed_at = NULL,
        claimed_by_user_id = NULL,
        claim_note = :claimNote,
        updated_at = NOW()
    WHERE team_id = :teamId
      AND privilege_id = :privilegeId
  `, {
    teamId: data.teamId,
    privilegeId: data.privilegeId,
    claimNote: data.claimNote,
  });
  return result.affectedRows;
}

export async function insertClaimLog(
  db: DB,
  data: {
    claimId: number;
    actionCode: string;
    actionDetail: string | null;
    actorUserId: number | null;
  },
): Promise<void> {
  await db.query(`
    INSERT INTO user_privilege_claim_logs (
      privilege_claim_id,
      action_code,
      action_detail,
      actor_user_id,
      created_at
    ) VALUES (
      :claimId,
      :actionCode,
      :actionDetail,
      :actorUserId,
      NOW()
    )
  `, {
    claimId: data.claimId,
    actionCode: data.actionCode,
    actionDetail: data.actionDetail,
    actorUserId: data.actorUserId,
  });
}
