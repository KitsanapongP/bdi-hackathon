import crypto from 'node:crypto';
import type { DB } from '../../config/db.js';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors.js';
import type {
  ClaimMethod,
  ClaimStatus,
  PrivilegeClaimAdminRow,
  PrivilegeTemplateRow,
} from './privileges.types.js';
import * as repo from './privileges.repo.js';

function toTemplate(row: PrivilegeTemplateRow) {
  return {
    privilegeId: Number(row.privilege_id),
    privilegeCode: row.privilege_code,
    privilegeNameTh: row.privilege_name_th,
    privilegeNameEn: row.privilege_name_en,
    descriptionTh: row.description_th,
    descriptionEn: row.description_en,
    privilegeType: row.privilege_type,
    isActive: row.is_active === 1,
    isPublished: row.is_published === 1,
    sortOrder: Number(row.sort_order),
    createdByUserId: row.created_by_user_id ? Number(row.created_by_user_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function getDisplayName(row: PrivilegeClaimAdminRow): string {
  const fullNameTh = `${row.first_name_th ?? ''} ${row.last_name_th ?? ''}`.trim();
  if (fullNameTh) return fullNameTh;
  const fullNameEn = `${row.first_name_en ?? ''} ${row.last_name_en ?? ''}`.trim();
  return fullNameEn || row.user_name;
}

function toClaim(row: PrivilegeClaimAdminRow) {
  return {
    claimId: Number(row.privilege_claim_id),
    privilegeId: Number(row.privilege_id),
    userId: Number(row.user_id),
    teamId: Number(row.team_id),
    privilegeCode: row.privilege_code,
    privilegeNameTh: row.privilege_name_th,
    privilegeNameEn: row.privilege_name_en,
    privilegeType: row.privilege_type,
    claimStatus: row.claim_status,
    claimMethod: row.claim_method,
    claimNote: row.claim_note,
    qrToken: row.qr_token,
    tokenVersion: Number(row.token_version),
    claimedAt: row.claimed_at,
    claimedByUserId: row.claimed_by_user_id ? Number(row.claimed_by_user_id) : null,
    displayName: getDisplayName(row),
    userName: row.user_name,
    teamCode: row.team_code,
    teamNameTh: row.team_name_th,
    teamNameEn: row.team_name_en,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateClaimToken(): string {
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `GT${random}`;
}

async function assignTemplateToMembers(
  db: DB,
  template: PrivilegeTemplateRow,
  teamId?: number,
): Promise<number> {
  const members = await repo.getConfirmedMembers(db, teamId);
  let assigned = 0;
  for (const member of members) {
    let upserted: { claimId: number; isNew: boolean } | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        upserted = await repo.upsertClaim(db, {
          privilegeId: Number(template.privilege_id),
          userId: Number(member.user_id),
          teamId: Number(member.team_id),
          qrToken: generateClaimToken(),
        });
        break;
      } catch (error: unknown) {
        const dbError = error as { code?: string };
        if (dbError?.code === 'ER_DUP_ENTRY') {
          continue;
        }
        throw error;
      }
    }

    if (!upserted) {
      throw new AppError('ไม่สามารถสร้าง token สำหรับสิทธิ์ได้', 500);
    }

    if (upserted.isNew) {
      assigned += 1;
      await repo.insertClaimLog(db, {
        claimId: upserted.claimId,
        actionCode: 'CLAIM_ASSIGNED',
        actionDetail: JSON.stringify({
          source: teamId ? 'team_confirmed' : 'template_publish',
          privilegeId: Number(template.privilege_id),
        }),
        actorUserId: null,
      });
    }
  }

  return assigned;
}

export async function assignPublishedPrivilegesToTeam(db: DB, teamId: number): Promise<{ assigned: number }> {
  const confirmedTeam = await repo.getConfirmedTeamById(db, teamId);
  if (!confirmedTeam) return { assigned: 0 };

  const templates = await repo.listPublishedActiveTemplates(db);
  let assigned = 0;
  for (const template of templates) {
    assigned += await assignTemplateToMembers(db, template, teamId);
  }

  return { assigned };
}

async function ensureTeamClaimsForPublishedTemplates(db: DB, teamId: number): Promise<void> {
  const templates = await repo.listPublishedActiveTemplates(db);
  for (const template of templates) {
    await assignTemplateToMembers(db, template, teamId);
  }
}

export async function getMyPrivileges(db: DB, userId: number) {
  const team = await repo.getConfirmedTeamByUser(db, userId);
  if (!team) {
    return {
      eligible: false,
      team: null,
      claims: [],
    };
  }

  await ensureTeamClaimsForPublishedTemplates(db, Number(team.team_id));

  const claims = await repo.getClaimsByUserAndTeam(db, userId, Number(team.team_id));
  return {
    eligible: true,
    team: {
      teamId: Number(team.team_id),
      teamCode: team.team_code,
      teamNameTh: team.team_name_th,
      teamNameEn: team.team_name_en,
    },
    claims: claims.map(toClaim),
  };
}

export async function refreshMyClaimToken(db: DB, userId: number, claimId: number) {
  const existing = await repo.getClaimByIdForUser(db, claimId, userId);
  if (!existing) throw new NotFoundError('ไม่พบสิทธิ์นี้');
  if (existing.claim_status !== 'pending') {
    throw new ConflictError('สิทธิ์นี้ถูกรับแล้ว ไม่สามารถรีเฟรช QR ได้');
  }

  let affected = 0;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const newToken = generateClaimToken();
    try {
      affected = await repo.rotateClaimTokenForUser(db, {
        claimId,
        userId,
        newToken,
      });
      if (affected > 0) break;
    } catch (error: unknown) {
      const dbError = error as { code?: string };
      if (dbError?.code === 'ER_DUP_ENTRY') {
        continue;
      }
      throw error;
    }
  }

  if (!affected) {
    throw new ConflictError('ไม่สามารถรีเฟรช QR ได้');
  }

  await repo.insertClaimLog(db, {
    claimId,
    actionCode: 'CLAIM_TOKEN_REFRESHED',
    actionDetail: JSON.stringify({
      fromVersion: Number(existing.token_version),
      toVersion: Number(existing.token_version) + 1,
    }),
    actorUserId: userId,
  });

  const updated = await repo.getClaimByIdForUser(db, claimId, userId);
  if (!updated) throw new NotFoundError('ไม่พบสิทธิ์นี้');
  return toClaim(updated);
}

export async function listAdminTemplates(db: DB) {
  const rows = await repo.listTemplates(db);
  return rows.map(toTemplate);
}

export async function createAdminTemplate(
  db: DB,
  input: {
    privilegeCode: string;
    privilegeNameTh: string;
    privilegeNameEn?: string | null | undefined;
    descriptionTh?: string | null | undefined;
    descriptionEn?: string | null | undefined;
    privilegeType: 'auto_admin' | 'souvenir_qr';
    isActive?: boolean | undefined;
    isPublished?: boolean | undefined;
    sortOrder?: number | undefined;
  },
  actorUserId: number,
) {
  const existing = await repo.getTemplateByCode(db, input.privilegeCode);
  if (existing) throw new ConflictError('privilegeCode ซ้ำในระบบ');

  const templateId = await repo.createTemplate(db, {
    privilegeCode: input.privilegeCode,
    privilegeNameTh: input.privilegeNameTh,
    privilegeNameEn: input.privilegeNameEn ?? null,
    descriptionTh: input.descriptionTh ?? null,
    descriptionEn: input.descriptionEn ?? null,
    privilegeType: input.privilegeType,
    isActive: input.isActive !== false,
    isPublished: input.isPublished === true,
    sortOrder: input.sortOrder ?? 0,
    createdByUserId: actorUserId,
  });

  const created = await repo.getTemplateById(db, templateId);
  if (!created) throw new AppError('สร้างสิทธิประโยชน์ไม่สำเร็จ', 500);

  let assigned = 0;
  if (created.is_active === 1 && created.is_published === 1) {
    assigned = await assignTemplateToMembers(db, created);
  }

  return {
    template: toTemplate(created),
    assigned,
  };
}

export async function updateAdminTemplate(
  db: DB,
  templateId: number,
  patch: {
    privilegeCode?: string | undefined;
    privilegeNameTh?: string | undefined;
    privilegeNameEn?: string | null | undefined;
    descriptionTh?: string | null | undefined;
    descriptionEn?: string | null | undefined;
    privilegeType?: 'auto_admin' | 'souvenir_qr' | undefined;
    isActive?: boolean | undefined;
    isPublished?: boolean | undefined;
    sortOrder?: number | undefined;
  },
) {
  const current = await repo.getTemplateById(db, templateId);
  if (!current) throw new NotFoundError('ไม่พบสิทธิประโยชน์');

  if (patch.privilegeCode && patch.privilegeCode !== current.privilege_code) {
    const duplicate = await repo.getTemplateByCode(db, patch.privilegeCode);
    if (duplicate && Number(duplicate.privilege_id) !== templateId) {
      throw new ConflictError('privilegeCode ซ้ำในระบบ');
    }
  }

  await repo.updateTemplate(db, templateId, patch);
  const updated = await repo.getTemplateById(db, templateId);
  if (!updated) throw new NotFoundError('ไม่พบสิทธิประโยชน์');

  let assigned = 0;
  const justPublished = current.is_published === 0 && updated.is_published === 1 && updated.is_active === 1;
  if (justPublished) {
    assigned = await assignTemplateToMembers(db, updated);
  }

  return {
    template: toTemplate(updated),
    assigned,
  };
}

export async function deleteAdminTemplate(db: DB, templateId: number) {
  const current = await repo.getTemplateById(db, templateId);
  if (!current) throw new NotFoundError('ไม่พบสิทธิประโยชน์');
  await repo.softDeleteTemplate(db, templateId);
  return { success: true };
}

export async function publishAdminTemplate(db: DB, templateId: number, isPublished: boolean) {
  const current = await repo.getTemplateById(db, templateId);
  if (!current) throw new NotFoundError('ไม่พบสิทธิประโยชน์');
  await repo.setTemplatePublished(db, templateId, isPublished);
  const updated = await repo.getTemplateById(db, templateId);
  if (!updated) throw new NotFoundError('ไม่พบสิทธิประโยชน์');

  let assigned = 0;
  if (isPublished && updated.is_active === 1) {
    assigned = await assignTemplateToMembers(db, updated);
  }

  return {
    template: toTemplate(updated),
    assigned,
  };
}

export async function listAdminClaims(
  db: DB,
  query: {
    teamId?: number | undefined;
    privilegeId?: number | undefined;
    claimStatus?: ClaimStatus | undefined;
    q?: string | undefined;
    limit: number;
  },
) {
  const rows = await repo.listClaimsAdmin(db, query);
  return rows.map(toClaim);
}

export async function scanTokenForAdmin(db: DB, token: string) {
  const claim = await repo.getClaimByToken(db, token);
  if (!claim) throw new NotFoundError('ไม่พบสิทธิ์จาก token นี้');
  return toClaim(claim);
}

async function applyClaimStatus(
  db: DB,
  input: {
    claimId: number;
    claimStatus: ClaimStatus;
    claimMethod: ClaimMethod;
    actorUserId: number;
    claimNote: string | null;
    logAction: string;
  },
) {
  const affected = await repo.updateClaimStatusById(db, {
    claimId: input.claimId,
    claimStatus: input.claimStatus,
    claimMethod: input.claimMethod,
    actorUserId: input.actorUserId,
    claimNote: input.claimNote,
  });
  if (!affected) throw new NotFoundError('ไม่พบข้อมูลสิทธิ์ที่ต้องการแก้ไข');

  await repo.insertClaimLog(db, {
    claimId: input.claimId,
    actionCode: input.logAction,
    actionDetail: JSON.stringify({
      claimStatus: input.claimStatus,
      claimMethod: input.claimMethod,
      claimNote: input.claimNote,
    }),
    actorUserId: input.actorUserId,
  });
}

export async function redeemTokenForAdmin(db: DB, token: string, actorUserId: number) {
  const claim = await repo.getClaimByToken(db, token);
  if (!claim) throw new NotFoundError('ไม่พบสิทธิ์จาก token นี้');

  if (claim.claim_status !== 'pending') {
    return {
      alreadyClaimed: true,
      claim: toClaim(claim),
    };
  }

  await applyClaimStatus(db, {
    claimId: Number(claim.privilege_claim_id),
    claimStatus: 'claimed',
    claimMethod: 'qr_scan',
    actorUserId,
    claimNote: null,
    logAction: 'CLAIM_REDEEMED_QR',
  });

  const updated = await repo.getClaimByToken(db, token);
  if (!updated) throw new NotFoundError('ไม่พบสิทธิ์จาก token นี้');

  return {
    alreadyClaimed: false,
    claim: toClaim(updated),
  };
}

export async function updateAdminClaimStatus(
  db: DB,
  claimId: number,
  actorUserId: number,
  payload: { claimStatus: ClaimStatus; claimNote?: string | null | undefined },
) {
  const existing = await repo.getClaimById(db, claimId);
  if (!existing) throw new NotFoundError('ไม่พบข้อมูลสิทธิ์ที่ต้องการแก้ไข');

  await applyClaimStatus(db, {
    claimId,
    claimStatus: payload.claimStatus,
    claimMethod: payload.claimStatus === 'claimed' ? 'admin_manual' : null,
    actorUserId,
    claimNote: payload.claimNote ?? null,
    logAction: payload.claimStatus === 'claimed' ? 'CLAIM_UPDATED_ADMIN' : 'CLAIM_RESET_ADMIN',
  });

  const updated = await repo.getClaimByIdForUser(db, claimId, Number(existing.user_id));
  if (!updated) throw new NotFoundError('ไม่พบข้อมูลสิทธิ์ที่ต้องการแก้ไข');
  return toClaim(updated);
}

export async function applyAdminTeamClaimStatus(
  db: DB,
  params: { teamId: number; privilegeId: number },
  actorUserId: number,
  payload: { claimStatus: ClaimStatus; claimNote?: string | null | undefined },
) {
  const team = await repo.getConfirmedTeamById(db, params.teamId);
  if (!team) throw new NotFoundError('ไม่พบทีมที่ยืนยันเข้าร่วมแล้ว');

  const template = await repo.getTemplateById(db, params.privilegeId);
  if (!template) throw new NotFoundError('ไม่พบสิทธิประโยชน์');

  await assignTemplateToMembers(db, template, params.teamId);

  const claimIds = await repo.listClaimIdsByTeamPrivilege(db, params.teamId, params.privilegeId);
  if (!claimIds.length) {
    throw new NotFoundError('ไม่พบข้อมูลสิทธิ์ของทีมนี้');
  }

  const changed = await repo.bulkUpdateTeamPrivilegeStatus(db, {
    teamId: params.teamId,
    privilegeId: params.privilegeId,
    claimStatus: payload.claimStatus,
    claimMethod: payload.claimStatus === 'claimed' ? 'team_bulk' : null,
    actorUserId,
    claimNote: payload.claimNote ?? null,
  });

  for (const claimId of claimIds) {
    await repo.insertClaimLog(db, {
      claimId,
      actionCode: payload.claimStatus === 'claimed' ? 'CLAIM_TEAM_BULK_CLAIMED' : 'CLAIM_TEAM_BULK_RESET',
      actionDetail: JSON.stringify({
        claimStatus: payload.claimStatus,
        claimNote: payload.claimNote ?? null,
      }),
      actorUserId,
    });
  }

  return {
    changed,
    totalClaims: claimIds.length,
  };
}
