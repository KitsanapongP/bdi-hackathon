import type { DB } from '../../config/db.js';
import * as repo from './submissions.repo.js';
import { AppError, BadRequestError, NotFoundError, ConflictError } from '../../shared/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const UPLOADS_BASE_DIR = path.join(process.cwd(), 'public', 'uploads', 'verification');
const LOCKED_TEAM_STATUSES = new Set(['submitted', 'passed', 'confirmed', 'failed', 'not_joined', 'disbanded']);

function sanitizePathSegment(value: string | null | undefined, fallback: string): string {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    const cleaned = raw
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/\.+/g, '.')
        .trim();
    return cleaned || fallback;
}

function parseAllowedExtensions(allowedExtensions: string | null): string[] {
    if (!allowedExtensions) return [];
    return allowedExtensions
        .split(',')
        .map((ext) => ext.trim().toLowerCase())
        .filter(Boolean)
        .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
}

function assertTeamFileExtension(fileName: string, allowedExtensions: string[]): void {
    if (allowedExtensions.length === 0) return;
    const ext = path.extname(fileName).toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
        throw new BadRequestError(`ไฟล์นามสกุล ${ext || '(ไม่มีนามสกุล)'} ไม่ได้รับอนุญาต`);
    }
}

function isTaskDeadlinePassed(deadlineAt: Date | string | null): boolean {
    if (!deadlineAt) return false;
    const date = deadlineAt instanceof Date ? deadlineAt : new Date(deadlineAt);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() < Date.now();
}

function assertTaskSubmissionOpen(task: { is_submission_open: number; task_deadline_at?: Date | string | null }): void {
    if (task.is_submission_open !== 1) {
        throw new BadRequestError('งานนี้ถูกปิดการส่งชั่วคราว');
    }
    if (isTaskDeadlinePassed(task.task_deadline_at ?? null)) {
        throw new BadRequestError('หมดเวลาการส่งงานนี้แล้ว');
    }
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

async function getTeamSubmissionTaskOrThrow(db: DB, teamId: number, teamSubmissionTaskId: number) {
    const task = await repo.getTeamSubmissionTaskById(db, teamSubmissionTaskId);
    if (!task || task.team_id !== teamId) {
        throw new NotFoundError('ไม่พบรายการงานส่งผลงาน');
    }
    if (task.task_is_enabled !== 1) {
        throw new BadRequestError('งานส่งผลงานนี้ถูกปิดใช้งานแล้ว');
    }
    return task;
}

// -- User Submission Data --

export async function getSubmissionData(db: DB, teamId: number, userId: number) {
    await ensureMember(db, teamId, userId);

    const [tasks, advisors] = await Promise.all([
        repo.getTeamSubmissionTasks(db, teamId),
        repo.getAdvisors(db, teamId),
    ]);

    const filesByTask = await Promise.all(
        tasks.map(async (task) => ({
            taskId: task.team_submission_task_id,
            files: task.task_type === 'file'
                ? await repo.getSubmissionFilesByTeamTask(db, task.team_submission_task_id)
                : [],
        }))
    );

    const fileMap = new Map<number, Awaited<typeof filesByTask>[number]['files']>();
    filesByTask.forEach((row) => fileMap.set(row.taskId, row.files));

    return {
        tasks: tasks.map((task) => ({
            teamSubmissionTaskId: task.team_submission_task_id,
            submissionTaskId: task.submission_task_id,
            taskName: task.task_name,
            description: task.task_description,
            taskType: task.task_type,
            stage: task.stage,
            isRequired: task.is_required === 1,
            isDefault: task.task_is_default === 1,
            allowedExtensions: parseAllowedExtensions(task.allowed_extensions),
            sortOrder: task.sort_order,
            linkUrl: task.link_url,
            deadlineAt: task.task_deadline_at,
            isSubmissionOpen: task.is_submission_open === 1,
            isDeadlinePassed: isTaskDeadlinePassed(task.task_deadline_at),
            files: fileMap.get(task.team_submission_task_id) ?? [],
        })),
        advisors,
    };
}

export async function saveTaskLink(
    db: DB,
    teamId: number,
    userId: number,
    teamSubmissionTaskId: number,
    linkUrl: string | null,
) {
    await ensureLeader(db, teamId, userId);
    const task = await getTeamSubmissionTaskOrThrow(db, teamId, teamSubmissionTaskId);
    if (task.task_type !== 'link') {
        throw new BadRequestError('งานนี้ไม่ใช่ประเภทลิงก์');
    }
    assertTaskSubmissionOpen(task);

    if (linkUrl) {
        const trimmed = linkUrl.trim();
        if (!/^https?:\/\//i.test(trimmed)) {
            throw new BadRequestError('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
        }
        await repo.updateTeamTaskLink(db, teamSubmissionTaskId, trimmed);
        return;
    }

    await repo.updateTeamTaskLink(db, teamSubmissionTaskId, null);
}

export async function uploadSubmissionFile(
    db: DB,
    teamId: number,
    userId: number,
    teamSubmissionTaskId: number,
    file: { filename: string; mimetype: string; file: NodeJS.ReadableStream }
): Promise<{ fileId: number; fileName: string }> {
    await ensureLeader(db, teamId, userId);

    const task = await getTeamSubmissionTaskOrThrow(db, teamId, teamSubmissionTaskId);
    if (task.task_type !== 'file') {
        throw new BadRequestError('งานนี้ไม่ใช่ประเภทไฟล์');
    }
    assertTaskSubmissionOpen(task);
    const allowedExtensions = parseAllowedExtensions(task.allowed_extensions);
    assertTeamFileExtension(file.filename, allowedExtensions);

    const team = await repo.getTeamById(db, teamId);
    const teamName = sanitizePathSegment(team?.team_name_th || team?.team_name_en, `team-${teamId}`);
    const dir = path.join(UPLOADS_BASE_DIR, teamName, 'submission_files');
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.filename) || '';
    const storedName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(dir, storedName);
    const storageKey = path.relative(path.join(process.cwd(), 'public'), filePath).replace(/\\/g, '/');

    const writeStream = fs.createWriteStream(filePath);
    const stream = file.file as NodeJS.ReadableStream;
    await new Promise<void>((resolve, reject) => {
        (stream as NodeJS.ReadableStream).pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
        (stream as NodeJS.ReadableStream).on('error', reject);
    });

    const stat = fs.statSync(filePath);

    const fileId = await repo.insertSubmissionFile(db, {
        teamId,
        teamSubmissionTaskId,
        fileStorageKey: storageKey,
        fileOriginalName: file.filename,
        fileMimeType: file.mimetype,
        fileSizeBytes: stat.size,
        uploadedByUserId: userId,
    });

    return { fileId, fileName: file.filename };
}

export async function deleteSubmissionFile(db: DB, teamId: number, userId: number, fileId: number) {
    await ensureLeader(db, teamId, userId);

    const file = await repo.getSubmissionFileById(db, fileId);
    if (!file || file.team_id !== teamId) throw new NotFoundError('ไม่พบไฟล์');

    const task = await repo.getTeamSubmissionTaskById(db, file.team_submission_task_id);
    if (!task || task.team_id !== teamId) {
        throw new NotFoundError('ไม่พบรายการงานของไฟล์นี้');
    }
    assertTaskSubmissionOpen(task);

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

// -- Advisors --

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
    }
) {
    await ensureLeaderAndEditable(db, teamId, userId);

    if (data.email) {
        const existing = await repo.findAdvisorByEmail(db, data.email);
        if (existing) {
            throw new ConflictError('อีเมลอาจารย์ที่ปรึกษานี้ถูกลงทะเบียนกับทีมอื่นแล้ว');
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
    }
) {
    await ensureLeaderAndEditable(db, teamId, userId);

    const advisor = await repo.getAdvisorById(db, advisorId);
    if (!advisor || advisor.team_id !== teamId) throw new NotFoundError('ไม่พบอาจารย์ที่ปรึกษา');

    if (data.email) {
        const existing = await repo.findAdvisorByEmail(db, data.email, advisorId);
        if (existing) {
            throw new ConflictError('อีเมลอาจารย์ที่ปรึกษานี้ถูกลงทะเบียนกับทีมอื่นแล้ว');
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
