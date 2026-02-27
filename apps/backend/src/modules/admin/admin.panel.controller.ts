import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { JwtPayload } from '../auth/auth.types.js';

function getUserId(req: FastifyRequest): number {
  return (req.user as JwtPayload).userId;
}

export async function handleAdminAccess(req: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(req);
  const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(
    `SELECT 1 FROM access_allowlist WHERE user_id = :userId AND access_role = 'admin' AND is_active = 1 LIMIT 1`,
    { userId },
  );
  return reply.send({ isAdmin: rows.length > 0 });
}

export async function handleUploadFile(req: FastifyRequest, reply: FastifyReply) {
  const contentType = req.headers['content-type'] || '';
  if (!String(contentType).includes('application/octet-stream')) {
    return reply.status(400).send({ ok: false, message: 'รองรับเฉพาะ application/octet-stream ใน environment นี้' });
  }

  const originalName = String((req.query as any)?.originalName || req.headers['x-file-name'] || 'upload.bin');
  const mimeType = String(req.headers['x-file-type'] || 'application/octet-stream');
  const buffer = await req.rawToBuffer();
  const storedName = `${Date.now()}-${crypto.randomUUID()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = path.join(process.cwd(), 'public', 'uploads');
  mkdirSync(storagePath, { recursive: true });
  const absolutePath = path.join(storagePath, storedName);
  writeFileSync(absolutePath, buffer);

  const [result] = await req.server.ctx.db.query<ResultSetHeader>(
    `INSERT INTO files (original_name, stored_name, mime_type, size_bytes, storage_path, created_at)
     VALUES (:originalName, :storedName, :mimeType, :sizeBytes, :storagePath, NOW())`,
    { originalName, storedName, mimeType, sizeBytes: buffer.byteLength, storagePath: absolutePath },
  );

  const teamId = Number((req.query as any)?.teamId || req.headers['x-team-id'] || 0);
  const userId = getUserId(req);
  if (teamId > 0) {
    await req.server.ctx.db.query(
      `UPDATE team_fix_items SET status='resolved', resolved_at=NOW(), resolved_by_user_id=:userId
       WHERE team_id=:teamId AND member_user_id=:userId AND status='open' AND rejected_at < NOW()`,
      { teamId, userId },
    );
  }

  return reply.status(201).send({ ok: true, data: { fileId: result.insertId, originalName, mimeType, sizeBytes: buffer.byteLength } });
}

export async function handleReadFile(req: FastifyRequest<{ Params: { fileId: string } }>, reply: FastifyReply) {
  const fileId = Number(req.params.fileId);
  const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM files WHERE file_id = :fileId LIMIT 1`, { fileId });
  const file = rows[0] as any;
  if (!file || !existsSync(file.storage_path)) {
    return reply.status(404).send({ ok: false, message: 'ไม่พบไฟล์' });
  }
  reply.type(file.mime_type || 'application/octet-stream');
  return reply.send(createReadStream(file.storage_path));
}

async function listTable(req: FastifyRequest, table: string, orderBy = 'updated_at DESC') {
  const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
  return rows;
}

export const handleGetSponsors = (req: FastifyRequest, reply: FastifyReply) => listTable(req, 'static_sponsors', 'sort_order ASC, sponsor_id ASC').then((rows) => reply.send({ ok: true, data: rows }));
export const handleGetRewards = (req: FastifyRequest, reply: FastifyReply) => listTable(req, 'static_rewards', 'rank_order ASC, reward_id ASC').then((rows) => reply.send({ ok: true, data: rows }));
export const handleGetAbout = (req: FastifyRequest, reply: FastifyReply) => listTable(req, 'static_abouts', 'about_id DESC').then((rows) => reply.send({ ok: true, data: rows }));
export const handleGetContacts = (req: FastifyRequest, reply: FastifyReply) => listTable(req, 'static_contacts', 'sort_order ASC, contact_id ASC').then((rows) => reply.send({ ok: true, data: rows }));
export const handleGetWinners = (req: FastifyRequest, reply: FastifyReply) => listTable(req, 'static_winners', 'sort_order ASC, winner_id ASC').then((rows) => reply.send({ ok: true, data: rows }));

async function createItem(req: FastifyRequest, reply: FastifyReply, table: string) {
  const body = req.body as Record<string, any>;
  const keys = Object.keys(body);
  if (!keys.length) return reply.status(400).send({ ok: false, message: 'missing body' });
  const sql = `INSERT INTO ${table} (${keys.join(',')}, created_at, updated_at) VALUES (${keys.map((k) => `:${k}`).join(',')}, NOW(), NOW())`;
  const [result] = await req.server.ctx.db.query<ResultSetHeader>(sql, body);
  reply.status(201).send({ ok: true, data: { id: result.insertId } });
}

async function updateItem(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply, table: string, idCol: string) {
  const id = Number(req.params.id);
  const body = req.body as Record<string, any>;
  const keys = Object.keys(body);
  if (!keys.length) return reply.status(400).send({ ok: false, message: 'missing body' });
  const setSql = `${keys.map((k) => `${k} = :${k}`).join(', ')}, updated_at = NOW()`;
  await req.server.ctx.db.query(`UPDATE ${table} SET ${setSql} WHERE ${idCol} = :id`, { ...body, id });
  reply.send({ ok: true });
}

async function deleteItem(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply, table: string, idCol: string) {
  const id = Number(req.params.id);
  await req.server.ctx.db.query(`UPDATE ${table} SET is_active = 0, updated_at = NOW() WHERE ${idCol} = :id`, { id });
  reply.send({ ok: true });
}

export const handleCreateSponsor = (req: FastifyRequest, reply: FastifyReply) => createItem(req, reply, 'static_sponsors');
export const handleUpdateSponsor = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => updateItem(req, reply, 'static_sponsors', 'sponsor_id');
export const handleDeleteSponsor = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => deleteItem(req, reply, 'static_sponsors', 'sponsor_id');

export const handleCreateReward = (req: FastifyRequest, reply: FastifyReply) => createItem(req, reply, 'static_rewards');
export const handleUpdateReward = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => updateItem(req, reply, 'static_rewards', 'reward_id');
export const handleDeleteReward = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => deleteItem(req, reply, 'static_rewards', 'reward_id');

export const handleUpdateAbout = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => updateItem(req, reply, 'static_abouts', 'about_id');

export const handleCreateContact = (req: FastifyRequest, reply: FastifyReply) => createItem(req, reply, 'static_contacts');
export const handleUpdateContact = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => updateItem(req, reply, 'static_contacts', 'contact_id');
export const handleDeleteContact = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => deleteItem(req, reply, 'static_contacts', 'contact_id');

export const handleCreateWinner = (req: FastifyRequest, reply: FastifyReply) => createItem(req, reply, 'static_winners');
export const handleUpdateWinner = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => updateItem(req, reply, 'static_winners', 'winner_id');
export const handleDeleteWinner = (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => deleteItem(req, reply, 'static_winners', 'winner_id');

export async function handlePublishWinner(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await req.server.ctx.db.query(`UPDATE static_winners SET is_published = 1, updated_at = NOW() WHERE winner_id = :id`, { id: Number(req.params.id) });
  return reply.send({ ok: true });
}
export async function handleUnpublishWinner(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await req.server.ctx.db.query(`UPDATE static_winners SET is_published = 0, updated_at = NOW() WHERE winner_id = :id`, { id: Number(req.params.id) });
  return reply.send({ ok: true });
}

export async function handleListRequests(req: FastifyRequest<{ Querystring: { status?: string; q?: string; from?: string; to?: string } }>, reply: FastifyReply) {
  const { status, q, from, to } = req.query;
  let sql = `SELECT ts.*, tt.team_name FROM team_submissions ts JOIN team_teams tt ON tt.team_id = ts.team_id WHERE 1=1`;
  const params: Record<string, any> = {};
  if (status) { sql += ` AND ts.status = :status`; params.status = status; }
  if (q) { sql += ` AND tt.team_name LIKE :q`; params.q = `%${q}%`; }
  if (from) { sql += ` AND ts.submitted_at >= :from`; params.from = from; }
  if (to) { sql += ` AND ts.submitted_at <= :to`; params.to = to; }
  sql += ' ORDER BY ts.submitted_at DESC';
  const [rows] = await req.server.ctx.db.query<RowDataPacket[]>(sql, params);
  return reply.send({ ok: true, data: rows });
}

export async function handleRequestDetail(req: FastifyRequest<{ Params: { submissionId: string } }>, reply: FastifyReply) {
  const submissionId = Number(req.params.submissionId);
  const db = req.server.ctx.db;
  const [submissionRows] = await db.query<RowDataPacket[]>(`SELECT ts.*, tt.team_name FROM team_submissions ts JOIN team_teams tt ON tt.team_id = ts.team_id WHERE ts.submission_id = :submissionId`, { submissionId });
  const submission = submissionRows[0];
  if (!submission) return reply.status(404).send({ ok: false, message: 'not found' });
  const [members] = await db.query<RowDataPacket[]>(`SELECT tm.user_id, u.user_name, tm.role FROM team_members tm JOIN user_users u ON u.user_id = tm.user_id WHERE tm.team_id = :teamId AND tm.member_status='active'`, { teamId: submission.team_id });
  const [files] = await db.query<RowDataPacket[]>(`SELECT tsf.*, f.original_name, f.mime_type FROM team_submission_files tsf JOIN files f ON f.file_id = tsf.file_id WHERE tsf.submission_id = :submissionId`, { submissionId });
  const [fixItems] = await db.query<RowDataPacket[]>(`SELECT * FROM team_fix_items WHERE submission_id = :submissionId ORDER BY fix_item_id DESC`, { submissionId });
  return reply.send({ ok: true, data: { submission, members, files, fixItems } });
}

export async function handleApproveRequest(req: FastifyRequest<{ Params: { submissionId: string }; Body: { reviewComment?: string } }>, reply: FastifyReply) {
  const submissionId = Number(req.params.submissionId);
  const userId = getUserId(req);
  const db = req.server.ctx.db;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [subRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM team_submissions WHERE submission_id = :submissionId FOR UPDATE`, { submissionId });
    const sub = subRows[0] as any;
    if (!sub) return reply.status(404).send({ ok: false, message: 'not found' });
    const [fixRows] = await conn.query<RowDataPacket[]>(`SELECT 1 FROM team_fix_items WHERE team_id=:teamId AND status='open' LIMIT 1`, { teamId: sub.team_id });
    if (fixRows.length) {
      await conn.rollback();
      return reply.status(409).send({ ok: false, error: 'OPEN_FIX_ITEMS_EXIST' });
    }
    await conn.query(`UPDATE team_submissions SET status='approved', reviewed_at=NOW(), reviewed_by_user_id=:userId, review_comment=:reviewComment WHERE submission_id=:submissionId`, { submissionId, userId, reviewComment: req.body?.reviewComment ?? null });
    await conn.commit();
    return reply.send({ ok: true });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function handleRejectRequest(req: FastifyRequest<{ Params: { submissionId: string }; Body: { reviewComment?: string; fixItems: { memberUserId: number; reason: string }[] } }>, reply: FastifyReply) {
  const submissionId = Number(req.params.submissionId);
  const userId = getUserId(req);
  const { reviewComment, fixItems } = req.body || { fixItems: [] };
  const db = req.server.ctx.db;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [subRows] = await conn.query<RowDataPacket[]>(`SELECT * FROM team_submissions WHERE submission_id = :submissionId FOR UPDATE`, { submissionId });
    const sub = subRows[0] as any;
    if (!sub) return reply.status(404).send({ ok: false, message: 'not found' });
    await conn.query(`UPDATE team_submissions SET status='rejected', reviewed_at=NOW(), reviewed_by_user_id=:userId, review_comment=:reviewComment WHERE submission_id=:submissionId`, { submissionId, userId, reviewComment: reviewComment ?? null });
    for (const item of fixItems || []) {
      await conn.query(
        `INSERT INTO team_fix_items (team_id, submission_id, member_user_id, reason, status, rejected_at) VALUES (:teamId,:submissionId,:memberUserId,:reason,'open',NOW())`,
        { teamId: sub.team_id, submissionId, memberUserId: item.memberUserId, reason: item.reason },
      );
    }
    await conn.commit();
    return reply.send({ ok: true });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function rawToBuffer(this: FastifyRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of this.raw) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

declare module 'fastify' {
  interface FastifyRequest {
    rawToBuffer: typeof rawToBuffer;
  }
}
