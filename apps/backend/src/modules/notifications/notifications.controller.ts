import type { FastifyReply, FastifyRequest } from 'fastify';
import { ok } from '../../shared/response.js';
import { AppError } from '../../shared/errors.js';
import * as service from './notifications.service.js';
import {
  adminSendBurstTestEmailSchema,
  adminSendCustomEmailSchema,
  eventCodeSchema,
  notificationRecipientParamSchema,
  updateNotificationRecipientSchema,
  updateNotificationSettingSchema,
} from './notifications.schema.js';
import type { JwtPayload } from '../auth/auth.types.js';

export async function handleGetUserInbox(
  req: FastifyRequest<{ Querystring: { limit?: string } }>,
  reply: FastifyReply,
) {
  const limit = Number(req.query.limit || 50);
  const user = req.user as JwtPayload;

  try {
    const rows = await service.getUserNotificationInbox(req.server.ctx.db, user.userId, limit);
    return reply.send(ok(rows));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleGetUserUnreadCount(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as JwtPayload;

  try {
    const data = await service.getUserNotificationUnreadCount(req.server.ctx.db, user.userId);
    return reply.send(ok(data));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleMarkUserInboxRead(
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

export async function handleMarkAllUserInboxRead(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as JwtPayload;
  await service.markAllInboxAsRead(req.server.ctx.db, user.userId);
  return reply.send(ok(null, 'อ่านข้อความทั้งหมดแล้ว'));
}

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
    return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้' });
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

export async function handleAdminSendCustomEmail(req: FastifyRequest, reply: FastifyReply) {
  const parsed = adminSendCustomEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้' });
  }

  try {
    const user = req.user as JwtPayload;
    const result = await service.sendCustomEmailToTeam(req.server.ctx.db, {
      teamId: parsed.data.teamId,
      subject: parsed.data.subject,
      message: parsed.data.message,
      actorUserId: user.userId,
    });
    return reply.send(ok(result, 'ส่งอีเมลสำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleAdminSendBurstTestEmail(req: FastifyRequest, reply: FastifyReply) {
  const parsed = adminSendBurstTestEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.status(400).send({ ok: false, message: parsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้' });
  }

  try {
    const user = req.user as JwtPayload;
    const result = await service.sendBurstTestEmail(req.server.ctx.db, parsed.data.recipientEmail, user.userId);
    return reply.send(ok(result, 'ส่งอีเมลทดสอบครบ 110 ครั้งแล้ว'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleGetAdminNotificationRecipients(req: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await service.getAdminNotificationRecipients(req.server.ctx.db);
    return reply.send(ok(rows));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}

export async function handleUpdateAdminNotificationRecipient(
  req: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const paramsParsed = notificationRecipientParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return reply.status(400).send({ ok: false, message: paramsParsed.error.issues[0]?.message ?? 'userId ไม่ถูกต้อง' });
  }

  const bodyParsed = updateNotificationRecipientSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return reply.status(400).send({ ok: false, message: bodyParsed.error.issues[0]?.message ?? 'เซิร์ฟเวอร์ไม่สามารถประมวลผลคำขอได้' });
  }

  try {
    const data = await service.updateAdminNotificationRecipient(
      req.server.ctx.db,
      paramsParsed.data.userId,
      bodyParsed.data.enabled,
    );
    return reply.send(ok(data, 'อัปเดตรายชื่อผู้รับแจ้งเตือนสำเร็จ'));
  } catch (err) {
    if (err instanceof AppError) return reply.status(err.statusCode).send({ ok: false, message: err.message });
    throw err;
  }
}
