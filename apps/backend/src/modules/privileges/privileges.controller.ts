import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors.js';
import { ok } from '../../shared/response.js';
import type { JwtPayload } from '../auth/auth.types.js';
import {
  applyTeamClaimSchema,
  claimIdParamSchema,
  createTemplateSchema,
  listClaimsQuerySchema,
  publishTemplateSchema,
  scanTokenSchema,
  teamPrivilegeParamSchema,
  templateIdParamSchema,
  updateClaimSchema,
  updateTemplateSchema,
} from './privileges.schema.js';
import * as service from './privileges.service.js';

function getUserId(req: FastifyRequest): number {
  return (req.user as JwtPayload).userId;
}

function getValidationError(parsed: { error?: { issues?: Array<{ message?: string }> } }): string {
  return parsed.error?.issues?.[0]?.message ?? 'ข้อมูลไม่ถูกต้อง';
}

export async function handleGetMyPrivileges(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await service.getMyPrivileges(req.server.ctx.db, getUserId(req));
    return reply.send(ok(data));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleRefreshMyClaimToken(
  req: FastifyRequest<{ Params: { claimId: string } }>,
  reply: FastifyReply,
) {
  const parsed = claimIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(parsed) });
  }

  try {
    const data = await service.refreshMyClaimToken(req.server.ctx.db, getUserId(req), parsed.data.claimId);
    return reply.send(ok(data, 'รีเฟรช QR สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleListAdminTemplates(req: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await service.listAdminTemplates(req.server.ctx.db);
    return reply.send(ok(data));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleCreateAdminTemplate(req: FastifyRequest, reply: FastifyReply) {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(parsed) });
  }

  try {
    const data = await service.createAdminTemplate(req.server.ctx.db, parsed.data, getUserId(req));
    return reply.status(201).send(ok(data, 'สร้างสิทธิประโยชน์สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdateAdminTemplate(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const idParsed = templateIdParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(idParsed) });
  }

  const bodyParsed = updateTemplateSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(bodyParsed) });
  }

  try {
    const data = await service.updateAdminTemplate(req.server.ctx.db, idParsed.data.id, bodyParsed.data);
    return reply.send(ok(data, 'อัปเดตสิทธิประโยชน์สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleDeleteAdminTemplate(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const idParsed = templateIdParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(idParsed) });
  }

  try {
    const data = await service.deleteAdminTemplate(req.server.ctx.db, idParsed.data.id);
    return reply.send(ok(data, 'ลบสิทธิประโยชน์สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handlePublishAdminTemplate(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const idParsed = templateIdParamSchema.safeParse(req.params);
  if (!idParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(idParsed) });
  }

  const bodyParsed = publishTemplateSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(bodyParsed) });
  }

  const { isPublished } = bodyParsed.data;

  try {
    const data = await service.publishAdminTemplate(req.server.ctx.db, idParsed.data.id, isPublished);
    return reply.send(ok(data, isPublished ? 'เผยแพร่สิทธิประโยชน์สำเร็จ' : 'ยกเลิกการเผยแพร่สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleListAdminClaims(req: FastifyRequest, reply: FastifyReply) {
  const parsed = listClaimsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(parsed) });
  }

  try {
    const data = await service.listAdminClaims(req.server.ctx.db, parsed.data);
    return reply.send(ok(data));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleAdminScanToken(req: FastifyRequest, reply: FastifyReply) {
  const parsed = scanTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(parsed) });
  }

  try {
    const data = await service.scanTokenForAdmin(req.server.ctx.db, parsed.data.token);
    return reply.send(ok(data));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleAdminRedeemToken(req: FastifyRequest, reply: FastifyReply) {
  const parsed = scanTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(parsed) });
  }

  try {
    const data = await service.redeemTokenForAdmin(req.server.ctx.db, parsed.data.token, getUserId(req));
    return reply.send(ok(data, data.alreadyClaimed ? 'สิทธิ์นี้ถูกรับแล้ว' : 'รับสิทธิ์สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdateAdminClaim(
  req: FastifyRequest<{ Params: { claimId: string } }>,
  reply: FastifyReply,
) {
  const paramsParsed = claimIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(paramsParsed) });
  }

  const bodyParsed = updateClaimSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(bodyParsed) });
  }

  try {
    const data = await service.updateAdminClaimStatus(
      req.server.ctx.db,
      paramsParsed.data.claimId,
      getUserId(req),
      bodyParsed.data,
    );
    return reply.send(ok(data, 'อัปเดตสถานะสิทธิ์สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleApplyTeamClaim(
  req: FastifyRequest<{ Params: { teamId: string; privilegeId: string } }>,
  reply: FastifyReply,
) {
  const paramsParsed = teamPrivilegeParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(paramsParsed) });
  }

  const bodyParsed = applyTeamClaimSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return reply.status(400).send({ ok: false, message: getValidationError(bodyParsed) });
  }

  try {
    const data = await service.applyAdminTeamClaimStatus(
      req.server.ctx.db,
      paramsParsed.data,
      getUserId(req),
      bodyParsed.data,
    );
    return reply.send(ok(data, 'อัปเดตสถานะสิทธิ์รายทีมสำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}
