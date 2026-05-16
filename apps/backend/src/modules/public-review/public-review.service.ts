import type { DB } from '../../config/db.js';
import { NotFoundError } from '../../shared/errors.js';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import * as adminRepo from '../admin/admin.repo.js';
import type {
    ExportMemberDocumentRow,
    ExportSubmissionFileRow,
    ExportSubmissionLinkRow,
    ExportTeamAdvisorRow,
    ExportTeamMemberRow,
    ExportTeamsForSheetRow,
} from '../admin/admin.types.js';

type ReviewFileKind = 'video' | 'submission_file' | 'member_document';

const REVIEW_BUNDLE_PREFIX = 'bundle_member_docs:';
const REVIEW_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'review_cache');
const REVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ShareRow {
    share_id: string;
    file_storage_key: string;
    file_kind: ReviewFileKind;
    file_original_name: string | null;
    revoked_at: Date | null;
}

interface TeamShareRow {
    share_id: string;
    team_id: number;
    revoked_at: Date | null;
}

function buildPublicFileUrl(baseUrl: string, shareId: string): string {
    const safeBase = String(baseUrl || '').replace(/\/$/, '');
    return `${safeBase}/api/public-review/files/${shareId}`;
}

function getContentTypeFromName(fileName: string): string {
    const ext = path.extname(fileName || '').toLowerCase();
    const contentTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.txt': 'text/plain; charset=utf-8',
        '.csv': 'text/csv; charset=utf-8',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.zip': 'application/zip',
    };
    return contentTypes[ext] || 'application/octet-stream';
}

function pickMemberDisplayName(member: ExportTeamMemberRow): string {
    const th = `${member.first_name_th || ''} ${member.last_name_th || ''}`.trim();
    const en = `${member.first_name_en || ''} ${member.last_name_en || ''}`.trim();
    return th || en || member.user_name || `user-${member.user_id}`;
}

function buildAdvisorDisplayName(advisor: ExportTeamAdvisorRow): string {
    const th = `${advisor.prefix || ''}${advisor.first_name_th || ''} ${advisor.last_name_th || ''}`.trim();
    const en = `${advisor.first_name_en || ''} ${advisor.last_name_en || ''}`.trim();
    return th || en || advisor.email || 'Advisor';
}

export async function ensureReviewShareTable(db: DB): Promise<void> {
    await db.query(`
        CREATE TABLE IF NOT EXISTS review_file_shares (
            review_file_share_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            share_id VARCHAR(64) NOT NULL,
            file_storage_key VARCHAR(1024) NOT NULL,
            file_kind ENUM('video','submission_file','member_document') NOT NULL,
            file_original_name VARCHAR(255) NULL,
            revoked_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (review_file_share_id),
            UNIQUE KEY uq_share_id (share_id),
            KEY idx_storage_key_active (file_storage_key(255), revoked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

export async function ensureReviewTeamShareTable(db: DB): Promise<void> {
    await db.query(`
        CREATE TABLE IF NOT EXISTS review_team_shares (
            review_team_share_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            share_id VARCHAR(64) NOT NULL,
            team_id BIGINT UNSIGNED NOT NULL,
            revoked_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (review_team_share_id),
            UNIQUE KEY uq_team_share_id (share_id),
            KEY idx_team_active (team_id, revoked_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

export async function getOrCreateReviewShareId(
    db: DB,
    input: { storageKey: string; fileKind: ReviewFileKind; fileOriginalName?: string | null },
): Promise<string> {
    await ensureReviewShareTable(db);

    const normalizedKey = String(input.storageKey || '').trim().replace(/\\/g, '/');
    const [existingRows] = await db.query<any[]>(`
        SELECT share_id
        FROM review_file_shares
        WHERE file_storage_key = :fileStorageKey
          AND file_kind = :fileKind
          AND revoked_at IS NULL
        ORDER BY review_file_share_id DESC
        LIMIT 1
    `, {
        fileStorageKey: normalizedKey,
        fileKind: input.fileKind,
    });

    const existingShareId = existingRows[0]?.share_id;
    if (existingShareId) return String(existingShareId);

    const shareId = crypto.randomBytes(24).toString('hex');
    await db.query(`
        INSERT INTO review_file_shares
            (share_id, file_storage_key, file_kind, file_original_name)
        VALUES
            (:shareId, :fileStorageKey, :fileKind, :fileOriginalName)
    `, {
        shareId,
        fileStorageKey: normalizedKey,
        fileKind: input.fileKind,
        fileOriginalName: input.fileOriginalName ?? null,
    });

    return shareId;
}

export async function getOrCreateTeamReviewShareId(db: DB, teamId: number): Promise<string> {
    await ensureReviewTeamShareTable(db);

    const [existingRows] = await db.query<any[]>(`
        SELECT share_id
        FROM review_team_shares
        WHERE team_id = :teamId
          AND revoked_at IS NULL
        ORDER BY review_team_share_id DESC
        LIMIT 1
    `, { teamId });

    const existingShareId = existingRows[0]?.share_id;
    if (existingShareId) return String(existingShareId);

    const shareId = crypto.randomBytes(24).toString('hex');
    await db.query(`
        INSERT INTO review_team_shares (share_id, team_id)
        VALUES (:shareId, :teamId)
    `, { shareId, teamId });

    return shareId;
}

export function buildMemberDocumentBundleStorageKey(teamId: number, userId: number): string {
    return `${REVIEW_BUNDLE_PREFIX}${teamId}:${userId}`;
}

function resolveAbsolutePathFromStorageKey(storageKey: string): string | null {
    const normalizedStorageKey = String(storageKey || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalizedStorageKey) return null;

    const candidates = [
        path.join(process.cwd(), 'public', normalizedStorageKey),
        path.join(process.cwd(), 'public', 'uploads', normalizedStorageKey.replace(/^uploads\//, '')),
        path.join(process.cwd(), 'public', 'uploads', 'verification', normalizedStorageKey.replace(/^verification\//, '')),
    ];
    const absolutePath = candidates.find((candidate) => fs.existsSync(candidate));
    return absolutePath || null;
}

export async function getReviewFileByShareId(
    db: DB,
    shareId: string,
): Promise<{ absolutePath: string; fileOriginalName: string; fileKind: ReviewFileKind; contentType: string }> {
    await ensureReviewShareTable(db);
    const [rows] = await db.query<any[]>(`
        SELECT share_id, file_storage_key, file_kind, file_original_name, revoked_at
        FROM review_file_shares
        WHERE share_id = :shareId
        LIMIT 1
    `, { shareId });

    const row = rows[0] as ShareRow | undefined;
    if (!row || row.revoked_at) {
        throw new NotFoundError('ไม่พบลิงก์ไฟล์ที่ต้องการ');
    }

    if (String(row.file_storage_key || '').startsWith(REVIEW_BUNDLE_PREFIX)) {
        const result = await buildMemberDocumentBundleFile(db, row.file_storage_key);
        return {
            absolutePath: result.absolutePath,
            fileOriginalName: row.file_original_name || result.fileName,
            fileKind: row.file_kind,
            contentType: 'application/pdf',
        };
    }

    const absolutePath = resolveAbsolutePathFromStorageKey(row.file_storage_key);
    if (!absolutePath) {
        throw new NotFoundError('ไม่พบไฟล์ที่ต้องการ');
    }

    const fallbackName = path.basename(absolutePath);
    const contentType = getContentTypeFromName(row.file_original_name || fallbackName);

    return {
        absolutePath,
        fileOriginalName: row.file_original_name || fallbackName,
        fileKind: row.file_kind,
        contentType,
    };
}

export async function getReviewTeamByShareId(db: DB, shareId: string, publicBaseUrl: string) {
    await ensureReviewTeamShareTable(db);
    const [rows] = await db.query<any[]>(`
        SELECT share_id, team_id, revoked_at
        FROM review_team_shares
        WHERE share_id = :shareId
        LIMIT 1
    `, { shareId });

    const share = rows[0] as TeamShareRow | undefined;
    if (!share || share.revoked_at) {
        throw new NotFoundError('เนเธกเนเธเธเธฅเธดเธเธเนเธฃเธตเธงเธดเธงเธ—เธตเธกเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ');
    }

    const [teamRows] = await db.query<any[]>(`
        SELECT
            t.team_id,
            t.team_code,
            t.team_name_th,
            t.team_name_en,
            t.status,
            t.current_leader_user_id,
            u.user_name AS leader_user_name,
            t.created_at,
            t.updated_at
        FROM team_teams t
        LEFT JOIN user_users u ON u.user_id = t.current_leader_user_id
        WHERE t.team_id = :teamId
          AND t.deleted_at IS NULL
        LIMIT 1
    `, { teamId: share.team_id });

    const team = teamRows[0] as ExportTeamsForSheetRow | undefined;
    if (!team) {
        throw new NotFoundError('เนเธกเนเธเธเธ—เธตเธกเธ—เธตเนเธ•เนเธญเธเธเธฒเธฃ');
    }

    const teamIds = [share.team_id];
    const [advisors, members, memberDocuments, submissionFiles, submissionLinks] = await Promise.all([
        adminRepo.getTeamAdvisorsForExport(db, teamIds),
        adminRepo.getTeamMembersForExport(db, teamIds),
        adminRepo.getMemberDocumentsForExport(db, teamIds),
        adminRepo.getSubmissionFilesForExport(db, teamIds),
        adminRepo.getSubmissionLinksForExport(db, teamIds),
    ]);

    const documentsByUser = new Map<number, ExportMemberDocumentRow[]>();
    for (const document of memberDocuments) {
        const bucket = documentsByUser.get(document.user_id) ?? [];
        bucket.push(document);
        documentsByUser.set(document.user_id, bucket);
    }

    const membersPayload = await Promise.all(
        [...members].sort((a, b) => a.member_order - b.member_order).map(async (member) => {
            const docs = documentsByUser.get(member.user_id) ?? [];
            const documentShareId = docs.length > 0
                ? await getOrCreateReviewShareId(db, {
                    storageKey: buildMemberDocumentBundleStorageKey(team.team_id, member.user_id),
                    fileKind: 'member_document',
                    fileOriginalName: `member_docs_bundle_team_${team.team_id}_member_${member.user_id}.pdf`,
                })
                : null;

            return {
                userId: member.user_id,
                role: member.role,
                name: pickMemberDisplayName(member),
                userName: member.user_name,
                email: member.email,
                phone: member.phone,
                institution: member.institution_name_th || member.institution_name_en || '',
                gender: member.gender,
                educationLevel: member.education_level,
                homeProvince: member.home_province,
                documentCount: docs.length,
                documentUrl: documentShareId ? buildPublicFileUrl(publicBaseUrl, documentShareId) : null,
            };
        }),
    );

    const filesPayload = await Promise.all(
        submissionFiles.map(async (file: ExportSubmissionFileRow) => {
            const fileShareId = await getOrCreateReviewShareId(db, {
                storageKey: file.file_storage_key,
                fileKind: 'submission_file',
                fileOriginalName: file.file_original_name,
            });
            const fileUrl = buildPublicFileUrl(publicBaseUrl, fileShareId);
            return {
                taskName: file.task_name || 'Untitled Task',
                fileName: file.file_original_name,
                uploadedAt: file.uploaded_at,
                contentType: getContentTypeFromName(file.file_original_name),
                url: fileUrl,
                downloadUrl: `${fileUrl}?download=1`,
            };
        }),
    );

    const linksPayload = submissionLinks.map((link: ExportSubmissionLinkRow) => ({
        taskName: link.task_name || 'Untitled Link',
        url: link.link_url,
        updatedAt: link.updated_at,
    }));

    return {
        shareId,
        team: {
            teamId: team.team_id,
            teamCode: team.team_code,
            teamNameTh: team.team_name_th,
            teamNameEn: team.team_name_en,
            status: team.status,
            leaderName: team.leader_user_name,
            createdAt: team.created_at,
            updatedAt: team.updated_at,
        },
        advisors: advisors.map((advisor) => ({
            name: buildAdvisorDisplayName(advisor),
            email: advisor.email,
            phone: advisor.phone,
            institution: advisor.institution_name_th || '',
        })),
        members: membersPayload,
        submissionLinks: linksPayload,
        submissionFiles: filesPayload,
    };
}

async function buildMemberDocumentBundleFile(
    db: DB,
    storageKey: string,
): Promise<{ absolutePath: string; fileName: string }> {
    const parsed = String(storageKey || '').replace(REVIEW_BUNDLE_PREFIX, '').split(':');
    const teamId = Number(parsed[0]);
    const userId = Number(parsed[1]);
    if (!Number.isFinite(teamId) || !Number.isFinite(userId)) {
        throw new NotFoundError('ข้อมูลลิงก์เอกสารไม่ถูกต้อง');
    }

    if (!fs.existsSync(REVIEW_CACHE_DIR)) {
        fs.mkdirSync(REVIEW_CACHE_DIR, { recursive: true });
    }

    const cacheFileName = `member_docs_bundle_team_${teamId}_user_${userId}.pdf`;
    const cachePath = path.join(REVIEW_CACHE_DIR, cacheFileName);
    if (fs.existsSync(cachePath)) {
        const stat = fs.statSync(cachePath);
        if (Date.now() - stat.mtimeMs <= REVIEW_CACHE_TTL_MS) {
            return { absolutePath: cachePath, fileName: cacheFileName };
        }
    }

    const [rows] = await db.query<any[]>(`
        SELECT file_storage_key, uploaded_at
        FROM verify_member_documents
        WHERE team_id = :teamId
          AND user_id = :userId
          AND is_current = 1
          AND deleted_at IS NULL
        ORDER BY uploaded_at DESC, document_id DESC
    `, { teamId, userId });

    if (rows.length === 0) {
        throw new NotFoundError('ไม่พบเอกสารยืนยันตัวตนของสมาชิก');
    }

    const outputPdf = await PDFDocument.create();
    let mergedPageCount = 0;
    for (const row of rows) {
        const absolutePath = resolveAbsolutePathFromStorageKey(row.file_storage_key);
        if (!absolutePath) continue;
        const bytes = fs.readFileSync(absolutePath);
        const inputPdf = await PDFDocument.load(bytes);
        const pages = await outputPdf.copyPages(inputPdf, inputPdf.getPageIndices());
        pages.forEach((page) => outputPdf.addPage(page));
        mergedPageCount += pages.length;
    }

    if (mergedPageCount === 0) {
        throw new NotFoundError('ไม่พบไฟล์เอกสารที่พร้อมใช้งาน');
    }

    const mergedBytes = await outputPdf.save();
    fs.writeFileSync(cachePath, Buffer.from(mergedBytes));
    return {
        absolutePath: cachePath,
        fileName: cacheFileName,
    };
}
