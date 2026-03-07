import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import * as service from './notifications.service.js';
import { eventCodeSchema, updateNotificationSettingSchema, updateTemplateSchema } from './notifications.schema.js';
import type { JwtPayload } from '../auth/auth.types.js';

export async function handleGetNotificationSettings(req: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await service.getAdminNotificationSettings(req.server.ctx.db);
    return reply.send(ok(rows));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdateNotificationSetting(
  req: FastifyRequest<{ Params: { eventCode: string } }>,
  reply: FastifyReply,
) {
  const eventParsed = eventCodeSchema.safeParse(req.params.eventCode);
  if (!eventParsed.success) {
    return reply.status(400).send({ ok: false, message: 'eventCode ไม่ถูกต้อง' });
  }

  const parsed = updateNotificationSettingSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
  }

  try {
    const user = req.user as JwtPayload;
    const data = await service.updateAdminNotificationSetting(req.server.ctx.db, eventParsed.data, parsed.data, user.userId);
    return reply.send(ok(data, 'อัปเดตการตั้งค่าแจ้งเตือนสำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleGetNotificationTemplates(req: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await service.getAdminNotificationTemplates(req.server.ctx.db);
    return reply.send(ok(rows));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdateNotificationTemplate(
  req: FastifyRequest<{ Params: { templateCode: string } }>,
  reply: FastifyReply,
) {
  const templateCode = String(req.params.templateCode || '').trim();
  if (!templateCode) {
    return reply.status(400).send({ ok: false, message: 'templateCode ไม่ถูกต้อง' });
  }

  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' });
  }

  try {
    const data = await service.updateAdminNotificationTemplate(req.server.ctx.db, templateCode, parsed.data);
    return reply.send(ok(data, 'อัปเดต template สำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleGetTeamInbox(
  req: FastifyRequest<{ Params: { teamId: string }; Querystring: { limit?: string } }>,
  reply: FastifyReply,
) {
  const teamId = Number(req.params.teamId);
  if (!Number.isFinite(teamId)) {
    return reply.status(400).send({ ok: false, message: 'teamId ไม่ถูกต้อง' });
  }

  const limit = Number(req.query.limit || 50);
  const user = req.user as JwtPayload;

  try {
    const rows = await service.getTeamNotificationInbox(req.server.ctx.db, teamId, user.userId, limit);
    return reply.send(ok(rows));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleMarkTeamInboxRead(
  req: FastifyRequest<{ Params: { notificationLogId: string } }>,
  reply: FastifyReply,
) {
  const notificationLogId = Number(req.params.notificationLogId);
  if (!Number.isFinite(notificationLogId)) {
    return reply.status(400).send({ ok: false, message: 'notificationLogId ไม่ถูกต้อง' });
  }

  const user = req.user as JwtPayload;
  await service.markInboxAsRead(req.server.ctx.db, notificationLogId, user.userId);
  return reply.send(ok(null, 'อ่านข้อความแล้ว'));
}
