import type { DB } from '../../config/db.js';
import * as repo from './submissions.repo.js';
import { AppError, BadRequestError, NotFoundError, ConflictError } from '../../shared/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const UPLOADS_BASE_DIR = path.join(process.cwd(), 'public', 'uploads', 'verification');
const LOCKED_TEAM_STATUSES = new Set(['submitted', 'passed', 'confirmed', 'failed', 'not_joined', 'disbanded']);

function sanitizePathSegment(value: string | null | undefined, fallback: string): string {
    if (!value) return fallback;
    return value.replace(/[^a-zA-Z0-9\u0E00-\u0E7F._-]/g, '_').substring(0, 100) || fallback;
}

async function ensureLeader(db: DB, teamId: number, userId: number): Promise<void> {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new NotFoundError('ไม่พบทีม');
    if (team.current_leader_user_id !== userId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่สามารถจัดการได้', 403);
    }
}

function assertTeamEditable(status: string): void {
    if (!LOCKED_TEAM_STATUSES.has(String(status || '').toLowerCase())) return;
    throw new BadRequestError('ทีมถูกล็อกหลังส่งเอกสารยืนยันตัวตนแล้ว ไม่สามารถแก้ไขข้อมูลส่งผลงานได้');
}

async function ensureLeaderAndEditable(db: DB, teamId: number, userId: number): Promise<void> {
    const team = await repo.getTeamById(db, teamId);
    if (!team) throw new NotFoundError('ไม่พบทีม');
    if (team.current_leader_user_id !== userId) {
        throw new AppError('เฉพาะหัวหน้าทีมเท่านั้นที่สามารถจัดการได้', 403);
    }
    assertTeamEditable(team.status);
}

async function ensureMember(db: DB, teamId: number, userId: number): Promise<void> {
    const member = await repo.getTeamMember(db, teamId, userId);
    if (!member) throw new AppError('คุณไม่ได้เป็นสมาชิกของทีมนี้', 403);
}

// ── Get all submission data ──

export async function getSubmissionData(db: DB, teamId: number, userId: number) {
    await ensureMember(db, teamId, userId);

    const [videoLink, files, advisors] = await Promise.all([
        repo.getVideoLink(db, teamId),
        repo.getSubmissionFiles(db, teamId),
        repo.getAdvisors(db, teamId),
    ]);

    return { videoLink, files, advisors };
}

// ── Video Link ──

export async function saveVideoLink(db: DB, teamId: number, userId: number, videoLink: string | null) {
    await ensureLeaderAndEditable(db, teamId, userId);

    if (videoLink) {
        const trimmed = videoLink.trim();
        // Validate YouTube or Google Drive URL
        const isYoutube = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed);
        const isGDrive = /^https?:\/\/(drive|docs)\.google\.com\//i.test(trimmed);
        if (!isYoutube && !isGDrive) {
            throw new BadRequestError('ลิงก์ต้องเป็น YouTube หรือ Google Drive เท่านั้น');
        }
        await repo.updateVideoLink(db, teamId, trimmed);
    } else {
        await repo.updateVideoLink(db, teamId, null);
    }
}

// ── Submission Files ──

export async function uploadSubmissionFile(
    db: DB,
    teamId: number,
    userId: number,
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream }
): Promise<{ fileId: number; fileName: string }> {
    await ensureLeaderAndEditable(db, teamId, userId);

    const team = await repo.getTeamById(db, teamId);
    const teamName = sanitizePathSegment(team?.team_name_en || team?.team_name_th, `team_${teamId}`);
    const dir = path.join(UPLOADS_BASE_DIR, teamName, 'submission_files');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.filename) || '';
    const storedName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(dir, storedName);
    const storageKey = path.relative(path.join(process.cwd(), 'public'), filePath).replace(/\\/g, '/');

    // Write stream to disk
    const writeStream = fs.createWriteStream(filePath);
    const stream = file.file as NodeJS.ReadableStream;
    await new Promise<void>((resolve, reject) => {
        (stream as any).pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        (stream as any).on('error', reject);
    });

    const stat = fs.statSync(filePath);

    const fileId = await repo.insertSubmissionFile(db, {
        teamId,
        fileStorageKey: storageKey,
        fileOriginalName: file.filename,
        fileMimeType: file.mimetype,
        fileSizeBytes: stat.size,
        uploadedByUserId: userId,
    });

    return { fileId, fileName: file.filename };
}

export async function deleteSubmissionFile(db: DB, teamId: number, userId: number, fileId: number) {
    await ensureLeaderAndEditable(db, teamId, userId);

    const file = await repo.getSubmissionFileById(db, fileId);
    if (!file || file.team_id !== teamId) throw new NotFoundError('ไม่พบไฟล์');

    await repo.softDeleteSubmissionFile(db, fileId);
}

export async function getSubmissionFileInfo(
    db: DB,
    teamId: number,
    userId: number,
    fileId: number
): Promise<{ absolutePath: string; fileOriginalName: string; fileMimeType: string }> {
    await ensureMember(db, teamId, userId);

    const file = await repo.getSubmissionFileById(db, fileId);
    if (!file || file.team_id !== teamId) throw new NotFoundError('ไม่พบไฟล์');

    const absolutePath = path.join(process.cwd(), 'public', file.file_storage_key);
    if (!fs.existsSync(absolutePath)) throw new NotFoundError('ไม่พบไฟล์บนระบบ');

    return {
        absolutePath,
        fileOriginalName: file.file_original_name,
        fileMimeType: file.file_mime_type || 'application/octet-stream',
    };
}

// ── Advisors ──

export async function addAdvisor(
    db: DB,
    teamId: number,
    userId: number,
    data: {
        prefix: string | null;
        firstNameTh: string;
        lastNameTh: string;
        firstNameEn: string | null;
        lastNameEn: string | null;
        email: string | null;
        phone: string | null;
        institutionNameTh: string | null;
        position: string | null;
    }
) {
    await ensureLeaderAndEditable(db, teamId, userId);

    // Check email uniqueness
    if (data.email) {
        const existing = await repo.findAdvisorByEmail(db, data.email);
        if (existing) {
            throw new ConflictError('อาจารย์ที่ปรึกษาท่านนี้ (email) ถูกลงทะเบียนกับทีมอื่นแล้ว');
        }
    }

    const advisorId = await repo.insertAdvisor(db, {
        teamId,
        ...data,
        addedByUserId: userId,
    });

    return { advisorId };
}

export async function updateAdvisor(
    db: DB,
    teamId: number,
    userId: number,
    advisorId: number,
    data: {
        prefix: string | null;
        firstNameTh: string;
        lastNameTh: string;
        firstNameEn: string | null;
        lastNameEn: string | null;
        email: string | null;
        phone: string | null;
        institutionNameTh: string | null;
        position: string | null;
    }
) {
    await ensureLeaderAndEditable(db, teamId, userId);

    const advisor = await repo.getAdvisorById(db, advisorId);
    if (!advisor || advisor.team_id !== teamId) throw new NotFoundError('ไม่พบอาจารย์ที่ปรึกษา');

    // Check email uniqueness (exclude self)
    if (data.email) {
        const existing = await repo.findAdvisorByEmail(db, data.email, advisorId);
        if (existing) {
            throw new ConflictError('อาจารย์ที่ปรึกษาท่านนี้ (email) ถูกลงทะเบียนกับทีมอื่นแล้ว');
        }
    }

    await repo.updateAdvisor(db, advisorId, data);
}

export async function removeAdvisor(db: DB, teamId: number, userId: number, advisorId: number) {
    await ensureLeaderAndEditable(db, teamId, userId);

    const advisor = await repo.getAdvisorById(db, advisorId);
    if (!advisor || advisor.team_id !== teamId) throw new NotFoundError('ไม่พบอาจารย์ที่ปรึกษา');

    await repo.deleteAdvisor(db, advisorId);
}
